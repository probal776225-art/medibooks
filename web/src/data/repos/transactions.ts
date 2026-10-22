// Transactions are append-only. A sale = ONE batch: the transaction + increment(totalDuePaisa) on the customer
// (CLAUDE.md rules 3, 4, 9). Committed without waiting, so it works offline.
import { doc, increment, serverTimestamp, Timestamp } from 'firebase/firestore'
import type { TransactionDraft } from '../../domain/types'
import { paths } from '../paths'
import { commitInBackground, newBatch } from '../writer'

/** Returns the new transaction id. */
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
  // TODO(Phase 7): add the smsQueue item here, in this same batch, when SMS is on for the customer.
  commitInBackground(batch)
  return ref.id
}
