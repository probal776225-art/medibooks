// Customer list logic: input validation, search, filters, sorting (SPEC §3). Runs on the in-memory list.
import { toEnglishDigits } from './digits'
import { DomainError } from './errors'
import { aging, type AgingLevel } from './ledger'
import type { Customer, Millis, Paisa } from './types'

export const BIG_DUE_PAISA: Paisa = 500_000 // ৳5,000

export interface CustomerProfile {
  name: string
  address: string
  note: string
}

const LIMITS = { name: 100, address: 200, note: 300 } as const

function clean(s: string, max: number): string {
  return s.replace(/\s+/g, ' ').trim().slice(0, max)
}

/** Trim and collapse spaces; name is required. */
export function cleanProfile(input: CustomerProfile): CustomerProfile {
  const out = {
    name: clean(input.name, LIMITS.name),
    address: clean(input.address, LIMITS.address),
    note: clean(input.note, LIMITS.note),
  }
  if (!out.name) throw new DomainError('NAME_REQUIRED')
  return out
}

/** Aging uses the last payment, or when the customer was added if they never paid. */
export function customerAging(
  c: Pick<Customer, 'totalDuePaisa' | 'lastPaymentAt' | 'createdAt'>,
  now: Millis,
): { days: number | null; level: AgingLevel } {
  return aging({ totalDuePaisa: c.totalDuePaisa, lastPaymentAt: c.lastPaymentAt, firstDueAt: c.createdAt }, now)
}

/** বাজারে মোট বাকি: sum of positive dues of active customers. */
export function marketDue(list: readonly Customer[]): Paisa {
  let total = 0
  for (const c of list) if (!c.archived && c.totalDuePaisa > 0) total += c.totalDuePaisa
  return total
}

export type CustomerFilter = 'all' | 'due' | 'bigDue' | 'smsOff' | 'archived'
export type CustomerSort = 'due' | 'name' | 'activity' | 'aging'

export function matchesQuery(c: Pick<Customer, 'mobile' | 'name' | 'address'>, query: string): boolean {
  const q = toEnglishDigits(query).trim().toLowerCase()
  if (!q) return true
  const digits = q.replace(/[\s\-+()]/g, '')
  if (/^\d+$/.test(digits)) {
    const local = digits.startsWith('880') ? digits.slice(2) : digits
    return c.mobile.includes(local)
  }
  return c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q)
}

function passesFilter(c: Customer, filter: CustomerFilter): boolean {
  if (filter === 'archived') return c.archived
  if (c.archived) return false
  switch (filter) {
    case 'due':
      return c.totalDuePaisa > 0
    case 'bigDue':
      return c.totalDuePaisa >= BIG_DUE_PAISA
    case 'smsOff':
      return !c.smsEnabled
    case 'all':
      return true
  }
}

const collator = new Intl.Collator(['bn', 'en'], { sensitivity: 'base' })

function comparator(sort: CustomerSort, now: Millis): (a: Customer, b: Customer) => number {
  switch (sort) {
    case 'due':
      return (a, b) => b.totalDuePaisa - a.totalDuePaisa || collator.compare(a.name, b.name)
    case 'name':
      return (a, b) => collator.compare(a.name, b.name)
    case 'activity':
      return (a, b) => (b.lastTxnAt ?? b.createdAt) - (a.lastTxnAt ?? a.createdAt)
    case 'aging':
      return (a, b) => (customerAging(b, now).days ?? -1) - (customerAging(a, now).days ?? -1)
  }
}

export function queryCustomers(
  list: readonly Customer[],
  opts: { query?: string; filter?: CustomerFilter; sort?: CustomerSort; now: Millis },
): Customer[] {
  const { query = '', filter = 'all', sort = 'due', now } = opts
  return list.filter((c) => passesFilter(c, filter) && matchesQuery(c, query)).sort(comparator(sort, now))
}
