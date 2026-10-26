// Due reminders (তাগাদা, SPEC §9). One eligibility rule for the app's তাগাদা page and the Worker's daily job.
import { dhakaDate, dhakaHour, monthKey } from './dates'
import type { ShopSettings } from './settings'
import type { Customer, Millis } from './types'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
/** "Every 2 days" still matches when today's run starts a little earlier than last time. */
const INTERVAL_TOLERANCE = 2 * HOUR
/** The automatic job never starts this late (Dhaka hour), so nobody gets an SMS at night. */
export const REMINDER_LAST_HOUR = 21

export type ReminderRules = ShopSettings['reminder']

export type ReminderCustomer = Pick<
  Customer,
  | 'mobile'
  | 'name'
  | 'totalDuePaisa'
  | 'smsEnabled'
  | 'reminderEnabled'
  | 'archived'
  | 'lastPaymentAt'
  | 'lastReminderAt'
  | 'reminderMonth'
  | 'reminderCountThisMonth'
>

/** Why a customer gets no reminder today (null = they do). */
export type ReminderBlock =
  | 'archived'
  | 'smsOff'
  | 'reminderOff'
  | 'belowThreshold'
  | 'tooSoon'
  | 'recentlyPaid'
  | 'monthlyLimit'

export function remindersThisMonth(c: Pick<Customer, 'reminderMonth' | 'reminderCountThisMonth'>, now: Millis): number {
  return c.reminderMonth === monthKey(now) ? c.reminderCountThisMonth : 0
}

export function reminderBlock(c: ReminderCustomer, r: ReminderRules, now: Millis): ReminderBlock | null {
  if (c.archived) return 'archived'
  if (!c.smsEnabled) return 'smsOff'
  if (!c.reminderEnabled) return 'reminderOff'
  if (c.totalDuePaisa < r.thresholdPaisa || c.totalDuePaisa <= 0) return 'belowThreshold'
  if (c.lastReminderAt !== null && now - c.lastReminderAt < r.intervalDays * DAY - INTERVAL_TOLERANCE) return 'tooSoon'
  if (r.skipIfPaidWithinDays > 0 && c.lastPaymentAt !== null && now - c.lastPaymentAt < r.skipIfPaidWithinDays * DAY) {
    return 'recentlyPaid'
  }
  if (remindersThisMonth(c, now) >= r.maxPerMonth) return 'monthlyLimit'
  return null
}

/** Today's list, biggest due first. */
export function dueForReminder<T extends ReminderCustomer>(list: readonly T[], r: ReminderRules, now: Millis): T[] {
  return list.filter((c) => reminderBlock(c, r, now) === null).sort((a, b) => b.totalDuePaisa - a.totalDuePaisa)
}

/** Customer fields written together with a reminder SMS. */
export function afterReminder(
  c: Pick<Customer, 'reminderMonth' | 'reminderCountThisMonth'>,
  now: Millis,
): { lastReminderAt: Millis; reminderMonth: string; reminderCountThisMonth: number } {
  return { lastReminderAt: now, reminderMonth: monthKey(now), reminderCountThisMonth: remindersThisMonth(c, now) + 1 }
}

/**
 * Should the automatic job run now? Once per Dhaka day, from `sendHour` until 9 pm
 * (a cron run that was missed at 10:00 still happens later that day). Needs SMS and reminders both on.
 */
export function reminderJobDue(
  s: { sms: { enabled: boolean }; reminder: ReminderRules },
  now: Millis,
): { due: boolean; today: string } {
  const today = dhakaDate(now)
  const hour = dhakaHour(now)
  const due =
    s.sms.enabled &&
    s.reminder.enabled &&
    s.reminder.lastRunDate !== today &&
    hour >= s.reminder.sendHour &&
    hour < REMINDER_LAST_HOUR
  return { due, today }
}
