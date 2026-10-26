// SMS queue (Phase 7, SPEC §8). An item is written in the same batch as its bill or payment (works offline);
// once the server has it, this device asks the Worker to send it. The Worker's cron picks up anything missed.
import {
  count,
  doc,
  getAggregateFromServer,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  sum,
  Timestamp,
  updateDoc,
  waitForPendingWrites,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
  type WriteBatch,
} from 'firebase/firestore'
import type { SmsPlan, SmsQueueItem, SmsStatus } from '../../domain/sms'
import { SCHEMA_VERSION, type Millis } from '../../domain/types'
import { smsFromDoc } from '../convert'
import { auth, db } from '../firebase'
import { paths } from '../paths'
import { newBatch, type WriteContext } from '../writer'

const WORKER_URL = (import.meta.env.VITE_WORKER_URL ?? '').replace(/\/+$/, '')
/** False until the Worker is deployed and its URL is in the build: SMS then wait in the queue. */
export const smsServerConfigured = WORKER_URL !== ''

export interface SmsSource {
  customerId: string | null
  customerName: string
  txnId: string | null
}

/** Adds a pending item to the batch; returns its id. */
export function queueSmsInBatch(batch: WriteBatch, plan: SmsPlan, src: SmsSource, ctx: Pick<WriteContext, 'uid' | 'now'>): string {
  const ref = doc(paths.smsQueue())
  batch.set(ref, {
    ...plan,
    ...src,
    status: 'pending',
    attempts: 0,
    lastError: '',
    providerRef: '',
    retryAt: null,
    sentAt: null,
    createdAt: Timestamp.fromMillis(ctx.now),
    serverAt: serverTimestamp(),
    createdBy: ctx.uid,
    schemaVersion: SCHEMA_VERSION,
  })
  remember(ref.id, ctx.now)
  return ref.id
}

// ---- outbox: items this device queued and has not handed to the Worker yet (survives reloads) ----

const OUTBOX_KEY = 'baki.smsOutbox'
const OUTBOX_MAX_AGE = 2 * 24 * 60 * 60 * 1000

function readOutbox(): Record<string, number> {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? '{}')
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, number>) : {}
  } catch {
    return {}
  }
}

function writeOutbox(box: Record<string, number>): void {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(box))
  } catch {
    // storage full or blocked: the Worker's cron still sends these
  }
}

function remember(id: string, at: Millis): void {
  writeOutbox({ ...readOutbox(), [id]: at })
}

/** What the Worker said about each item ('missing' = not on the server yet, 'later' = the cron will do it). */
export type SendOutcome = SmsStatus | 'missing' | 'busy' | 'later'

/** Ask the Worker to send these items now (default: this device's outbox). Needs internet. */
export async function sendQueued(ids?: string[]): Promise<Map<string, SendOutcome>> {
  const out = new Map<string, SendOutcome>()
  const box = readOutbox()
  const now = Date.now()
  for (const [id, at] of Object.entries(box)) if (now - at > OUTBOX_MAX_AGE) delete box[id]
  writeOutbox(box)
  const user = auth.currentUser
  if (!smsServerConfigured || !user || !navigator.onLine) return out
  const all = ids ?? Object.keys(box)
  // The Worker sends about 30 per call; more are left for its cron, so ask in small groups.
  for (let i = 0; i < all.length; i += 25) {
    const res = await fetch(`${WORKER_URL}/sms/process`, {
      method: 'POST',
      headers: { authorization: `Bearer ${await user.getIdToken()}`, 'content-type': 'application/json' },
      body: JSON.stringify({ ids: all.slice(i, i + 25) }),
    })
    if (!res.ok) throw new Error(`SMS server ${res.status}`)
    const body = (await res.json()) as { results: { id: string; status: SendOutcome }[] }
    const left = readOutbox()
    for (const r of body.results) {
      out.set(r.id, r.status)
      if (r.status !== 'missing') delete left[r.id]
    }
    writeOutbox(left)
  }
  return out
}

