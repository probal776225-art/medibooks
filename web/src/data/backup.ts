// Backup export and restore (SPEC §12). Both are online-only and awaited, like change-mobile:
// an export from an incomplete cache would look complete but miss data, and a restore must see what the
// server already has. A restore only fills an EMPTY shop (a new Firebase project) — it never deletes or
// changes existing data, and the security rules stay as strict as ever.
import {
  Bytes,
  doc,
  documentId,
  getDocFromServer,
  getDocsFromServer,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  Timestamp,
  type DocumentData,
  type Query,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
  type WriteBatch,
} from 'firebase/firestore'
import {
  BACKUP_APP,
  BACKUP_COLLECTIONS,
  BACKUP_FORMAT,
  PHOTO_COLLECTIONS,
  decodeValue,
  encodeValue,
  liveVersion,
  type BackupCollection,
  type BackupDoc,
  type BackupFile,
} from '../domain/backup'
import { randomCode } from '../domain/ids'
import { paths, SHOP_ID } from './paths'
import { auditInBatch, newBatch, writeContext } from './writer'

const PAGE = 1000
/** Photos are up to ~0.7 MB each: fetch and write them in small groups. */
const PHOTO_PAGE = 20
const BATCH_PHOTO_BYTES = 6_000_000
/** Firestore allows 500 writes per batch; stay well under. */
const BATCH_WRITES = 400
const RESTORE_MARKER_ID = 'restore'

const isTimestamp = (v: unknown): v is Timestamp => v instanceof Timestamp
const bytesToBase64 = (v: unknown) => (v instanceof Bytes ? v.toBase64() : null)
const decode = (data: Record<string, unknown>) =>
  decodeValue(data, (s, ns) => new Timestamp(s, ns), (b64) => Bytes.fromBase64String(b64)) as Record<string, unknown>

/** Every doc of a shop collection, straight from the server, 1000 at a time. */
async function readAllFromServer(
  name: BackupCollection,
  onPage: (count: number) => void,
): Promise<{ id: string; data: DocumentData }[]> {
  const out: { id: string; data: DocumentData }[] = []
  const page = name === 'prescriptionImages' ? PHOTO_PAGE : PAGE
  let last: string | null = null
  for (;;) {
    const base = paths.shopCollection(name)
    const q: Query = last
      ? query(base, orderBy(documentId()), startAfter(last), limit(page))
      : query(base, orderBy(documentId()), limit(page))
    const snap: QuerySnapshot = await getDocsFromServer(q)
    for (const d of snap.docs) {
      if (name === 'settings' && d.id === RESTORE_MARKER_ID) continue
      out.push({ id: d.id, data: d.data() })
    }
    onPage(out.length)
    const tail: QueryDocumentSnapshot | undefined = snap.docs[snap.docs.length - 1]
    if (snap.size < page || !tail) return out
    last = tail.id
  }
}

export type BackupProgress = (collection: BackupCollection, count: number) => void

/** `photos: false` leaves the prescription photos out (a much smaller file). */
export async function exportBackup(onProgress: BackupProgress, opts: { photos: boolean } = { photos: true }): Promise<BackupFile> {
  const ctx = writeContext()
  const collections = {} as Record<BackupCollection, BackupDoc[]>
  const counts = {} as Record<BackupCollection, number>
  for (const name of BACKUP_COLLECTIONS) {
    const docs = !opts.photos && PHOTO_COLLECTIONS.includes(name) ? [] : await readAllFromServer(name, (n) => onProgress(name, n))
    collections[name] = docs.map((d) => ({ id: d.id, data: encodeValue(d.data, isTimestamp, bytesToBase64) as Record<string, unknown> }))
    counts[name] = docs.length
  }
  return {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    shopId: SHOP_ID,
    backupId: `${ctx.now}-${randomCode(6)}`,
    exportedAt: ctx.now,
    exportedBy: ctx.uid,
    counts,
    collections,
  }
}

/** Remember the backup (weekly reminder on every device) + audit. Fire-and-forget like other writes. */
export function recordBackupExported(backup: BackupFile): WriteBatch {
  const ctx = writeContext()
  const batch = newBatch()
  batch.set(paths.settings(), { backup: { lastExportAt: backup.exportedAt }, updatedAt: serverTimestamp() }, { merge: true })
  auditInBatch(
    batch,
    { action: 'backup.export', entity: 'backup', entityId: backup.backupId, before: null, after: { counts: backup.counts } },
    ctx,
  )
  return batch
}

export type RestoreTarget = 'empty' | 'resume' | 'notEmpty'

/** Empty shop → restore; same backup stopped half-way → continue; anything else → refuse. */
export async function checkRestoreTarget(backupId: string): Promise<RestoreTarget> {
  const [customers, transactions, marker] = await Promise.all([
    getDocsFromServer(query(paths.customers(), limit(1))),
    getDocsFromServer(query(paths.transactions(), limit(1))),
    getDocFromServer(paths.restoreMarker()),
  ])
  const m = marker.data()
  if (m && m.backupId === backupId && m.done !== true) return 'resume'
  return customers.empty && transactions.empty ? 'empty' : 'notEmpty'
}

export class RestoreError extends Error {
  readonly reason: 'notEmpty' | 'quota' | 'failed'
  readonly written: number
  readonly total: number

  constructor(reason: RestoreError['reason'], written: number, total: number) {
    super(`Restore ${reason}`)
    this.reason = reason
    this.written = written
    this.total = total
  }
}

type Op = (batch: WriteBatch) => void
interface WeightedOp {
  run: Op
  bytes: number
}

