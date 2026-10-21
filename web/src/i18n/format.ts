import { useMemo } from 'react'
import { formatDate, formatDateTime, formatTime } from '../domain/dates'
import { withDigits } from '../domain/digits'
import { DomainError } from '../domain/errors'
import { formatMoney, groupLakh } from '../domain/money'
import { formatMobile } from '../domain/phone'
import type { Millis, Paisa } from '../domain/types'
import { useUiStore } from '../stores/ui'
import { bn, type MessageKey } from './bn'

/** Display formatting in the user's digit style. Mobile numbers stay in English digits (easier to check and dial). */
export function useFormat() {
  const digits = useUiStore((s) => s.digits)
  return useMemo(
    () => ({
      money: (p: Paisa) => formatMoney(p, { digits }),
      date: (ms: Millis) => formatDate(ms, digits),
      time: (ms: Millis) => formatTime(ms, digits),
      dateTime: (ms: Millis) => formatDateTime(ms, digits),
      /** Integers get South-Asian grouping: 26506 → ২৬,৫০৬ */
      num: (n: number) => withDigits(Number.isInteger(n) && n >= 0 ? groupLakh(String(n)) : String(n), digits),
      mobile: (m: string) => formatMobile(m),
    }),
    [digits],
  )
}

/** i18n key for an error thrown by the domain layer. */
export function errorKey(e: unknown): MessageKey {
  if (e instanceof DomainError) {
    const key = `error.${e.code}`
    if (key in bn) return key as MessageKey
  }
  return 'error.generic'
}
