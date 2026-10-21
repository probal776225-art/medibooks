// Reference medicine list (MedEx file) on this device: Dexie copy + lazily built search index.
// Lookup only — picking an item copies it into the shop's own medicine list, where the owner sets the price.
import MiniSearch from 'minisearch'
import { useEffect, useMemo } from 'react'
import { create } from 'zustand'
import { localDb } from '../data/localdb'
import { fetchRefChunks, fetchRefMeta, uploadRefCatalog, type RefCatalogMeta } from '../data/repos/refCatalog'
import { toEnglishDigits } from '../domain/digits'
import { mapMedexSheets, type MedexParseResult, type RefMedicine } from './import/medexRef'
import { packRefCatalog, sha256Hex, unpackRefCatalog } from './import/refPack'
import { readXlsx } from './import/xlsx'

type RefIndex = MiniSearch<RefMedicine>

interface RefState {
  /** What this device holds (null = no reference list yet). */
  meta: RefCatalogMeta | null
  downloading: boolean
  index: RefIndex | null
  byId: Map<string, RefMedicine>
  indexing: boolean
}

export const useRefStore = create<RefState>()(() => ({
  meta: null,
  downloading: false,
  index: null,
  byId: new Map(),
  indexing: false,
}))

let loaded = false

async function loadLocalMeta(): Promise<RefCatalogMeta | null> {
  const row = await localDb.meta.get('refCatalogMeta')
  return row?.key === 'refCatalogMeta' ? row.value : null
}

async function saveLocal(items: RefMedicine[], meta: RefCatalogMeta): Promise<void> {
  await localDb.transaction('rw', localDb.refCatalog, localDb.meta, async () => {
    await localDb.refCatalog.clear()
    await localDb.refCatalog.bulkPut(items)
    await localDb.meta.put({ key: 'refCatalogMeta', value: meta })
  })
  // Drop the old index; it is rebuilt on the next search.
  useRefStore.setState({ meta, index: null, byId: new Map() })
}

/** Download a newer list from the server if there is one (called after each medicine sync). */
export async function refreshRefCatalog(): Promise<void> {
  if (!loaded) {
    loaded = true
    useRefStore.setState({ meta: await loadLocalMeta() })
  }
  const server = await fetchRefMeta()
  const local = useRefStore.getState().meta
  if (!server || server.version === local?.version || useRefStore.getState().downloading) return
  useRefStore.setState({ downloading: true })
  try {
    const { dict, chunks } = await fetchRefChunks(server)
    await saveLocal(unpackRefCatalog(dict, chunks), server)
  } finally {
    useRefStore.setState({ downloading: false })
  }
}

export function resetRefCatalog(): void {
  loaded = false
  useRefStore.setState({ meta: null, downloading: false, index: null, byId: new Map(), indexing: false })
}

async function ensureIndex(): Promise<void> {
  const s = useRefStore.getState()
  if (s.index || s.indexing || !s.meta) return
  useRefStore.setState({ indexing: true })
  try {
    const items = await localDb.refCatalog.toArray()
    const index: RefIndex = new MiniSearch<RefMedicine>({
      idField: 'id',
      fields: ['brandName', 'genericName', 'manufacturer', 'strength'],
      processTerm: (term) => toEnglishDigits(term).toLowerCase(),
      searchOptions: {
        boost: { brandName: 4, genericName: 2, manufacturer: 1, strength: 1 },
        prefix: true,
        fuzzy: (term) => (term.length > 3 ? 0.2 : false),
        combineWith: 'AND',
      },
    })
    index.addAll(items)
    useRefStore.setState({ index, byId: new Map(items.map((i) => [i.id, i])) })
  } finally {
    useRefStore.setState({ indexing: false })
  }
}

/** "napa|500 mg|tablet" — matches a reference row to a shop medicine that was added by hand or from another file. */
export function refKey(m: { brandName: string; strength: string; dosageForm: string }): string {
  return [m.brandName, m.strength, m.dosageForm].map((x) => x.replace(/\s+/g, ' ').trim().toLowerCase()).join('|')
}

export interface OwnedFilter {
  /** MedEx ids already in the shop list. */
  ids: ReadonlySet<string>
  /** refKey()s of shop medicines, for ones added without a MedEx id. */
  keys: ReadonlySet<string>
}

/** Search the reference list, skipping what the shop already has. Builds the index on first use. */
export function useRefSearch(query: string, owned: OwnedFilter, limit = 6): RefMedicine[] {
  const { index, byId, meta } = useRefStore()
  const q = query.trim()
  useEffect(() => {
    if (q.length >= 2 && meta && !index) void ensureIndex()
  }, [q, meta, index])
  return useMemo(() => {
    if (!index || q.length < 2) return []
    const out: RefMedicine[] = []
    for (const r of index.search(q)) {
      const id = String(r.id)
      if (owned.ids.has(id)) continue
      const item = byId.get(id)
      if (item && !owned.keys.has(refKey(item))) out.push(item)
      if (out.length >= limit) break
    }
    return out
  }, [index, byId, q, owned, limit])
}

export interface RefImportPreview {
  file: File
  parsed: MedexParseResult
  sha256: string
}

/** Read the owner's .xlsx in the browser (no upload yet) and show what is inside. */
export async function previewRefFile(file: File): Promise<RefImportPreview> {
  const buf = await file.arrayBuffer()
  const [sheets, sha256] = await Promise.all([readXlsx(buf, (name) => /brand/i.test(name)), sha256Hex(buf)])
  return { file, parsed: mapMedexSheets(sheets), sha256 }
}

/** Upload (queued offline) and keep a copy on this device; other devices download it on their next sync. */
export async function confirmRefImport(preview: RefImportPreview, permissionConfirmed: boolean): Promise<RefCatalogMeta> {
  const packed = packRefCatalog(preview.parsed.items)
  // Prefer the server's current version so its old chunks get removed, even if this device never downloaded it.
  const previous = await fetchRefMeta().catch(() => useRefStore.getState().meta)
  const meta = uploadRefCatalog(
    packed,
    {
      version: preview.sha256.slice(0, 16),
      fileName: preview.file.name,
      fileSha256: preview.sha256,
      fileDate: preview.file.lastModified || null,
      count: preview.parsed.items.length,
      herbalCount: preview.parsed.herbalCount,
      permissionConfirmed,
    },
    previous,
  )
  await saveLocal(preview.parsed.items, meta)
  return meta
}