/** Size of a backed-up {"$bytes": base64} value once decoded. */
const base64Bytes = (v: unknown) => {
  const b64 = (v as { $bytes?: unknown } | null)?.$bytes
  return typeof b64 === 'string' ? Math.ceil((b64.length * 3) / 4) : 0
}

const int = (v: unknown): number => (typeof v === 'number' && Number.isSafeInteger(v) ? v : 0)

/**
 * Write the backup into the empty shop, in phases (each phase fully committed before the next):
 * settings, medicines and logs, customers (due via increment), transactions as live, then the voids
 * (rules only create live transactions; a void is the normal one-time update), prescription photos then their
 * metadata, the usage counter, then the audit entry.
 */
export async function restoreBackup(backup: BackupFile, onProgress: (written: number, total: number) => void): Promise<void> {
  const target = await checkRestoreTarget(backup.backupId)
  if (target === 'notEmpty') throw new RestoreError('notEmpty', 0, 0)
  const ctx = writeContext()

  // Continuing: skip what is already there (it was written in full by the earlier run).
  const existing = new Map<BackupCollection, Map<string, DocumentData>>()
  if (target === 'resume') {
    for (const name of BACKUP_COLLECTIONS) {
      // Photos are not read back (too big): a photo is re-written unless its metadata (written after it) exists.
      if (name === 'settings' || name === 'prescriptionImages' || name === 'stats') continue
      const docs = await readAllFromServer(name, () => undefined)
      existing.set(name, new Map(docs.map((d) => [d.id, d.data])))
    }
  }
  const has = (name: BackupCollection, id: string) => existing.get(name)?.has(id) ?? false

  await setDoc(paths.restoreMarker(), {
    backupId: backup.backupId,
    exportedAt: backup.exportedAt,
    startedAt: serverTimestamp(),
    done: false,
    by: ctx.uid,
  })

  const ref = (name: BackupCollection, id: string) => doc(paths.shopCollection(name), id)
  const cols = backup.collections
  const phases: (Op | WeightedOp)[][] = [
    cols.settings.map((d) => (b) => b.set(ref('settings', d.id), decode(d.data))),
    [
      // updatedAt = now, so every device's medicine delta sync picks them up.
      ...cols.medicines
        .filter((d) => !has('medicines', d.id))
        .map((d): Op => (b) => b.set(ref('medicines', d.id), { ...decode(d.data), updatedAt: serverTimestamp() })),
      ...(['medicinePriceHistory', 'medicineImports', 'auditLog'] as const).flatMap((name) =>
        cols[name].filter((d) => !has(name, d.id)).map((d): Op => (b) => b.set(ref(name, d.id), decode(d.data))),
      ),
    ],
    cols.customers
      .filter((d) => !has('customers', d.id))
      .map((d) => (b) => b.set(ref('customers', d.id), { ...decode(d.data), totalDuePaisa: increment(int(d.data.totalDuePaisa)) })),
    cols.transactions
      .filter((d) => !has('transactions', d.id))
      .map((d) => (b) => b.set(ref('transactions', d.id), liveVersion(decode(d.data)))),
    cols.transactions
      .filter((d) => d.data.voided === true && existing.get('transactions')?.get(d.id)?.voided !== true)
      .map((d) => (b) => {
        const data = decode(d.data)
        b.update(ref('transactions', d.id), {
          voided: true,
          voidedAt: data.voidedAt ?? null,
          voidedBy: data.voidedBy ?? null,
          voidReason: data.voidReason || '-',
        })
      }),
    // Photos before their metadata, so "metadata exists" means the photo is there too.
    cols.prescriptionImages
      .filter((d) => !has('prescriptions', d.id))
      .map((d) => ({ run: (b: WriteBatch) => b.set(ref('prescriptionImages', d.id), decode(d.data)), bytes: base64Bytes(d.data.image) })),
    cols.prescriptions
      .filter((d) => !has('prescriptions', d.id))
      .map((d) => (b) => b.set(ref('prescriptions', d.id), decode(d.data))),
    cols.stats.map((d) => (b) => b.set(ref('stats', d.id), decode(d.data))),
  ]

  const total = phases.reduce((n, p) => n + p.length, 0) + 1
  let written = 0
  onProgress(written, total)
  try {
    for (const phase of phases) {
      // A batch holds up to 400 writes and (for photos) ~6 MB, under Firestore's request limit.
      let batch = newBatch()
      let count = 0
      let bytes = 0
      const flush = async () => {
        if (!count) return
        await batch.commit()
        written += count
        onProgress(written, total)
        batch = newBatch()
        count = 0
        bytes = 0
      }
      for (const item of phase) {
        const op = typeof item === 'function' ? { run: item, bytes: 0 } : item
        if (count && (count >= BATCH_WRITES || bytes + op.bytes > BATCH_PHOTO_BYTES)) await flush()
        op.run(batch)
        count++
        bytes += op.bytes
      }
      await flush()
    }
    const last = newBatch()
    auditInBatch(
      last,
      {
        action: 'backup.restore',
        entity: 'backup',
        entityId: backup.backupId,
        before: null,
        after: { exportedAt: backup.exportedAt, counts: backup.counts, resumed: target === 'resume' },
      },
      ctx,
    )
    last.set(paths.restoreMarker(), { done: true, doneAt: serverTimestamp() }, { merge: true })
    await last.commit()
    onProgress(total, total)
  } catch (e) {
    console.error('Restore stopped', e)
    const code = (e as { code?: string }).code
    throw new RestoreError(code === 'resource-exhausted' ? 'quota' : 'failed', written, total)
  }
}
