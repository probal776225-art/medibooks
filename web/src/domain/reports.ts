// Dashboard + reports (SPEC §2, §10). All numbers come from transactions in a Dhaka date range
// (one query per range) and from the in-memory customer list; nothing is stored.
import { customerAging } from './customers'
import { dhakaDayRange, dhakaMonthRange, inDhaka, parseDateDMY } from './dates'
import { PAYMENT_METHODS, type Customer, type Millis, type Paisa, type PaymentMethod, type Transaction } from './types'

export interface DateRange {
  /** inclusive */
  start: Millis
  /** exclusive */
  end: Millis
}

export type RangePreset = 'today' | 'week' | 'month'

/** Week = Saturday to Friday, as on Bangladeshi calendars. */
export function presetRange(preset: RangePreset, now: Millis): DateRange {
  if (preset === 'today') return dhakaDayRange(now)
  if (preset === 'month') return dhakaMonthRange(now)
  const day = inDhaka(now).startOf('day')
  const sinceSaturday = (day.day() + 1) % 7 // dayjs: Sunday = 0 … Saturday = 6
  const start = day.subtract(sinceSaturday, 'day')
  return { start: start.valueOf(), end: start.add(7, 'day').valueOf() }
}

/** From two "YYYY-MM-DD" values (date inputs), both days included. Null if invalid or reversed. */
export function customRange(fromIso: string, toIso: string): DateRange | null {
  const toDMY = (iso: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
    return m ? parseDateDMY(`${m[3]}/${m[2]}/${m[1]}`) : null
  }
  const start = toDMY(fromIso)
  const lastDay = toDMY(toIso)
  if (start === null || lastDay === null || lastDay < start) return null
  return { start, end: dhakaDayRange(lastDay).end }
}

export interface ReportSummary {
  saleCount: number
  /** Σ bill totals (net) of sales. */
  salesNetPaisa: Paisa
  /** বাকি দেওয়া: Σ (net − paid now) of sales. */
  bakiGivenPaisa: Paisa
  /** Bill discounts + line discounts. */
  discountPaisa: Paisa
  paymentCount: number
  /** মোট জমা: payments + money paid now on bills. */
  collectedPaisa: Paisa
  collectedByMethod: Record<PaymentMethod, Paisa>
  openingCount: number
  openingPaisa: Paisa
  adjustmentCount: number
  /** Signed. */
  adjustmentPaisa: Paisa
  voidedCount: number
  /** Σ effect: how much the market due moved in this range. */
  netChangePaisa: Paisa
}

type ReportTxn = Pick<
  Transaction,
  'type' | 'netPaisa' | 'paidNowPaisa' | 'paymentMethod' | 'effectPaisa' | 'billDiscountPaisa' | 'lines' | 'voided'
>

export function summarize(txns: readonly ReportTxn[]): ReportSummary {
  const byMethod = Object.fromEntries(PAYMENT_METHODS.map((m) => [m, 0])) as Record<PaymentMethod, Paisa>
  const s: ReportSummary = {
    saleCount: 0,
    salesNetPaisa: 0,
    bakiGivenPaisa: 0,
    discountPaisa: 0,
    paymentCount: 0,
    collectedPaisa: 0,
    collectedByMethod: byMethod,
    openingCount: 0,
    openingPaisa: 0,
    adjustmentCount: 0,
    adjustmentPaisa: 0,
    voidedCount: 0,
    netChangePaisa: 0,
  }
  for (const t of txns) {
    if (t.voided) {
      s.voidedCount++
      continue
    }
    s.netChangePaisa += t.effectPaisa
    if (t.paidNowPaisa > 0 && (t.type === 'sale' || t.type === 'payment')) {
      s.collectedPaisa += t.paidNowPaisa
      byMethod[t.paymentMethod ?? 'cash'] += t.paidNowPaisa
    }
    switch (t.type) {
      case 'sale':
        s.saleCount++
        s.salesNetPaisa += t.netPaisa
        s.bakiGivenPaisa += t.effectPaisa
        s.discountPaisa += t.billDiscountPaisa + t.lines.reduce((a, l) => a + l.discountPaisa, 0)
        break
      case 'payment':
        s.paymentCount++
        break
      case 'opening':
        s.openingCount++
        s.openingPaisa += t.effectPaisa
        break
      case 'adjustment':
        s.adjustmentCount++
        s.adjustmentPaisa += t.effectPaisa
        break
    }
  }
  return s
}

export interface AgingBucket {
  key: '0-30' | '31-60' | '61-90' | '90+'
  count: number
  paisa: Paisa
}

/** Customers who owe money, grouped by days since their last payment (or since they were added). */
export function agingBuckets(customers: readonly Customer[], now: Millis): AgingBucket[] {
  const buckets: AgingBucket[] = [
    { key: '0-30', count: 0, paisa: 0 },
    { key: '31-60', count: 0, paisa: 0 },
    { key: '61-90', count: 0, paisa: 0 },
    { key: '90+', count: 0, paisa: 0 },
  ]
  for (const c of customers) {
    if (c.archived || c.totalDuePaisa <= 0) continue
    const days = customerAging(c, now).days ?? 0
    const b = buckets[days <= 30 ? 0 : days <= 60 ? 1 : days <= 90 ? 2 : 3]!
    b.count++
    b.paisa += c.totalDuePaisa
  }
  return buckets
}

export function topDue(customers: readonly Customer[], n = 10): Customer[] {
  return customers
    .filter((c) => !c.archived && c.totalDuePaisa > 0)
    .sort((a, b) => b.totalDuePaisa - a.totalDuePaisa)
    .slice(0, n)
}

export function newCustomersIn(customers: readonly Customer[], range: DateRange): number {
  return customers.filter((c) => !c.archived && c.createdAt >= range.start && c.createdAt < range.end).length
}

const csvCell = (v: string | number) => {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const taka = (p: Paisa) => (p / 100).toFixed(2)

/** Plain CSV of the report (amounts in taka with 2 decimals, English digits for spreadsheets). */
export function reportCsv(opts: {
  title: string
  rangeText: string
  rows: [label: string, value: Paisa | number, isMoney: boolean][]
  buckets: { label: string; count: number; paisa: Paisa }[]
  top: { name: string; mobile: string; paisa: Paisa }[]
  headings: { bucket: string; count: string; amount: string; name: string; mobile: string; due: string }
}): string {
  const lines: (string | number)[][] = [[opts.title], [opts.rangeText], []]
  for (const [label, value, isMoney] of opts.rows) lines.push([label, isMoney ? taka(value) : value])
  lines.push([], [opts.headings.bucket, opts.headings.count, opts.headings.amount])
  for (const b of opts.buckets) lines.push([b.label, b.count, taka(b.paisa)])
  lines.push([], [opts.headings.name, opts.headings.mobile, opts.headings.due])
  for (const c of opts.top) lines.push([c.name, c.mobile, taka(c.paisa)])
  return `${lines.map((l) => l.map(csvCell).join(',')).join('\n')}\n`
}
