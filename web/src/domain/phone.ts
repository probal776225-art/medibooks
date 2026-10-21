import { toEnglishDigits } from './digits'

const BD_MOBILE = /^01[3-9]\d{8}$/

/**
 * Normalize a Bangladeshi mobile number to 01XXXXXXXXX.
 * Accepts 01…, +8801…, 8801…, 008801…, Bangla digits, spaces, dashes, dots, brackets.
 * Returns null when it is not a valid BD mobile.
 */
export function normalizeMobile(input: string): string | null {
  let s = toEnglishDigits(input).replace(/[\s\-().]/g, '')
  if (s.startsWith('+')) s = s.slice(1)
  if (s.startsWith('00')) s = s.slice(2)
  if (s.startsWith('880')) s = s.slice(2)
  return BD_MOBILE.test(s) ? s : null
}

export function isValidMobile(input: string): boolean {
  return normalizeMobile(input) !== null
}

/** 01711460114 → "01711-460114" for display. */
export function formatMobile(mobile: string): string {
  return BD_MOBILE.test(mobile) ? `${mobile.slice(0, 5)}-${mobile.slice(5)}` : mobile
}
