import { describe, expect, it } from 'vitest'
import { makeCustomer } from './fixtures'
import { afterReminder, dueForReminder, reminderBlock, reminderJobDue, remindersThisMonth } from './reminders'
import { DEFAULT_SETTINGS } from './settings'

const HOUR = 3600_000
const DAY = 24 * HOUR
const NOW = Date.UTC(2026, 9, 26, 4, 30) // 26/10/2026 10:30 Dhaka
const rules = DEFAULT_SETTINGS.reminder // ৳5,000, every 2 days, 15 a month, skip if paid within 2 days
const big = (o = {}) => makeCustomer({ totalDuePaisa: 600_000, ...o })

describe('reminder eligibility (SPEC §9)', () => {
  it('a ৳6,000 customer who was never reminded gets one', () => {
    expect(reminderBlock(big(), rules, NOW)).toBeNull()
  })

  it('needs at least the threshold', () => {
    expect(reminderBlock(big({ totalDuePaisa: 499_999 }), rules, NOW)).toBe('belowThreshold')
    expect(reminderBlock(big({ totalDuePaisa: 500_000 }), rules, NOW)).toBeNull()
    expect(reminderBlock(big({ totalDuePaisa: 0 }), { ...rules, thresholdPaisa: 0 }, NOW)).toBe('belowThreshold')
  })

  it('respects the customer switches and archive', () => {
    expect(reminderBlock(big({ smsEnabled: false }), rules, NOW)).toBe('smsOff')
    expect(reminderBlock(big({ reminderEnabled: false }), rules, NOW)).toBe('reminderOff')
    expect(reminderBlock(big({ archived: true }), rules, NOW)).toBe('archived')
  })

  it('waits intervalDays, with 2 hours of slack', () => {
    expect(reminderBlock(big({ lastReminderAt: NOW - DAY }), rules, NOW)).toBe('tooSoon')
    expect(reminderBlock(big({ lastReminderAt: NOW - 2 * DAY + 3 * HOUR }), rules, NOW)).toBe('tooSoon')
    expect(reminderBlock(big({ lastReminderAt: NOW - 2 * DAY + HOUR }), rules, NOW)).toBeNull()
    expect(reminderBlock(big({ lastReminderAt: NOW - DAY + HOUR }), { ...rules, intervalDays: 1 }, NOW)).toBeNull()
  })

  it('skips anyone who paid recently', () => {
    expect(reminderBlock(big({ lastPaymentAt: NOW - DAY }), rules, NOW)).toBe('recentlyPaid')
    expect(reminderBlock(big({ lastPaymentAt: NOW - 2 * DAY }), rules, NOW)).toBeNull()
    expect(reminderBlock(big({ lastPaymentAt: NOW - HOUR }), { ...rules, skipIfPaidWithinDays: 0 }, NOW)).toBeNull()
  })

  it('stops at the monthly limit; a new month starts from zero', () => {
    expect(reminderBlock(big({ reminderMonth: '2026-10', reminderCountThisMonth: 15 }), rules, NOW)).toBe('monthlyLimit')
    expect(reminderBlock(big({ reminderMonth: '2026-09', reminderCountThisMonth: 15 }), rules, NOW)).toBeNull()
    expect(remindersThisMonth({ reminderMonth: '2026-09', reminderCountThisMonth: 4 }, NOW)).toBe(0)
  })

  it('lists today’s customers biggest due first', () => {
    const list = [big({ mobile: '01711000001' }), big({ mobile: '01711000002', totalDuePaisa: 900_000 }), big({ mobile: '01711000003', smsEnabled: false })]
    expect(dueForReminder(list, rules, NOW).map((c) => c.mobile)).toEqual(['01711000002', '01711000001'])
  })

  it('counts the reminder in the month', () => {
    expect(afterReminder({ reminderMonth: '2026-10', reminderCountThisMonth: 2 }, NOW)).toEqual({
      lastReminderAt: NOW,
      reminderMonth: '2026-10',
      reminderCountThisMonth: 3,
    })
    expect(afterReminder({ reminderMonth: '2026-09', reminderCountThisMonth: 9 }, NOW).reminderCountThisMonth).toBe(1)
  })

  it('a customer reminded today is not due again until intervalDays later', () => {
    const reminded = big(afterReminder(big(), NOW))
    expect(reminderBlock(reminded, rules, NOW + DAY)).toBe('tooSoon')
    expect(reminderBlock(reminded, rules, NOW + 2 * DAY)).toBeNull()
  })
})

describe('automatic job timing', () => {
  const s = DEFAULT_SETTINGS // sendHour 10
  it('runs once a day from sendHour until 9 pm Dhaka', () => {
    expect(reminderJobDue(s, Date.UTC(2026, 9, 26, 3, 50))).toEqual({ due: false, today: '2026-10-26' }) // 9:50
    expect(reminderJobDue(s, NOW).due).toBe(true) // 10:30
    expect(reminderJobDue(s, Date.UTC(2026, 9, 26, 14, 0)).due).toBe(true) // 20:00
    expect(reminderJobDue(s, Date.UTC(2026, 9, 26, 15, 0)).due).toBe(false) // 21:00
    expect(reminderJobDue({ ...s, reminder: { ...s.reminder, lastRunDate: '2026-10-26' } }, NOW).due).toBe(false)
  })

  it('needs SMS and reminders switched on', () => {
    expect(reminderJobDue({ ...s, reminder: { ...s.reminder, enabled: false } }, NOW).due).toBe(false)
    expect(reminderJobDue({ ...s, sms: { ...s.sms, enabled: false } }, NOW).due).toBe(false)
  })
})
