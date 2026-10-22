// Customer statement (SPEC §11): rows in a date range with বাকি / জমা / ব্যালেন্স, plus opening and closing balance.
// Built from the customer's current due and every transaction since the range start (newest first, as queried).
import type { DateRange } from './reports'
import type { Paisa, Transaction } from './types'

type StatementTxn = Pick<Transaction, 'id' | 'createdAt' | 'type' | 'memoNo' | 'effectPaisa' | 'voided' | 'note'>

export interface StatementRow<T extends StatementTxn> {
  txn: T
  /** Added to the due (বাকি). */
  debitPaisa: Paisa
  /** Taken off the due (জমা). */
  creditPaisa: Paisa
  balancePaisa: Paisa
}

export interface Statement<T extends StatementTxn> {
  openingPaisa: Paisa
  rows: StatementRow<T>[]
  closingPaisa: Paisa
  totalDebitPaisa: Paisa
  totalCreditPaisa: Paisa
}

/**
 * `sinceStartNewestFirst` = every transaction of the customer with createdAt ≥ range.start (also those after the
 * range end), newest first. Voided ones are left out of the statement.
 */
export function buildStatement<T extends StatementTxn>(
  currentDuePaisa: Paisa,
  sinceStartNewestFirst: readonly T[],
  range: DateRange,
): Statement<T> {
  const live = sinceStartNewestFirst.filter((t) => !t.voided)
  const openingPaisa = currentDuePaisa - live.reduce((s, t) => s + t.effectPaisa, 0)
  const inRange = live.filter((t) => t.createdAt >= range.start && t.createdAt < range.end).reverse()
  let balance = openingPaisa
  let totalDebitPaisa = 0
  let totalCreditPaisa = 0
  const rows = inRange.map((txn) => {
    balance += txn.effectPaisa
    const debitPaisa = Math.max(txn.effectPaisa, 0)
    const creditPaisa = Math.max(-txn.effectPaisa, 0)
    totalDebitPaisa += debitPaisa
    totalCreditPaisa += creditPaisa
    return { txn, debitPaisa, creditPaisa, balancePaisa: balance }
  })
  return { openingPaisa, rows, closingPaisa: balance, totalDebitPaisa, totalCreditPaisa }
}
