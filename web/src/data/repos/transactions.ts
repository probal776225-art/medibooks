// Transactions are append-only. Every write is ONE batch together with increment(totalDuePaisa) on the customer
// (CLAUDE.md rules 3, 4, 9). Committed without waiting, so it works offline.
import {
  doc,
  getDocs,
  getDocsFromServer,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  Timestamp,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { buildVoid } from '../../domain/billing'
import { planTxnSms } from '../../domain/sms'
import type { BalanceMismatch } from '../../domain/ledger'
import type { Transaction, TransactionDraft } from '../../domain/types'
import { transactionFromDoc } from '../convert'
import { paths } from '../paths'
import { useDataStore } from '../../stores/data'
import { staffScopeUid } from '../../stores/role'
import { auditInBatch, commitInBackground, newBatch, writeContext } from '../writer'
import { queueSmsInBatch, sendSoon, smsServerConfigured } from './sms'

/** Returns the new transaction id. The customer's SMS (if SMS is on) goes into the same batch. */
export function saveTransaction(draft: TransactionDraft): string {
  const ref = doc(paths.transactions())
  const batch = newBatch()
  const at = Timestamp.fromMillis(draft.createdAt)
  batch.set(ref, {
    ...draft,
    createdAt: at,
    serverAt: serverTimestamp(),
  })
  batch.update(paths.customer(draft.customerId), {
    totalDuePaisa: increment(draft.effectPaisa),
    lastTxnAt: at,
    // Money received now counts as a payment for aging.
    ...(draft.paidNowPaisa > 0 ? { lastPaymentAt: at } : {}),
    updatedAt: serverTimestamp(),
  })
  const { settings, byMobile } = useDataStore.getState()
  // No SMS server in this build (the Worker is not set up yet): nothing to queue.
  const plan = smsServerConfigured ? planTxnSms(draft, byMobile.get(draft.customerId), settings) : null
  const smsId = plan
    ? queueSmsInBatch(batch, plan, { customerId: draft.customerId, customerName: draft.customerName, txnId: ref.id }, {
        uid: draft.createdBy,
        now: draft.createdAt,
      })
    : null
  commitInBackground(batch, smsId ? () => sendSoon([smsId]) : undefined)
  return ref.id
}

/** Void = mark it + reverse its effect on the due + audit, in one batch. Throws if already voided or no reason. */
export function voidTransaction(txn: Transaction, reason: string): void {
  const ctx = writeContext()
  const v = buildVoid(txn, reason, ctx.now, ctx.uid)
  const batch = newBatch()
  batch.update(doc(paths.transactions(), txn.id), {
    ...v.patch,
    voidedAt: Timestamp.fromMillis(ctx.now),
  })
  batch.update(paths.customer(txn.customerId), {
    totalDuePaisa: increment(v.reverseEffectPaisa),
    updatedAt: serverTimestamp(),
  })
  auditInBatch(
    batch,
    {
      action: 'transaction.void',
      entity: 'transaction',
      entityId: txn.id,
      before: { memoNo: txn.memoNo, type: txn.type, effectPaisa: txn.effectPaisa },
      after: { voided: true, reason: v.patch.voidReason, reverseEffectPaisa: v.reverseEffectPaisa },
    },
    ctx,
  )
  commitInBackground(batch)
}

export interface LedgerRowData {
  txn: Transaction
  /** Written on this device, not yet on the server. */
  pending: boolean
}

export interface LedgerPage {
  rows: LedgerRowData[]
  last: QueryDocumentSnapshot<DocumentData> | null
}

// Staff may read only their own transactions, so their queries carry createdBy == uid (the rules demand it).
const mine = () => {
  const uid = staffScopeUid()
  return uid ? [where('createdBy', '==', uid)] : []
}

const ledgerQuery = (mobile: string) =>
  query(paths.transactions(), where('customerId', '==', mobile), ...mine(), orderBy('createdAt', 'desc'))

function toRows(docs: QueryDocumentSnapshot<DocumentData>[]): LedgerRowData[] {
  return docs.map((d) => ({
    txn: transactionFromDoc(d.id, d.data({ serverTimestamps: 'estimate' })),
    pending: d.metadata.hasPendingWrites,
  }))
}

/** Newest page, live (a sale or void shows up at once, also offline). */
export function subscribeLedger(
  mobile: string,
  pageSize: number,
  onData: (page: LedgerPage) => void,
  onError: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(ledgerQuery(mobile), limit(pageSize)),
    { includeMetadataChanges: true },
    (snap) => onData({ rows: toRows(snap.docs), last: snap.docs.at(-1) ?? null }),
    onError,
  )
}

