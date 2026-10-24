import {
  getDocsFromServer,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { cleanProfile, type CustomerProfile } from '../../domain/customers'
import { DomainError } from '../../domain/errors'
import { normalizeMobile } from '../../domain/phone'
import { SCHEMA_VERSION, type Customer } from '../../domain/types'
import { customerFromDoc } from '../convert'
import { paths } from '../paths'
import { prescriptionRefsOf } from './prescriptions'
import { auditInBatch, commitInBackground, newBatch, writeContext } from '../writer'

export interface CustomersSnapshot {
  customers: Customer[]
  fromCache: boolean
  /** Customer docs with local writes not yet on the server (survives reloads, unlike an in-memory counter). */
  pendingDocs: number
}

/**
 * Realtime listener on all customers (archived included — they are few, and the list filters them).
 * One of only two realtime listeners in the app (CLAUDE.md rule 10).
 */
export function subscribeCustomers(onData: (s: CustomersSnapshot) => void, onError: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    paths.customers(),
    { includeMetadataChanges: true },
    (snap) => {
      let pendingDocs = 0
      const customers = snap.docs.map((d) => {
        if (d.metadata.hasPendingWrites) pendingDocs++
        return customerFromDoc(d.id, d.data({ serverTimestamps: 'estimate' }))
      })
      onData({ customers, fromCache: snap.metadata.fromCache, pendingDocs })
    },
    onError,
  )
}

/**
 * Create a customer. Merge-set with increment(0) so the due field exists but is never overwritten,
 * even if another device created the same mobile offline (CLAUDE.md rule 3).
 */
export function createCustomer(input: { mobile: string } & CustomerProfile): string {
  const mobile = normalizeMobile(input.mobile)
  if (!mobile) throw new DomainError('INVALID_MOBILE')
  const profile = cleanProfile(input)
  const ctx = writeContext()
  const batch = newBatch()
  const data = {
    mobile,
    ...profile,
    totalDuePaisa: increment(0),
    smsEnabled: true,
    reminderEnabled: true,
    archived: false,
    reminderCountThisMonth: 0,
    createdAt: Timestamp.fromMillis(ctx.now),
    createdBy: ctx.uid,
    updatedAt: serverTimestamp(),
    schemaVersion: SCHEMA_VERSION,
  }
  batch.set(paths.customer(mobile), data, { merge: true })
  auditInBatch(batch, { action: 'customer.create', entity: 'customer', entityId: mobile, before: null, after: profile }, ctx)
  commitInBackground(batch)
  return mobile
}

export function updateCustomerProfile(before: Customer, input: CustomerProfile): void {
  const profile = cleanProfile(input)
  const ctx = writeContext()
  const batch = newBatch()
  batch.update(paths.customer(before.mobile), { ...profile, updatedAt: serverTimestamp() })
  auditInBatch(
    batch,
    {
      action: 'customer.update',
      entity: 'customer',
      entityId: before.mobile,
      before: { name: before.name, address: before.address, note: before.note },
      after: profile,
    },
    ctx,
  )
  commitInBackground(batch)
}

export type CustomerFlags = Partial<Pick<Customer, 'smsEnabled' | 'reminderEnabled' | 'archived'>>

export function setCustomerFlags(before: Customer, flags: CustomerFlags): void {
  const ctx = writeContext()
  const batch = newBatch()
  batch.update(paths.customer(before.mobile), { ...flags, updatedAt: serverTimestamp() })
  const prev: CustomerFlags = {}
  for (const k of Object.keys(flags) as (keyof CustomerFlags)[]) prev[k] = before[k]
  auditInBatch(batch, { action: 'customer.flags', entity: 'customer', entityId: before.mobile, before: prev, after: flags }, ctx)
  commitInBackground(batch)
}

/**
 * Move a customer to a new mobile number (SPEC §3). Needs internet: it must see every transaction on the server.
 * Order: move the transactions first (batches of 400), then create the new record with the due and archive the old
 * one (due moved out, `movedTo` set) in a final batch. Unlike normal saves this awaits the server, so the owner
 * only sees "done" when it really is; if it stops halfway, running it again finishes the rest.
 */
export async function changeCustomerMobile(
  c: Customer,
  newMobileInput: string,
  taken: (mobile: string) => boolean,
  onProgress?: (moved: number, total: number) => void,
): Promise<string> {
  const newMobile = normalizeMobile(newMobileInput)
  if (!newMobile) throw new DomainError('INVALID_MOBILE')
  if (newMobile === c.mobile) throw new DomainError('SAME_MOBILE')
  if (taken(newMobile)) throw new DomainError('MOBILE_TAKEN')
  const ctx = writeContext()

  const snap = await getDocsFromServer(query(paths.transactions(), where('customerId', '==', c.mobile)))
  // Prescription photos move with the customer too (rules allow a customerId-only update on both).
  const refs = [...snap.docs.map((d) => d.ref), ...(await prescriptionRefsOf(c.mobile))]
  const docs = snap.docs
  for (let i = 0; i < refs.length; i += 400) {
    const batch = newBatch()
    for (const ref of refs.slice(i, i + 400)) batch.update(ref, { customerId: newMobile })
    await batch.commit()
    onProgress?.(Math.min(i + 400, refs.length), refs.length)
  }

  const batch = newBatch()
  batch.set(paths.customer(newMobile), {
    mobile: newMobile,
    name: c.name,
    address: c.address,
    note: c.note,
    totalDuePaisa: increment(c.totalDuePaisa),
    smsEnabled: c.smsEnabled,
    reminderEnabled: c.reminderEnabled,
    archived: false,
    lastTxnAt: c.lastTxnAt === null ? null : Timestamp.fromMillis(c.lastTxnAt),
    lastPaymentAt: c.lastPaymentAt === null ? null : Timestamp.fromMillis(c.lastPaymentAt),
    lastReminderAt: c.lastReminderAt === null ? null : Timestamp.fromMillis(c.lastReminderAt),
    reminderMonth: c.reminderMonth,
    reminderCountThisMonth: c.reminderCountThisMonth,
    movedFrom: c.mobile,
    createdAt: Timestamp.fromMillis(c.createdAt || ctx.now),
    createdBy: c.createdBy || ctx.uid,
    updatedAt: serverTimestamp(),
    schemaVersion: SCHEMA_VERSION,
  })
  batch.update(paths.customer(c.mobile), {
    archived: true,
    movedTo: newMobile,
    totalDuePaisa: increment(0 - c.totalDuePaisa),
    updatedAt: serverTimestamp(),
  })
  auditInBatch(
    batch,
    {
      action: 'customer.changeMobile',
      entity: 'customer',
      entityId: c.mobile,
      before: { mobile: c.mobile, totalDuePaisa: c.totalDuePaisa },
      after: { mobile: newMobile, transactionsMoved: docs.length, photosMoved: refs.length - docs.length },
    },
    ctx,
  )
  await batch.commit()
  return newMobile
}
