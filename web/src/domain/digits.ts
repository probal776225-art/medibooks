import type { DigitStyle } from './types'

const BN_DIGITS = '০১২৩৪৫৬৭৮৯'

/** Replace Bangla digits with ASCII digits; everything else unchanged. */
export function toEnglishDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)))
}

/** Replace ASCII digits with Bangla digits; everything else unchanged. */
export function toBanglaDigits(input: string): string {
  return input.replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)] ?? d)
}

export function withDigits(input: string, style: DigitStyle): string {
  return style === 'bn' ? toBanglaDigits(input) : input
}