/** Older pages on demand (cache when offline). */
export async function fetchLedgerPage(
  mobile: string,
  after: QueryDocumentSnapshot<DocumentData>,
  pageSize: number,
): Promise<LedgerPage> {
  const snap = await getDocs(query(ledgerQuery(mobile), startAfter(after), limit(pageSize)))
  return { rows: toRows(snap.docs), last: snap.docs.at(-1) ?? null }
}

/** Every transaction, from the server (for ব্যালেন্স যাচাই). Throws when offline. */
export async function fetchAllTransactions(onProgress?: (count: number) => void): Promise<Transaction[]> {
  const out: Transaction[] = []
  let after: QueryDocumentSnapshot<DocumentData> | null = null
  for (;;) {
    const snap: QuerySnapshot<DocumentData> = await getDocsFromServer(
      query(paths.transactions(), orderBy('createdAt'), ...(after ? [startAfter(after)] : []), limit(500)),
    )
    for (const d of snap.docs) out.push(transactionFromDoc(d.id, d.data()))
    onProgress?.(out.length)
    if (snap.docs.length < 500) return out
    after = snap.docs.at(-1)!
  }
}

/** Fix stored dues with increment(diff) — never overwrite — and log each fix. */
export function repairBalances(mismatches: readonly BalanceMismatch[]): void {
  const ctx = writeContext()
  for (let i = 0; i < mismatches.length; i += 200) {
    const batch = newBatch()
    for (const m of mismatches.slice(i, i + 200)) {
      batch.update(paths.customer(m.customerId), { totalDuePaisa: increment(m.diffPaisa), updatedAt: serverTimestamp() })
      auditInBatch(
        batch,
        {
          action: 'customer.balanceRepair',
          entity: 'customer',
          entityId: m.customerId,
          before: { totalDuePaisa: m.storedPaisa },
          after: { totalDuePaisa: m.expectedPaisa, diffPaisa: m.diffPaisa },
        },
        ctx,
      )
    }
    commitInBackground(batch)
  }
}

const rangeQuery = (start: number, end: number) =>
  query(
    paths.transactions(),
    ...mine(),
    where('createdAt', '>=', Timestamp.fromMillis(start)),
    where('createdAt', '<', Timestamp.fromMillis(end)),
    orderBy('createdAt', 'desc'),
  )

/** All transactions in [start, end), live (the home screen's "today"). */
export function subscribeRange(
  start: number,
  end: number,
  onData: (txns: Transaction[], fromCache: boolean) => void,
  onError: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    rangeQuery(start, end),
    (snap) =>
      onData(
        snap.docs.map((d) => transactionFromDoc(d.id, d.data({ serverTimestamps: 'estimate' }))),
        snap.metadata.fromCache,
      ),
    onError,
  )
}

/** One read of a date range (reports). Offline it returns what this device has cached. */
export async function fetchRange(start: number, end: number): Promise<{ txns: Transaction[]; fromCache: boolean }> {
  const snap = await getDocs(rangeQuery(start, end))
  return { txns: snap.docs.map((d) => transactionFromDoc(d.id, d.data())), fromCache: snap.metadata.fromCache }
}

/** A customer's transactions since `start` (newest first) — for the statement. Offline it uses the cache. */
export async function fetchCustomerSince(mobile: string, start: number): Promise<Transaction[]> {
  const snap = await getDocs(
    query(
      paths.transactions(),
      where('customerId', '==', mobile),
      ...mine(),
      where('createdAt', '>=', Timestamp.fromMillis(start)),
      orderBy('createdAt', 'desc'),
    ),
  )
  return snap.docs.map((d) => transactionFromDoc(d.id, d.data()))
}
