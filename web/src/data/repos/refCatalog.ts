// Reference medicine list (MedEx file, used with written permission) stored as a few chunk docs:
//   shops/main/refCatalog/medex                 → meta (version, counts, file info)
//   shops/main/refCatalog/medex/chunks/{v}-dict → dictionaries (forms, generics, companies)
//   shops/main/refCatalog/medex/chunks/{v}-{n}  → packed rows, each < 1 MiB
// Uploaded in ONE batch (atomic: other devices never see half a version).
import { getDocFromServer, serverTimestamp, Timestamp } from 'firebase/firestore'
import { SCHEMA_VERSION, type Millis } from '../../domain/types'
import { toMillis } from '../convert'
import { paths } from '../paths'
import { auditInBatch, commitInBackground, newBatch, writeContext } from '../writer'

export const REF_SOURCE = 'medex'

export interface RefCatalogMeta {
  version: string
  fileName: string
  fileSha256: string
  /** File's own date (last modified on the owner's computer). */
  fileDate: Millis | null
  count: number
  herbalCount: number
  chunkCount: number
  importedAt: Millis
  importedBy: string
  /** Owner ticked "I have MedEx's written permission" when uploading. */
  permissionConfirmed: boolean
}

const chunkIds = (version: string, count: number) => [
  `${version}-dict`,
  ...Array.from({ length: count }, (_, i) => `${version}-${i}`),
]

export function uploadRefCatalog(
  packed: { dict: string; chunks: string[] },
  info: Omit<RefCatalogMeta, 'chunkCount' | 'importedAt' | 'importedBy'>,
  previous: RefCatalogMeta | null,
): RefCatalogMeta {
  const ctx = writeContext()
  const meta: RefCatalogMeta = { ...info, chunkCount: packed.chunks.length, importedAt: ctx.now, importedBy: ctx.uid }
  const batch = newBatch()
  const [dictId, ...rowIds] = chunkIds(meta.version, packed.chunks.length)
  batch.set(paths.refChunk(REF_SOURCE, dictId!), { data: packed.dict, version: meta.version })
  rowIds.forEach((id, i) => batch.set(paths.refChunk(REF_SOURCE, id), { data: packed.chunks[i], version: meta.version }))
  if (previous && previous.version !== meta.version) {
    for (const id of chunkIds(previous.version, previous.chunkCount)) batch.delete(paths.refChunk(REF_SOURCE, id))
  }
  batch.set(paths.refMeta(REF_SOURCE), {
    ...meta,
    fileDate: meta.fileDate === null ? null : Timestamp.fromMillis(meta.fileDate),
    importedAt: Timestamp.fromMillis(meta.importedAt),
    serverAt: serverTimestamp(),
    schemaVersion: SCHEMA_VERSION,
  })
  auditInBatch(
    batch,
    {
      action: 'refCatalog.import',
      entity: 'refCatalog',
      entityId: REF_SOURCE,
      before: previous ? { version: previous.version, count: previous.count } : null,
      after: { version: meta.version, count: meta.count, fileName: meta.fileName, permissionConfirmed: meta.permissionConfirmed },
    },
    ctx,
  )
  commitInBackground(batch)
  return meta
}

/** Server copy of the meta doc; throws when offline. */
export async function fetchRefMeta(): Promise<RefCatalogMeta | null> {
  const snap = await getDocFromServer(paths.refMeta(REF_SOURCE))
  if (!snap.exists()) return null
  const d = snap.data()
  return {
    version: String(d.version),
    fileName: String(d.fileName ?? ''),
    fileSha256: String(d.fileSha256 ?? ''),
    fileDate: toMillis(d.fileDate),
    count: Number(d.count ?? 0),
    herbalCount: Number(d.herbalCount ?? 0),
    chunkCount: Number(d.chunkCount ?? 0),
    importedAt: toMillis(d.importedAt) ?? 0,
    importedBy: String(d.importedBy ?? ''),
    permissionConfirmed: d.permissionConfirmed === true,
  }
}

export async function fetchRefChunks(meta: RefCatalogMeta): Promise<{ dict: string; chunks: string[] }> {
  const docs = await Promise.all(
    chunkIds(meta.version, meta.chunkCount).map((id) => getDocFromServer(paths.refChunk(REF_SOURCE, id))),
  )
  const data = docs.map((d) => {
    const v = d.data()?.data
    if (typeof v !== 'string') throw new Error(`Reference chunk ${d.id} missing`)
    return v
  })
  return { dict: data[0]!, chunks: data.slice(1) }
}
