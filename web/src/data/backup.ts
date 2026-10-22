// Backup export and restore (SPEC §12). Both are online-only and awaited, like change-mobile:
// an export from an incomplete cache would look complete but miss data, and a restore must see what the
// server already has. A restore only fills an EMPTY shop (a new Firebase project) — it never deletes or
// changes existing data, and the security rules stay as strict as ever.
import {
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
/** Firestore allows 500 writes per batch; stay well under. */
const BATCH_WRITES = 400
const RESTORE_MARKER_ID = 'restore'

const isTimestamp = (v: unknown): v is Timestamp => v instanceof Timestamp
const decode = (data: Record<string, unknown>) =>
  decodeValue(data, (s, ns) => new Timestamp(s, ns)) as Record<string, unknown>

/** Every doc of a shop collection, straight from the server, 1000 at a time. */
async function readAllFromServer(
  name: BackupCollection,
  onPage: (count: number) => void,
): Promise<{ id: string; data: DocumentData }[]> {
  const out: { id: string; data: DocumentData }[] = []
  let last: string | null = null
  for (;;) {
    const base = paths.shopCollection(name)
    const q: Query = last
      ? query(base, orderBy(documentId()), startAfter(last), limit(PAGE))
      : query(base, orderBy(documentId()), limit(PAGE))
    const snap: QuerySnapshot = await getDocsFromServer(q)
    for (const d of snap.docs) {
      if (name === 'settings' && d.id === RESTORE_MARKER_ID) continue
      out.push({ id: d.id, data: d.data() })
    }
    onPage(out.length)
    const tail: QueryDocumentSnapshot | undefined = snap.docs[snap.docs.length - 1]
    if (snap.size < PAGE || !tail) return out
    last = tail.id
  }
}

export type BackupProgress = (collection: BackupCollection, count: number) => void

export async function exportBackup(onProgress: BackupProgress): Promise<BackupFile> {
  const ctx = writeContext()
  const collections = {} as Record<BackupCollection, BackupDoc[]>
  const counts = {} as Record<BackupCollection, number>
  for (const name of BACKUP_COLLECTIONS) {
    const docs = await readAllFromServer(name, (n) => onProgress(name, n))
    collections[name] = docs.map((d) => ({ id: d.id, data: encodeValue(d.data, isTimestamp) as Record<string, unknown> }))
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

const int = (v: unknown): number => (typeof v === 'number' && Number.isSafeInteger(v) ? v : 0)

/**
 * Write the backup into the empty shop, in phases (each phase fully committed before the next):
 * settings, medicines and logs, customers (due via increment), transactions as live, then the voids
 * (rules only create live transactions; a void is the normal one-time update), then the audit entry.
 */
export async function restoreBackup(backup: BackupFile, onProgress: (written: number, total: number) => void): Promise<void> {
  const target = await checkRestoreTarget(backup.backupId)
  if (target === 'notEmpty') throw new RestoreError('notEmpty', 0, 0)
  const ctx = writeContext()

  // Continuing: skip what is already there (it was written in full by the earlier run).
  const existing = new Map<BackupCollection, Map<string, DocumentData>>()
  if (target === 'resume') {
    for (const name of BACKUP_COLLECTIONS) {
      if (name === 'settings') continue
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
  const phases: Op[][] = [
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
  ]

  const total = phases.reduce((n, p) => n + p.length, 0) + 1
  let written = 0
  onProgress(written, total)
  try {
    for (const phase of phases) {
      for (let i = 0; i < phase.length; i += BATCH_WRITES) {
        const batch = newBatch()
        const chunk = phase.slice(i, i + BATCH_WRITES)
        for (const op of chunk) op(batch)
        await batch.commit()
        written += chunk.length
        onProgress(written, total)
      }
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
