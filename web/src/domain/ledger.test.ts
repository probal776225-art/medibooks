import { describe, expect, it } from 'vitest'
import { aging, checkBalance, expectedDue, runningBalance } from './ledger'

const DAY = 86_400_000
// 2026-10-22 12:00 Asia/Dhaka
const NOW = Date.UTC(2026, 9, 22, 6, 0, 0)

describe('runningBalance', () => {
  it('sorts by time and skips voided rows', () => {
    const rows = runningBalance([
      { id: 'c', createdAt: 3, effectPaisa: -500, voided: false },
      { id: 'a', createdAt: 1, effectPaisa: 1000, voided: false },
      { id: 'b', createdAt: 2, effectPaisa: 700, voided: true },
    ])
    expect(rows.map((r) => [r.txn.id, r.balanceAfterPaisa])).toEqual([
      ['a', 1000],
      ['b', 1000],
      ['c', 500],
    ])
  })

  it('keeps input order for equal times', () => {
    const rows = runningBalance([
      { id: 'x', createdAt: 1, effectPaisa: 1, voided: false },
      { id: 'y', createdAt: 1, effectPaisa: 2, voided: false },
    ])
    expect(rows.map((r) => r.txn.id)).toEqual(['x', 'y'])
  })
})

describe('balance check', () => {
  it('finds the repair diff', () => {
    const txns = [
      { createdAt: 1, effectPaisa: 1000, voided: false },
      { createdAt: 2, effectPaisa: -300, voided: false },
      { createdAt: 3, effectPaisa: 999, voided: true },
    ]
    expect(expectedDue(txns)).toBe(700)
    expect(checkBalance(700, txns).diffPaisa).toBe(0)
    expect(checkBalance(1000, txns)).toEqual({ storedPaisa: 1000, expectedPaisa: 700, diffPaisa: -300 })
  })
})

describe('aging', () => {
  it('uses last payment, else first due, in Dhaka calendar days', () => {
    expect(aging({ totalDuePaisa: 100, lastPaymentAt: NOW - 10 * DAY, firstDueAt: null }, NOW)).toEqual({
      days: 10,
      level: 'green',
    })
    expect(aging({ totalDuePaisa: 100, lastPaymentAt: null, firstDueAt: NOW - 45 * DAY }, NOW).level).toBe('yellow')
    expect(aging({ totalDuePaisa: 100, lastPaymentAt: NOW - 60 * DAY, firstDueAt: null }, NOW).level).toBe('yellow')
    expect(aging({ totalDuePaisa: 100, lastPaymentAt: NOW - 61 * DAY, firstDueAt: null }, NOW).level).toBe('red')
    expect(aging({ totalDuePaisa: 0, lastPaymentAt: NOW - 90 * DAY, firstDueAt: null }, NOW).level).toBe('none')
    expect(aging({ totalDuePaisa: -500, lastPaymentAt: null, firstDueAt: null }, NOW).level).toBe('none')
  })
})
