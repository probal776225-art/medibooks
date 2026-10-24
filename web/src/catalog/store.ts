// The shop's medicine list on this device: Dexie mirror + in-memory search index + delta sync from Firestore.
// The sale screen reads only from here — never from the network (CLAUDE.md rule 7).
import { useMemo } from 'react'
import { create } from 'zustand'
import { localDb } from '../data/localdb'
import {
  createMedicine,
  fetchChangedMedicines,
  setMedicineStatus,
  updateMedicine,
  type MedicineSourceInfo,
} from '../data/repos/medicines'
import { advanceCursor, syncQueryStart, type MedicineInput } from '../domain/medicines'
import type { Medicine, MedicineStatus, Millis } from '../domain/types'
import { refAsMedicine } from '../domain/alternatives'
import { refUrl, type RefMedicine } from './import/medexRef'
import { refreshRefCatalog, resetRefCatalog, useRefStore } from './refStore'
import { buildMedicineIndex, searchMedicines, type MedicineIndex, type SearchOptions } from './searchIndex'

interface CatalogState {
  medicines: Medicine[]
  byId: Map<string, Medicine>
  index: MedicineIndex | null
  usage: Map<string, number>
  status: 'idle' | 'loading' | 'ready'
  syncing: boolean
  lastSyncAt: Millis | null
  /** True when the last sync could not reach the server (offline). */
  syncFailed: boolean
}

const initial: CatalogState = {
  medicines: [],
  byId: new Map(),
  index: null,
  usage: new Map(),
  status: 'idle',
  syncing: false,
  lastSyncAt: null,
  syncFailed: false,
}

export const useCatalogStore = create<CatalogState>()(() => initial)

function setList(medicines: Medicine[]): void {
  const sorted = [...medicines].sort((a, b) => a.brandName.localeCompare(b.brandName))
  useCatalogStore.setState({
    medicines: sorted,
    byId: new Map(sorted.map((m) => [m.id, m])),
    index: buildMedicineIndex(sorted),
  })
}

async function loadFromDevice(): Promise<void> {
  const [medicines, usageRows] = await Promise.all([localDb.medicines.toArray(), localDb.medicineUsage.toArray()])
  setList(medicines)
  useCatalogStore.setState({
    usage: new Map(usageRows.map((u) => [u.medicineId, u.count])),
    status: 'ready',
  })
}

const PAGE_SIZE = 500

// Firestore can report "offline" for a while after the connection comes back, so a failed sync retries
// on its own: 15 s, 30 s, 1 min … up to 5 min.
const FIRST_RETRY_MS = 15_000
const MAX_RETRY_MS = 300_000
let retryDelay = FIRST_RETRY_MS
let retryTimer: ReturnType<typeof setTimeout> | null = null

function scheduleRetry(): void {
  if (retryTimer || !stopListeners) return
  retryTimer = setTimeout(() => {
    retryTimer = null
    void syncMedicines()
  }, retryDelay)
  retryDelay = Math.min(retryDelay * 2, MAX_RETRY_MS)
}

/** Pull medicines changed since the last sync (delta by updatedAt). Safe to call often. */
export async function syncMedicines(): Promise<number> {
  if (useCatalogStore.getState().syncing) return 0
  useCatalogStore.setState({ syncing: true })
  let changed = 0
  try {
    const meta = await localDb.meta.get('medicinesSyncCursor')
    let cursor = meta?.key === 'medicinesSyncCursor' ? meta.value : null
    const start = syncQueryStart(cursor)
    let after: Awaited<ReturnType<typeof fetchChangedMedicines>>['last'] = null
    for (;;) {
      const page = await fetchChangedMedicines(start, after, PAGE_SIZE)
      if (page.medicines.length) {
        await localDb.medicines.bulkPut(page.medicines)
        changed += page.medicines.length
        cursor = advanceCursor(
          cursor,
          page.medicines.map((m) => m.updatedAt),
        )
      }
      if (page.medicines.length < PAGE_SIZE) break
      after = page.last
    }
    await localDb.meta.put({ key: 'medicinesSyncCursor', value: cursor })
    if (changed) await loadFromDevice()
    // The reference list rides on the same triggers (start, reconnect, retry): one meta read.
    await refreshRefCatalog()
    useCatalogStore.setState({ lastSyncAt: Date.now(), syncFailed: false })
    retryDelay = FIRST_RETRY_MS
  } catch (e) {
    console.warn('Medicine sync skipped', e)
    useCatalogStore.setState({ syncFailed: true })
    scheduleRetry()
  } finally {
    useCatalogStore.setState({ syncing: false })
  }
  return changed
}

const MIN_SYNC_GAP_MS = 60_000
let stopListeners: (() => void) | null = null

