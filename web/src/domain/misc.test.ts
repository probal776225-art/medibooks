import { describe, expect, it } from 'vitest'
import { calendarDaysBetween, dhakaDayRange, formatDate, formatDateTime, monthKey, yymmdd } from './dates'
import { getOrCreateDeviceId, makeMemoNo, randomCode } from './ids'
import { formatMobile, isValidMobile, normalizeMobile } from './phone'
import { DEFAULT_SMS_TEMPLATES, renderTemplate, smsSegments } from './sms'

describe('phone', () => {
  it.each([
    ['01711460114', '01711460114'],
    ['+8801711460114', '01711460114'],
    ['8801711460114', '01711460114'],
    ['008801711460114', '01711460114'],
    ['+880 1711-460114', '01711460114'],
    ['০১৭১১৪৬০১১৪', '01711460114'],
    ['(017) 11.46.01.14', '01711460114'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeMobile(input)).toBe(expected)
  })

  it.each(['0171146011', '017114601145', '01211460114', '1711460114', '+9101711460114', 'abc'])('rejects %s', (input) => {
    expect(isValidMobile(input)).toBe(false)
  })

  it('formats for display', () => {
    expect(formatMobile('01711460114')).toBe('01711-460114')
  })
})

describe('dates (Asia/Dhaka)', () => {
  // 2026-10-21 19:30 UTC = 2026-10-22 01:30 Dhaka
  const lateNightUtc = Date.UTC(2026, 9, 21, 19, 30)

  it('uses the Dhaka calendar day regardless of device timezone', () => {
    expect(yymmdd(lateNightUtc)).toBe('261022')
    expect(formatDate(lateNightUtc)).toBe('22/10/2026')
    expect(formatDate(lateNightUtc, 'bn')).toBe('২২/১০/২০২৬')
    expect(formatDateTime(lateNightUtc)).toBe('22/10/2026 1:30 AM')
    expect(monthKey(lateNightUtc)).toBe('2026-10')
  })

  it('gives [start, end) of the Dhaka day', () => {
    const { start, end } = dhakaDayRange(lateNightUtc)
    expect(start).toBe(Date.UTC(2026, 9, 21, 18, 0)) // 00:00 Dhaka = 18:00 UTC previous day
    expect(end - start).toBe(86_400_000)
  })

  it('counts calendar days, not 24h blocks', () => {
    const a = Date.UTC(2026, 9, 21, 17, 59) // 23:59 Dhaka on 21st
    const b = Date.UTC(2026, 9, 21, 18, 1) // 00:01 Dhaka on 22nd
    expect(calendarDaysBetween(a, b)).toBe(1)
  })
})

describe('ids', () => {
  const fixedRng = (n: number) => Uint8Array.from({ length: n }, (_, i) => i)

  it('makes memo numbers by type and Dhaka date', () => {
    const t = Date.UTC(2026, 9, 21, 19, 30)
    expect(makeMemoNo('sale', t, fixedRng)).toBe('B-261022-2345')
    expect(makeMemoNo('payment', t)).toMatch(/^J-261022-[2-9A-HJ-NP-Z]{4}$/)
  })

  it('random codes avoid look-alike characters', () => {
    expect(randomCode(200)).toMatch(/^[2-9A-HJ-NP-Z]{200}$/)
  })

  it('keeps one device id per browser', () => {
    const store = new Map<string, string>()
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) }
    const first = getOrCreateDeviceId(storage)
    expect(first).toMatch(/^D-[2-9A-HJ-NP-Z]{10}$/)
    expect(getOrCreateDeviceId(storage)).toBe(first)
  })
})

describe('sms', () => {
  it('renders templates and leaves unknown placeholders', () => {
    expect(renderTemplate(DEFAULT_SMS_TEMPLATES.payment, { name: 'রহিম', amount: '৫০০', total: '১,২০০', shop: 'অ্যালোপ্যাথিক স্টোর' })).toBe(
      'রহিম, ৳৫০০ জমা পেয়েছি, ধন্যবাদ। বাকি আছে ৳১,২০০। -অ্যালোপ্যাথিক স্টোর',
    )
    expect(renderTemplate('{name} {unknown}', { name: 'A' })).toBe('A {unknown}')
  })

  it('counts GSM-7 segments (160 / 153, extension chars cost 2)', () => {
    expect(smsSegments('')).toMatchObject({ encoding: 'gsm7', segments: 0 })
    expect(smsSegments('a'.repeat(160))).toMatchObject({ encoding: 'gsm7', units: 160, segments: 1 })
    expect(smsSegments('a'.repeat(161))).toMatchObject({ segments: 2, perSegment: 153 })
    expect(smsSegments('{}')).toMatchObject({ encoding: 'gsm7', units: 4 })
  })

  it('counts Unicode segments (70 / 67) for Bangla', () => {
    expect(smsSegments('ক'.repeat(70))).toMatchObject({ encoding: 'unicode', units: 70, segments: 1 })
    expect(smsSegments('ক'.repeat(71))).toMatchObject({ segments: 2, perSegment: 67 })
    expect(smsSegments('ক'.repeat(135))).toMatchObject({ segments: 3 })
    expect(smsSegments('Tk ৳500')).toMatchObject({ encoding: 'unicode' })
  })
})
