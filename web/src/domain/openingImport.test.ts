import Papa from 'papaparse'
import { describe, expect, it } from 'vitest'
import { parseDateDMY } from './dates'
import { checkOpeningRows, OPENING_TEMPLATE_CSV, openingRowsFromCsv, type OpeningInputRow } from './openingImport'

// 2026-10-22 12:00 Dhaka
const NOW = Date.UTC(2026, 9, 22, 6, 0, 0)

const row = (line: number, over: Partial<OpeningInputRow>): OpeningInputRow => ({
  line,
  name: 'রহিম',
  mobile: '01711000001',
  address: '',
  amount: '1250',
  asOf: '',
  note: '',
  ...over,
})

describe('parseDateDMY', () => {
  it('reads Dhaka calendar dates in several spellings', () => {
    const d = parseDateDMY('15/10/2026')
    expect(d).toBe(Date.UTC(2026, 9, 14, 18, 0)) // 00:00 Dhaka
    expect(parseDateDMY('15-10-2026')).toBe(d)
    expect(parseDateDMY('১৫.১০.২০২৬')).toBe(d)
    expect(parseDateDMY('1/2/2026')).toBe(Date.UTC(2026, 0, 31, 18, 0))
    expect(parseDateDMY('31/02/2026')).toBeNull()
    expect(parseDateDMY('2026-10-15')).toBeNull()
    expect(parseDateDMY('')).toBeNull()
  })
})

describe('checkOpeningRows', () => {
  it('accepts good rows and totals them', () => {
    const r = checkOpeningRows(
      [row(2, {}), row(3, { mobile: '+880 1811-000002', amount: '৫০০.৫০', asOf: '01/09/2026' })],
      new Set(),
      NOW,
    )
    expect(r.issueCount).toBe(0)
    expect(r.totalPaisa).toBe(125000 + 50050)
    expect(r.okRows[1]).toMatchObject({ mobileNorm: '01811000002', amountPaisa: 50050, asOfMs: Date.UTC(2026, 7, 31, 18, 0) })
    expect(r.newCount).toBe(2)
  })

  it('flags bad mobile, missing name for new customers, bad amount, bad/future date, duplicates', () => {
    const r = checkOpeningRows(
      [
        row(2, { mobile: '12345' }),
        row(3, { mobile: '01711000003', name: ' ' }),
        row(4, { mobile: '01711000004', amount: '0' }),
        row(5, { mobile: '01711000005', amount: 'abc' }),
        row(6, { mobile: '01711000006', asOf: '30/02/2026' }),
        row(7, { mobile: '01711000007', asOf: '25/10/2026' }),
        row(8, { mobile: '01711000008' }),
        row(9, { mobile: '01711000008' }),
      ],
      new Set(),
      NOW,
    )
    expect(r.rows.map((x) => x.issues)).toEqual([
      ['mobile'],
      ['name'],
      ['amount'],
      ['amount'],
      ['date'],
      ['date'],
      [],
      ['duplicate'],
    ])
    expect(r.okRows.map((x) => x.line)).toEqual([8])
  })

  it('existing customers need no name and are counted separately; blank rows are ignored', () => {
    const r = checkOpeningRows(
      [row(2, { name: '', mobile: '01711000009' }), row(3, { name: '', mobile: '', amount: '' })],
      new Set(['01711000009']),
      NOW,
    )
    expect(r.rows).toHaveLength(1)
    expect(r.existingCount).toBe(1)
    expect(r.newCount).toBe(0)
  })

  it('reads the downloadable template back without problems', () => {
    const parsed = Papa.parse<Record<string, string>>(OPENING_TEMPLATE_CSV, { header: true, skipEmptyLines: true })
    const rows = openingRowsFromCsv(parsed.data)
    expect(rows[0]).toMatchObject({ line: 2, name: 'রহিম উদ্দিন', address: 'Station Road, Sreemangal', amount: '1250' })
    expect(checkOpeningRows(rows, new Set(), NOW).issueCount).toBe(0)
  })

  it('matches headers loosely', () => {
    const rows = openingRowsFromCsv([{ ' Name ': 'A', MOBILE: '01711000010', 'Opening Due': '10', 'as of date': '' }])
    expect(rows[0]).toMatchObject({ name: 'A', mobile: '01711000010', amount: '10' })
  })
})