/** Load the device copy, then sync; re-sync on reconnect and when the app comes back to the front. */
export function startCatalog(): void {
  if (stopListeners) return
  useCatalogStore.setState({ status: 'loading' })
  void loadFromDevice().then(() => syncMedicines())

  const onOnline = () => void syncMedicines()
  const onVisible = () => {
    const last = useCatalogStore.getState().lastSyncAt
    if (document.visibilityState === 'visible' && (last === null || Date.now() - last > MIN_SYNC_GAP_MS)) {
      void syncMedicines()
    }
  }
  window.addEventListener('online', onOnline)
  document.addEventListener('visibilitychange', onVisible)
  stopListeners = () => {
    window.removeEventListener('online', onOnline)
    document.removeEventListener('visibilitychange', onVisible)
  }
}

export function stopCatalog(): void {
  stopListeners?.()
  stopListeners = null
  if (retryTimer) clearTimeout(retryTimer)
  retryTimer = null
  retryDelay = FIRST_RETRY_MS
  useCatalogStore.setState(initial)
  resetRefCatalog()
}

function upsertLocal(m: Medicine): Medicine {
  void localDb.medicines.put(m).catch((e: unknown) => console.error('Local medicine save failed', e))
  const s = useCatalogStore.getState()
  const byId = new Map(s.byId)
  byId.set(m.id, m)
  const medicines = s.byId.has(m.id) ? s.medicines.map((x) => (x.id === m.id ? m : x)) : [...s.medicines, m]
  if (s.index) {
    if (s.index.has(m.id)) s.index.replace(m)
    else s.index.add(m)
  }
  useCatalogStore.setState({ medicines, byId, index: s.index ?? buildMedicineIndex(medicines) })
  return m
}

/** Many medicines written at once (file import): one Dexie bulk write, one index rebuild. */
export function upsertLocalMany(meds: readonly Medicine[]): void {
  if (meds.length === 0) return
  void localDb.medicines.bulkPut([...meds]).catch((e: unknown) => console.error('Local medicine save failed', e))
  const byId = new Map(useCatalogStore.getState().byId)
  for (const m of meds) byId.set(m.id, m)
  setList([...byId.values()])
}

/**
 * The shop medicine for a MedEx list row: the existing one (same MedEx id) or a new one created now with the
 * MedEx name, pack and price as its source fields (works offline; the write syncs later). The owner can edit it.
 */
export function shopMedicineFor(r: RefMedicine, edited?: MedicineInput): Medicine {
  const existing = useCatalogStore.getState().medicines.find((m) => m.sourceName === 'medex' && m.sourceId === r.id)
  if (existing) return edited ? editMedicine(existing, edited) : existing
  const v = refAsMedicine(r, refUrl(r), Date.now())
  const meta = useRefStore.getState().meta
  return addMedicine(
    edited ?? {
      brandName: v.brandName,
      genericName: v.genericName,
      strength: v.strength,
      dosageForm: v.dosageForm,
      manufacturer: v.manufacturer,
      packDescription: v.packDescription,
      piecesPerStrip: v.piecesPerStrip,
      piecesPerPack: v.piecesPerPack,
      shopUnitPricePaisa: null,
      shopStripPricePaisa: null,
      shopPackPricePaisa: null,
      sourceUrl: v.sourceUrl,
    },
    {
      sourceName: 'medex',
      sourceId: r.id,
      dosageText: r.dosageForm,
      sourceUpdatedAt: meta?.fileDate ?? null,
      sourceFetchedAt: meta?.importedAt ?? null,
      lastImportId: meta?.version ?? null,
      prices: { unit: v.sourceUnitPricePaisa, strip: v.sourceStripPricePaisa, pack: v.sourcePackPricePaisa },
    },
  )
}

// Actions used by the screens: write to Firestore (queued offline) and update this device at once.
export const addMedicine = (input: MedicineInput, source?: MedicineSourceInfo) =>
  upsertLocal(createMedicine(input, source))
export const editMedicine = (before: Medicine, input: MedicineInput) => upsertLocal(updateMedicine(before, input))
export const changeMedicineStatus = (before: Medicine, status: MedicineStatus) =>
  upsertLocal(setMedicineStatus(before, status))

/** Called by the sale screen (Phase 4) each time a medicine is billed. */
export async function recordMedicineUsage(medicineId: string): Promise<void> {
  const row = await localDb.medicineUsage.get(medicineId)
  const count = (row?.count ?? 0) + 1
  await localDb.medicineUsage.put({ medicineId, count, lastUsedAt: Date.now() })
  const usage = new Map(useCatalogStore.getState().usage)
  usage.set(medicineId, count)
  useCatalogStore.setState({ usage })
}

export function useMedicineSearch(query: string, opts: Omit<SearchOptions, 'usage'> = {}): Medicine[] {
  const index = useCatalogStore((s) => s.index)
  const byId = useCatalogStore((s) => s.byId)
  const usage = useCatalogStore((s) => s.usage)
  const { includeInactive, limit } = opts
  return useMemo(
    () => (index ? searchMedicines(index, byId, query, { includeInactive, limit, usage }) : []),
    // byId changes on every local edit, which also covers in-place index updates.
    [index, byId, usage, query, includeInactive, limit],
  )
}
