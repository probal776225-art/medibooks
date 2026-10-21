import { describe, expect, it } from 'vitest'
import { toBanglaDigits, toEnglishDigits } from './digits'
import { formatBp, formatMoney, parseMoney, parsePercentToBp, percentOf, roundToTaka, sumPaisa } from './money'

describe('digits', () => {
  it('converts both ways', () => {
    expect(toEnglishDigits('১,২৫০.৫০')).toBe('1,250.50')
    expect(toBanglaDigits('01711460114')).toBe('০১৭১১৪৬০১১৪')
  })
})

describe('parseMoney', () => {
  it.each([
    ['1250', 125000],
    ['1,250.50', 125050],
    ['1,250.5', 125050],
    ['0.05', 5],
    ['১,২৫০.৫০', 125050],
    ['৳ 1250', 125000],
    ['Tk 99', 9900],
    ['  12  ', 1200],
    ['1250.', 125000],
    ['1,25,000', 12500000],
  ])('%s → %i paisa', (input, expected) => {
    expect(parseMoney(input)).toBe(expected)
  })

  it.each(['', 'abc', '-5', '1.234', '1..2', '12a', '৳'])('rejects %j', (input) => {
    expect(parseMoney(input)).toBeNull()
  })

  it('rejects absurdly large amounts', () => {
    expect(parseMoney('999999999999')).toBeNull()
  })
})

describe('formatMoney', () => {
  it('formats with lakh grouping and hides .00', () => {
    expect(formatMoney(125050)).toBe('৳1,250.50')
    expect(formatMoney(12500000)).toBe('৳1,25,000')
    expect(formatMoney(123456789)).toBe('৳12,34,567.89')
    expect(formatMoney(0)).toBe('৳0')
    expect(formatMoney(5)).toBe('৳0.05')
  })

  it('supports bn digits, no symbol, always decimals, negatives', () => {
    expect(formatMoney(125050, { digits: 'bn' })).toBe('৳১,২৫০.৫০')
    expect(formatMoney(120000, { symbol: false, decimals: 'always' })).toBe('1,200.00')
    expect(formatMoney(-50000)).toBe('-৳500')
  })

  it('refuses floats', () => {
    expect(() => formatMoney(12.5)).toThrow()
  })
})

describe('percent', () => {
  it('parses percent to basis points', () => {
    expect(parsePercentToBp('10')).toBe(1000)
    expect(parsePercentToBp('12.5')).toBe(1250)
    expect(parsePercentToBp('৩৩.৩৩%')).toBe(3333)
    expect(parsePercentToBp('100')).toBe(10000)
    expect(parsePercentToBp('100.01')).toBeNull()
    expect(parsePercentToBp('-1')).toBeNull()
    expect(parsePercentToBp('1.234')).toBeNull()
  })

  it('formats basis points back', () => {
    expect(formatBp(1250)).toBe('12.5')
    expect(formatBp(1205)).toBe('12.05')
    expect(formatBp(1000, 'bn')).toBe('১০')
  })

  it('computes percent with half-up rounding to the paisa', () => {
    expect(percentOf(100000, 1000)).toBe(10000) // 10% of ৳1000
    expect(percentOf(10001, 3333)).toBe(3333) // 3333.3333 → 3333
    expect(percentOf(15, 1000)).toBe(2) // 1.5 → 2 (half up)
    expect(percentOf(14, 1000)).toBe(1) // 1.4 → 1
    expect(percentOf(0, 5000)).toBe(0)
    expect(percentOf(99999, 10000)).toBe(99999)
    expect(() => percentOf(100, 10001)).toThrow()
    expect(() => percentOf(100, 12.5)).toThrow()
  })
})

describe('roundToTaka', () => {
  it.each([
    [125049, 125000, -49],
    [125050, 125100, 50],
    [125000, 125000, 0],
    [99, 100, 1],
    [49, 0, -49],
  ])('%i → %i (roundOff %i)', (amount, rounded, roundOff) => {
    expect(roundToTaka(amount)).toEqual({ rounded, roundOff })
  })
})

describe('sumPaisa', () => {
  it('sums integers and rejects floats', () => {
    expect(sumPaisa([100, 250, -50])).toBe(300)
    expect(() => sumPaisa([1, 0.5])).toThrow()
  })
})
