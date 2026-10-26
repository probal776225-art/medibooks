import type { MessageKey } from '../../i18n'

/** 10 → "সকাল ১০টা" / "10 AM" (the caller formats the digits). */
export function hourLabel(hour: number): { key: MessageKey; h: number } {
  const h = hour % 12 === 0 ? 12 : hour % 12
  if (hour < 12) return { key: 'hour.morning', h }
  if (hour < 16) return { key: 'hour.noon', h }
  if (hour < 18) return { key: 'hour.afternoon', h }
  return { key: 'hour.evening', h }
}
