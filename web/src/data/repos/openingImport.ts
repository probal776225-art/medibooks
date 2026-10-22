// চালু বাকি ইমপোর্ট: per row, the customer (new: merge-set; existing: update) + an 'opening' transaction
// + increment(totalDuePaisa), 200 rows per batch. Fire-and-forget like every save, so it also works offline.
import { doc, increment, serverTimestamp, Timestamp } from 'firebase/firestore'
import { buildOpening } from '../../domain/billing'
import { makeMemoNo } from '../../domain/ids'
import type { OpeningCheckedRow } from '../../domain/openingImport'
import { SCHEMA_VERSION } from '../../domain/types'
import { paths } from '../paths'
import { auditInBatch, commitInBackground, newBatch, writeContext } from '../writer'

const ROWS_PER_BATCH = 200

/** Writes the rows (all must be issue-free). Returns how many transactions were queued. */
export function importOpeningRows(rows: readonly OpeningCheckedRow[], source: 'csv' | 'grid'): number {
  const ctx = writeContext()
  let written = 0
  for (let i = 0; i < rows.length; i += ROWS_PER_BATCH) {
    const chunk = rows.slice(i, i + ROWS_PER_BATCH)
    const batch = newBatch()
    for (const r of chunk) {
      if (!r.mobileNorm || r.amountPaisa === null || r.issues.length) continue
      const at = r.asOfMs ?? ctx.now
      const draft = buildOpening({
        customer: { mobile: r.mobileNorm, name: r.name.trim() },
        amountPaisa: r.amountPaisa,
        note: r.note,
        meta: { memoNo: makeMemoNo('opening', at), deviceId: ctx.deviceId, createdAt: at, createdBy: ctx.uid },
      })
      const customerRef = paths.customer(r.mobileNorm)
      if (r.existing) {
        batch.update(customerRef, {
          totalDuePaisa: increment(r.amountPaisa),
          updatedAt: serverTimestamp(),
        })
      } else {
        batch.set(
          customerRef,
          {
            mobile: r.mobileNorm,
            name: r.name.replace(/\s+/g, ' ').trim(),
            address: r.address.replace(/\s+/g, ' ').trim(),
            note: '',
            totalDuePaisa: increment(r.amountPaisa),
            smsEnabled: true,
            reminderEnabled: true,
            archived: false,
            reminderCountThisMonth: 0,
            lastTxnAt: Timestamp.fromMillis(at),
            createdAt: Timestamp.fromMillis(at),
            createdBy: ctx.uid,
            updatedAt: serverTimestamp(),
            schemaVersion: SCHEMA_VERSION,
          },
          { merge: true },
        )
      }
      batch.set(doc(paths.transactions()), {
        ...draft,
        customerName: draft.customerName || r.name.trim(),
        createdAt: Timestamp.fromMillis(at),
        serverAt: serverTimestamp(),
      })
      written++
    }
    auditInBatch(
      batch,
      { action: 'opening.import', entity: 'transaction', entityId: source, before: null, after: { rows: chunk.length } },
      ctx,
    )
    commitInBackground(batch)
  }
  return written
}
