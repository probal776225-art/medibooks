// All "today", report, memo and reminder dates use Asia/Dhaka, whatever the device timezone is.
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { withDigits } from './digits'
import type { DigitStyle, Millis } from './types'

dayjs.extend(utc)
dayjs.extend(timezone)

export const DHAKA_TZ = 'Asia/Dhaka'

export function inDhaka(ms: Millis): dayjs.Dayjs {
  return dayjs(ms).tz(DHAKA_TZ)
}

/** [start, end) of the Dhaka calendar day containing `ms`. */
export function dhakaDayRange(ms: Millis): { start: Millis; end: Millis } {
  const start = inDhaka(ms).startOf('day')
  return { start: start.valueOf(), end: start.add(1, 'day').valueOf() }
}

/** [start, end) of the Dhaka calendar month containing `ms`. */
export function dhakaMonthRange(ms: Millis): { start: Millis; end: Millis } {
  const start = inDhaka(ms).startOf('month')
  return { start: start.valueOf(), end: start.add(1, 'month').valueOf() }
}

/** 'YYYY-MM' in Dhaka time (reminder monthly counter). */
export function monthKey(ms: Millis): string {
  return inDhaka(ms).format('YYYY-MM')
}

/** 'YYMMDD' in Dhaka time (memo numbers). */
export function yymmdd(ms: Millis): string {
  return inDhaka(ms).format('YYMMDD')
}

/** Hour of day 0–23 in Dhaka (reminder send hour). */
export function dhakaHour(ms: Millis): number {
  return inDhaka(ms).hour()
}

/** Whole Dhaka calendar days from `from` to `to` (same day = 0). */
export function calendarDaysBetween(from: Millis, to: Millis): number {
  return inDhaka(to).startOf('day').diff(inDhaka(from).startOf('day'), 'day')
}

/** "22/10/2026" */
export function formatDate(ms: Millis, digits: DigitStyle = 'en'): string {
  return withDigits(inDhaka(ms).format('DD/MM/YYYY'), digits)
}

/** "10:30 AM" */
export function formatTime(ms: Millis, digits: DigitStyle = 'en'): string {
  return withDigits(inDhaka(ms).format('h:mm A'), digits)
}

/** "22/10/2026 10:30 AM" */
export function formatDateTime(ms: Millis, digits: DigitStyle = 'en'): string {
  return withDigits(inDhaka(ms).format('DD/MM/YYYY h:mm A'), digits)
}