/** Fire-and-forget version (after a save). */
export function sendSoon(ids: string[]): void {
  sendQueued(ids).catch((e: unknown) => console.warn('SMS send request failed; the Worker cron will retry', e))
}

/** Send what this device left behind: now (after its offline writes reach the server) and on every reconnect. */
export function startSmsOutbox(): () => void {
  let stopped = false
  const flush = () => {
    waitForPendingWrites(db)
      .then(() => {
        if (!stopped && Object.keys(readOutbox()).length) sendSoon(Object.keys(readOutbox()))
      })
      .catch(() => undefined)
  }
  flush()
  window.addEventListener('online', flush)
  return () => {
    stopped = true
    window.removeEventListener('online', flush)
  }
}

// ---- SMS log (owner) ----

export type SmsFilter = 'all' | 'pending' | 'sent' | 'failed' | 'test'

export interface SmsLogPage {
  items: SmsQueueItem[]
  last: QueryDocumentSnapshot<DocumentData> | null
}

const logQuery = (filter: SmsFilter) =>
  query(paths.smsQueue(), ...(filter === 'all' ? [] : [where('status', '==', filter)]), orderBy('createdAt', 'desc'))

const toPage = (docs: QueryDocumentSnapshot<DocumentData>[]): SmsLogPage => ({
  items: docs.map((d) => smsFromDoc(d.id, d.data({ serverTimestamps: 'estimate' }))),
  last: docs.at(-1) ?? null,
})

/** Newest page, live: a "pending" row turns "sent" a moment later. */
export function subscribeSmsLog(
  filter: SmsFilter,
  pageSize: number,
  onData: (page: SmsLogPage) => void,
  onError: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(query(logQuery(filter), limit(pageSize)), (snap) => onData(toPage(snap.docs)), onError)
}

export async function fetchSmsLogPage(
  filter: SmsFilter,
  after: QueryDocumentSnapshot<DocumentData>,
  pageSize: number,
): Promise<SmsLogPage> {
  const snap = await getDocs(query(logQuery(filter), startAfter(after), limit(pageSize)))
  return toPage(snap.docs)
}

/** Put a failed item back in the queue and send it (owner). */
export function retrySms(item: SmsQueueItem): void {
  remember(item.id, Date.now())
  updateDoc(paths.smsItem(item.id), { status: 'pending', attempts: 0, lastError: '', retriedAt: serverTimestamp() })
    .then(() => sendSoon([item.id]))
    .catch((e: unknown) => console.error('Retry failed', e))
}

/** Sent SMS in [start, end): how many and how many parts (cost = parts × rate). Online only. */
export async function fetchSmsStats(start: Millis, end: Millis): Promise<{ sent: number; segments: number }> {
  const snap = await getAggregateFromServer(
    query(
      paths.smsQueue(),
      where('status', '==', 'sent'),
      where('createdAt', '>=', Timestamp.fromMillis(start)),
      where('createdAt', '<', Timestamp.fromMillis(end)),
    ),
    { sent: count(), segments: sum('segments') },
  )
  const d = snap.data()
  return { sent: d.sent, segments: d.segments ?? 0 }
}

/** The provider's balance in taka (owner). */
export async function fetchSmsBalance(): Promise<number> {
  const user = auth.currentUser
  if (!smsServerConfigured || !user) throw new Error('SMS server not set')
  const res = await fetch(`${WORKER_URL}/sms/balance`, { headers: { authorization: `Bearer ${await user.getIdToken()}` } })
  const body = (await res.json()) as { balance?: number; error?: string }
  if (!res.ok || typeof body.balance !== 'number') throw new Error(body.error ?? `SMS server ${res.status}`)
  return body.balance
}

/** The owner's test message from Settings: sent for real even in test mode. Online only; waits for the result. */
export async function sendTestSms(plan: SmsPlan, ctx: WriteContext): Promise<SendOutcome | undefined> {
  const batch = newBatch()
  const id = queueSmsInBatch(batch, plan, { customerId: null, customerName: '', txnId: null }, ctx)
  await batch.commit()
  return (await sendQueued([id])).get(id)
}
