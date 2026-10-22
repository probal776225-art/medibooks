// চালু বাকি ইমপোর্ট (SPEC §7): due carried over from the paper khata, from a CSV file or the quick grid.
// Everything is checked here first; the preview shows each row's problems before anything is written.
import { dhakaDayRange, parseDateDMY } from './dates'
import { parseMoney } from './money'
import { normalizeMobile } from './phone'
import type { Millis, Paisa } from './types'

export interface OpeningInputRow {
  /** Line number in the file (header = 1) or row number in the grid. */
  line: number
  name: string
  mobile: string
  address: string
  amount: string
  /** DD/MM/YYYY, optional. */
  asOf: string
  note: string
}

export type OpeningIssue = 'mobile' | 'name' | 'amount' | 'date' | 'duplicate'

export interface OpeningCheckedRow extends OpeningInputRow {
  mobileNorm: string | null
  amountPaisa: Paisa | null
  asOfMs: Millis | null
  /** Customer already in the shop. */
  existing: boolean
  issues: OpeningIssue[]
}

export interface OpeningCheck {
  rows: OpeningCheckedRow[]
  okRows: OpeningCheckedRow[]
  totalPaisa: Paisa
  newCount: number
  existingCount: number
  issueCount: number
}

export const OPENING_COLUMNS = ['name', 'mobile', 'address', 'opening_due', 'as_of_date', 'note'] as const

export const OPENING_TEMPLATE_CSV =
  `${OPENING_COLUMNS.join(',')}\n` +
  'রহিম উদ্দিন,01711000000,"Station Road, Sreemangal",1250,15/10/2026,পুরনো খাতা পৃষ্ঠা ১২\n'

/** CSV rows (PapaParse with header: true) → input rows. Header names are matched loosely. */
export function openingRowsFromCsv(records: readonly Record<string, string>[]): OpeningInputRow[] {
  const key = (r: Record<string, string>, name: string) => {
    for (const [k, v] of Object.entries(r)) if (k.trim().toLowerCase().replace(/\s+/g, '_') === name) return (v ?? '').trim()
    return ''
  }
  return records.map((r, i) => ({
    line: i + 2,
    name: key(r, 'name'),
    mobile: key(r, 'mobile'),
    address: key(r, 'address'),
    amount: key(r, 'opening_due'),
    asOf: key(r, 'as_of_date'),
    note: key(r, 'note'),
  }))
}

export function isBlankRow(r: OpeningInputRow): boolean {
  return ![r.name, r.mobile, r.address, r.amount, r.asOf, r.note].some((v) => v.trim())
}

export function checkOpeningRows(
  input: readonly OpeningInputRow[],
  existing: ReadonlySet<string>,
  now: Millis,
): OpeningCheck {
  const endOfToday = dhakaDayRange(now).end
  const seen = new Set<string>()
  const rows: OpeningCheckedRow[] = []
  for (const r of input) {
    if (isBlankRow(r)) continue
    const issues: OpeningIssue[] = []
    const mobileNorm = normalizeMobile(r.mobile)
    if (!mobileNorm) issues.push('mobile')
    const isExisting = mobileNorm !== null && existing.has(mobileNorm)
    if (!isExisting && !r.name.trim()) issues.push('name')
    const amountPaisa = parseMoney(r.amount)
    if (amountPaisa === null || amountPaisa <= 0) issues.push('amount')
    let asOfMs: Millis | null = null
    if (r.asOf.trim()) {
      asOfMs = parseDateDMY(r.asOf)
      if (asOfMs === null || asOfMs >= endOfToday) issues.push('date')
    }
    if (mobileNorm) {
      if (seen.has(mobileNorm)) issues.push('duplicate')
      seen.add(mobileNorm)
    }
    rows.push({ ...r, mobileNorm, amountPaisa: amountPaisa && amountPaisa > 0 ? amountPaisa : null, asOfMs, existing: isExisting, issues })
  }
  const okRows = rows.filter((r) => r.issues.length === 0)
  return {
    rows,
    okRows,
    totalPaisa: okRows.reduce((s, r) => s + (r.amountPaisa ?? 0), 0),
    newCount: okRows.filter((r) => !r.existing).length,
    existingCount: okRows.filter((r) => r.existing).length,
    issueCount: rows.length - okRows.length,
  }
}
