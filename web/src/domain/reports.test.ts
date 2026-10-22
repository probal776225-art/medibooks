import { describe, expect, it } from 'vitest'
import { agingBuckets, customRange, newCustomersIn, presetRange, reportCsv, summarize, topDue } from './reports'
import { SCHEMA_VERSION, type Customer, type SaleLine, type Transaction } from './types'

const DAY = 86_400_000
// Wednesday 2026-10-22 12:00 Dhaka
const NOW = Date.UTC(2026, 9, 22, 6, 0)

describe('ranges (Asia/Dhaka)', () => {
  it('today, Saturday-start week, month', () => {
    expect(presetRange('today', NOW)).toEqual({ start: Date.UTC(2026, 9, 21, 18), end: Date.UTC(2026, 9, 22, 18) })
    // Saturday 2026-10-17 00:00 Dhaka → Saturday 2026-10-24
    expect(presetRange('week', NOW)).toEqual({ start: Date.UTC(2026, 9, 16, 18), end: Date.UTC(2026, 9, 23, 18) })
    expect(presetRange('month', NOW)).toEqual({ start: Date.UTC(2026, 8, 30, 18), end: Date.UTC(2026, 9, 31, 18) })
    // A Saturday is the first day of its own week.
    const sat = Date.UTC(2026, 9, 24, 6)
    expect(presetRange('week', sat).start).toBe(Date.UTC(2026, 9, 23, 18))
  })

  it('custom range includes both days', () => {
    expect(customRange('2026-10-01', '2026-10-22')).toEqual({ start: Date.UTC(2026, 8, 30, 18), end: Date.UTC(2026, 9, 22, 18) })
    expect(customRange('2026-10-22', '2026-10-01')).toBeNull()
    expect(customRange('', '2026-10-01')).toBeNull()
  })
})

const line = (discountPaisa: number): SaleLine => ({
  lineNo: 1, medicineId: null, name: 'x', genericName: '', strength: '', dosageForm: '', manufacturer: '',
  unit: 'custom', unitLabel: 'x', piecesPerUnit: null, qty: 1, listUnitPricePaisa: null, unitPricePaisa: 0,
  priceOverridden: false, discountPaisa, lineTotalPaisa: 0,
})
type T = Pick<Transaction, 'type' | 'netPaisa' | 'paidNowPaisa' | 'paymentMethod' | 'effectPaisa' | 'billDiscountPaisa' | 'lines' | 'voided'>
const t = (o: Partial<T>): T => ({ type: 'sale', netPaisa: 0, paidNowPaisa: 0, paymentMethod: null, effectPaisa: 0, billDiscountPaisa: 0, lines: [], voided: false, ...o })

describe('summarize', () => {
  it('adds up sales, collections by method (incl. paid now on bills), openings, adjustments; skips voided', () => {
    const s = summarize([
      t({ type: 'sale', netPaisa: 14000, paidNowPaisa: 10000, paymentMethod: 'bkash', effectPaisa: 4000, billDiscountPaisa: 1551, lines: [line(200)] }),
      t({ type: 'sale', netPaisa: 50000, effectPaisa: 50000 }),
      t({ type: 'sale', netPaisa: 99900, effectPaisa: 99900, voided: true }),
      t({ type: 'payment', netPaisa: 100000, paidNowPaisa: 100000, paymentMethod: 'bkash', effectPaisa: -100000 }),
      t({ type: 'payment', netPaisa: 35000, paidNowPaisa: 35000, paymentMethod: 'cash', effectPaisa: -35000 }),
      t({ type: 'opening', netPaisa: 30000, effectPaisa: 30000 }),
      t({ type: 'adjustment', netPaisa: 2500, effectPaisa: -2500 }),
    ])
    expect(s).toEqual({
      saleCount: 2,
      salesNetPaisa: 64000,
      bakiGivenPaisa: 54000,
      discountPaisa: 1751,
      paymentCount: 2,
      collectedPaisa: 145000,
      collectedByMethod: { cash: 35000, card: 0, bkash: 110000, nagad: 0 },
      openingCount: 1,
      openingPaisa: 30000,
      adjustmentCount: 1,
      adjustmentPaisa: -2500,
      voidedCount: 1,
      netChangePaisa: 4000 + 50000 - 100000 - 35000 + 30000 - 2500,
    })
  })
})

const c = (mobile: string, due: number, over: Partial<Customer> = {}): Customer => ({
  mobile, name: mobile, address: '', note: '', totalDuePaisa: due, smsEnabled: true, reminderEnabled: true,
  archived: false, lastTxnAt: null, lastPaymentAt: null, lastReminderAt: null, reminderMonth: null,
  reminderCountThisMonth: 0, movedTo: null, createdAt: NOW - DAY, createdBy: 'o', updatedAt: null, schemaVersion: SCHEMA_VERSION, ...over,
})

describe('customers', () => {
  const list = [
    c('01711000001', 1000, { lastPaymentAt: NOW - 5 * DAY }),
    c('01711000002', 2000, { createdAt: NOW - 45 * DAY }),
    c('01711000003', 3000, { createdAt: NOW - 75 * DAY }),
    c('01711000004', 4000, { createdAt: NOW - 200 * DAY }),
    c('01711000005', 0),
    c('01711000006', -500),
    c('01711000007', 9000, { archived: true }),
  ]

  it('aging buckets count only active customers who owe', () => {
    expect(agingBuckets(list, NOW)).toEqual([
      { key: '0-30', count: 1, paisa: 1000 },
      { key: '31-60', count: 1, paisa: 2000 },
      { key: '61-90', count: 1, paisa: 3000 },
      { key: '90+', count: 1, paisa: 4000 },
    ])
  })

  it('top due and new customers', () => {
    expect(topDue(list, 2).map((x) => x.mobile)).toEqual(['01711000004', '01711000003'])
    expect(newCustomersIn(list, presetRange('week', NOW))).toBe(3) // created NOW − 1 day (3 of them, archived excluded)
  })
})

describe('reportCsv', () => {
  it('writes amounts in taka and quotes cells with commas', () => {
    const csv = reportCsv({
      title: 'Report',
      rangeText: '01/10/2026 – 22/10/2026',
      rows: [['Collected', 145000, true], ['Sales', 2, false]],
      buckets: [{ label: '0-30', count: 1, paisa: 1000 }],
      top: [{ name: 'Rahim, Uddin', mobile: '01711000001', paisa: 1000 }],
      headings: { bucket: 'Days', count: 'Customers', amount: 'Due', name: 'Name', mobile: 'Mobile', due: 'Due' },
    })
    expect(csv).toBe(
      'Report\n01/10/2026 – 22/10/2026\n\nCollected,1450.00\nSales,2\n\nDays,Customers,Due\n0-30,1,10.00\n\nName,Mobile,Due\n"Rahim, Uddin",01711000001,10.00\n',
    )
  })
})
