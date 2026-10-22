import { describe, expect, it } from 'vitest'
import { buildStatement } from './statement'

const tx = (id: string, createdAt: number, effectPaisa: number, voided = false) => ({
  id,
  createdAt,
  type: effectPaisa >= 0 ? ('sale' as const) : ('payment' as const),
  memoNo: id,
  effectPaisa,
  voided,
  note: '',
})

describe('buildStatement', () => {
  // Timeline: before range +5000 (not fetched), in range: +1000, −300, voided +999, after range: +200. Current due 5900.
  const sinceStart = [tx('after', 40, 200), tx('void', 25, 999, true), tx('pay', 20, -300), tx('sale', 10, 1000)]
  const range = { start: 5, end: 30 }

  it('opening = current due minus everything since the start; rows oldest first with running balance', () => {
    const s = buildStatement(5900, sinceStart, range)
    expect(s.openingPaisa).toBe(5000)
    expect(s.rows.map((r) => [r.txn.id, r.debitPaisa, r.creditPaisa, r.balancePaisa])).toEqual([
      ['sale', 1000, 0, 6000],
      ['pay', 0, 300, 5700],
    ])
    expect(s.closingPaisa).toBe(5700)
    expect(s.totalDebitPaisa).toBe(1000)
    expect(s.totalCreditPaisa).toBe(300)
  })

  it('an empty range keeps the opening as the closing balance', () => {
    const s = buildStatement(5900, [tx('after', 40, 200)], { start: 30, end: 35 })
    expect(s).toMatchObject({ openingPaisa: 5700, rows: [], closingPaisa: 5700 })
  })
})
