import { increment, onSnapshot, serverTimestamp, Timestamp, type Unsubscribe } from 'firebase/firestore'
import { cleanProfile, type CustomerProfile } from '../../domain/customers'
import { DomainError } from '../../domain/errors'
import { normalizeMobile } from '../../domain/phone'
import { SCHEMA_VERSION, type Customer } from '../../domain/types'
import { customerFromDoc } from '../convert'
import { paths } from '../paths'
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
