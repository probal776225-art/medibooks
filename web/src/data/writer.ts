// Offline-first writes: build one batch, commit without waiting (CLAUDE.md rule 9).
// commit() only resolves on server ack, so awaiting it would hang the UI offline.
import { doc, serverTimestamp, Timestamp, writeBatch, type WriteBatch } from 'firebase/firestore'
import { getOrCreateDeviceId } from '../domain/ids'
import { SCHEMA_VERSION } from '../domain/types'
import { useAuthStore } from '../stores/auth'
import { useSyncStore } from '../stores/sync'
import { useToastStore } from '../stores/toast'
import { db } from './firebase'
import { paths } from './paths'

export interface WriteContext {
  uid: string
  deviceId: string
  /** Device clock, used for createdAt so ordering works offline. */
  now: number
}

let deviceId: string | null = null

export function writeContext(): WriteContext {
  const user = useAuthStore.getState().user
  if (!user) throw new Error('Not signed in')
  deviceId ??= getOrCreateDeviceId(localStorage)
  return { uid: user.uid, deviceId, now: Date.now() }
}

export function newBatch(): WriteBatch {
  return writeBatch(db)
}

/** Fire-and-forget commit; the local cache updates immediately, errors become a toast. */
export function commitInBackground(batch: WriteBatch): void {
  const sync = useSyncStore.getState()
  sync.beginWrite()
  batch
    .commit()
    .catch((e: unknown) => {
      console.error('Write rejected', e)
      useToastStore.getState().show('error', 'toast.writeFailed')
    })
    .finally(() => useSyncStore.getState().endWrite())
}

export interface AuditEntry {
  action: string
  entity: string
  entityId: string
  before: unknown
  after: unknown
}

/** Add a create-only audit log entry to the same batch. */
export function auditInBatch(batch: WriteBatch, entry: AuditEntry, ctx: WriteContext): void {
  batch.set(doc(paths.auditLog()), {
    ...entry,
    before: entry.before ?? null,
    after: entry.after ?? null,
    at: Timestamp.fromMillis(ctx.now),
    serverAt: serverTimestamp(),
    by: ctx.uid,
    deviceId: ctx.deviceId,
    schemaVersion: SCHEMA_VERSION,
  })
}
