// Ledger views and balance checks, computed from transactions (never stored).
import { calendarDaysBetween } from './dates'
import type { Millis, Paisa, Transaction } from './types'

type LedgerTxn = Pick<Transaction, 'createdAt' | 'effectPaisa' | 'voided'>

export interface LedgerRow<T extends LedgerTxn> {
  txn: T
  /** Balance after this row; voided rows leave it unchanged. */
  balanceAfterPaisa: Paisa
}

/** Oldest first, with a running balance. Ties keep input order. */
export function runningBalance<T extends LedgerTxn>(txns: readonly T[], openingPaisa: Paisa = 0): LedgerRow<T>[] {
  const sorted = txns.map((t, i) => ({ t, i })).sort((a, b) => a.t.createdAt - b.t.createdAt || a.i - b.i)
  let balance = openingPaisa
  return sorted.map(({ t }) => {
    if (!t.voided) balance += t.effectPaisa
    return { txn: t, balanceAfterPaisa: balance }
  })
}

/** What the customer's due should be: Σ effect of non-voided transactions. */
export function expectedDue(txns: readonly LedgerTxn[]): Paisa {
  let total = 0
  for (const t of txns) if (!t.voided) total += t.effectPaisa
  return total
}

export interface BalanceCheck {
  storedPaisa: Paisa
  expectedPaisa: Paisa
  /** Apply increment(diffPaisa) to repair; 0 = OK. */
  diffPaisa: Paisa
}

export function checkBalance(storedPaisa: Paisa, txns: readonly LedgerTxn[]): BalanceCheck {
  const expectedPaisa = expectedDue(txns)
  return { storedPaisa, expectedPaisa, diffPaisa: expectedPaisa - storedPaisa }
}

/**
 * The ledger is read newest-first, a page at a time. Walk back from the customer's current due:
 * the newest row's balance-after is the current due; each older row is that minus the newer effects.
 */
export function balancesFromNewest<T extends Pick<Transaction, 'effectPaisa' | 'voided'>>(
  currentDuePaisa: Paisa,
  newestFirst: readonly T[],
): { txn: T; balanceAfterPaisa: Paisa }[] {
  let balance = currentDuePaisa
  return newestFirst.map((txn) => {
    const row = { txn, balanceAfterPaisa: balance }
    if (!txn.voided) balance -= txn.effectPaisa
    return row
  })
}

export interface BalanceMismatch extends BalanceCheck {
  customerId: string
  name: string
}

/** ব্যালেন্স যাচাই: every customer whose stored due differs from the sum of their non-voided transactions. */
export function findBalanceMismatches(
  customers: readonly { mobile: string; name: string; totalDuePaisa: Paisa }[],
  txns: readonly Pick<Transaction, 'customerId' | 'effectPaisa' | 'voided'>[],
): BalanceMismatch[] {
  const sums = new Map<string, Paisa>()
  for (const t of txns) if (!t.voided) sums.set(t.customerId, (sums.get(t.customerId) ?? 0) + t.effectPaisa)
  const out: BalanceMismatch[] = []
  for (const c of customers) {
    const expectedPaisa = sums.get(c.mobile) ?? 0
    if (expectedPaisa !== c.totalDuePaisa) {
      out.push({ customerId: c.mobile, name: c.name, storedPaisa: c.totalDuePaisa, expectedPaisa, diffPaisa: expectedPaisa - c.totalDuePaisa })
    }
  }
  return out
}

export type AgingLevel = 'none' | 'green' | 'yellow' | 'red'

/**
 * Days since the last payment, or since the first sale if never paid (SPEC §3).
 * Customers with no due get 'none'.
 */
export function aging(
  c: { totalDuePaisa: Paisa; lastPaymentAt: Millis | null; firstDueAt: Millis | null },
  now: Millis,
): { days: number | null; level: AgingLevel } {
  if (c.totalDuePaisa <= 0) return { days: null, level: 'none' }
  const since = c.lastPaymentAt ?? c.firstDueAt
  if (since === null) return { days: null, level: 'none' }
  const days = calendarDaysBetween(since, now)
  return { days, level: days < 30 ? 'green' : days <= 60 ? 'yellow' : 'red' }
}
