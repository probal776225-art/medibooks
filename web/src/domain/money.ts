// Money helpers. All amounts are integer paisa (৳1 = 100); no floats are stored or summed.
import { toEnglishDigits, withDigits } from './digits'
import type { DigitStyle, Paisa } from './types'

/** Largest amount we accept anywhere (৳10 crore) — far above any shop bill, far below float limits. */
export const MAX_PAISA: Paisa = 10_000_000_000

export function isPaisa(n: unknown): n is Paisa {
  return typeof n === 'number' && Number.isSafeInteger(n)
}

export function assertPaisa(n: number, label = 'amount'): void {
  if (!Number.isSafeInteger(n)) throw new RangeError(`${label} must be integer paisa, got ${n}`)
}

/**
 * Parse what the user typed into paisa.
 * Accepts "1250", "1,250.50", "১,২৫০.৫", "৳ 1250", "Tk 1250". Max 2 decimals, no negatives.
 * Returns null when the input is not a valid amount.
 */
export function parseMoney(input: string): Paisa | null {
  const s = toEnglishDigits(input)
    .trim()
    .replace(/^(৳|tk\.?|taka)\s*/i, '')
    .replace(/[,\s]/g, '')
  const m = /^(\d+)(?:\.(\d{0,2}))?$/.exec(s)
  if (!m) return null
  const taka = Number(m[1])
  const frac = (m[2] ?? '').padEnd(2, '0')
  const paisa = taka * 100 + Number(frac)
  return Number.isSafeInteger(paisa) && paisa <= MAX_PAISA ? paisa : null
}

/** Group digits South-Asian style: 1,25,000 */
export function groupLakh(intPart: string): string {
  if (intPart.length <= 3) return intPart
  const last3 = intPart.slice(-3)
  const rest = intPart.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')
  return `${rest},${last3}`
}

export interface FormatMoneyOptions {
  digits?: DigitStyle
  /** Prefix with ৳ (default true). */
  symbol?: boolean
  /** 'auto' hides ".00" (default); 'always' shows two decimals. */
  decimals?: 'auto' | 'always'
}

/** 125050 → "৳1,250.50"; 12500000 → "৳1,25,000". Negative values get a leading minus. */
export function formatMoney(paisa: Paisa, opts: FormatMoneyOptions = {}): string {
  assertPaisa(paisa)
  const { digits = 'en', symbol = true, decimals = 'auto' } = opts
  const abs = Math.abs(paisa)
  const intPart = groupLakh(String(Math.floor(abs / 100)))
  const fracNum = abs % 100
  const frac = decimals === 'always' || fracNum !== 0 ? `.${String(fracNum).padStart(2, '0')}` : ''
  const text = `${paisa < 0 ? '-' : ''}${symbol ? '৳' : ''}${intPart}${frac}`
  return withDigits(text, digits)
}

/** Round-half-up integer division for non-negative numerator. */
function divRoundHalfUp(numerator: number, denominator: number): number {
  return Math.floor((numerator + Math.floor(denominator / 2)) / denominator)
}

/** Percent of an amount, percent given in basis points (12.5% = 1250). Rounds half up to the paisa. */
export function percentOf(amount: Paisa, bp: number): Paisa {
  assertPaisa(amount)
  if (amount < 0) throw new RangeError('percentOf expects a non-negative amount')
  if (!Number.isInteger(bp) || bp < 0 || bp > 10_000) throw new RangeError(`basis points out of range: ${bp}`)
  return divRoundHalfUp(amount * bp, 10_000)
}

/** Parse "12.5" / "১০" / "10%" into basis points (0–10000), max 2 decimals. */
export function parsePercentToBp(input: string): number | null {
  const s = toEnglishDigits(input).trim().replace(/%$/, '').trim()
  const m = /^(\d{1,3})(?:\.(\d{0,2}))?$/.exec(s)
  if (!m) return null
  const bp = Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'))
  return bp <= 10_000 ? bp : null
}

/** 1250 bp → "12.5" (for showing a stored percent back to the user). */
export function formatBp(bp: number, digits: DigitStyle = 'en'): string {
  const whole = Math.floor(bp / 100)
  const frac = bp % 100
  const text = frac === 0 ? String(whole) : `${whole}.${String(frac).padStart(2, '0').replace(/0$/, '')}`
  return withDigits(text, digits)
}

/**
 * Round to the nearest whole taka, half up (x.50 → up).
 * roundOff = rounded − amount, always in −49…+50 paisa.
 */
export function roundToTaka(amount: Paisa): { rounded: Paisa; roundOff: Paisa } {
  assertPaisa(amount)
  if (amount < 0) throw new RangeError('roundToTaka expects a non-negative amount')
  const rounded = divRoundHalfUp(amount, 100) * 100
  return { rounded, roundOff: rounded - amount }
}

export function sumPaisa(values: readonly Paisa[]): Paisa {
  let total = 0
  for (const v of values) {
    assertPaisa(v)
    total += v
  }
  return total
}
