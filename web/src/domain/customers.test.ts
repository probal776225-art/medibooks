import { describe, expect, it } from 'vitest'
import { cleanProfile, customerAging, marketDue, matchesQuery, queryCustomers } from './customers'
import type { DomainError } from './errors'
import { DEFAULT_SETTINGS, withDefaults } from './settings'
import { SCHEMA_VERSION, type Customer } from './types'

const DAY = 86_400_000
const NOW = Date.UTC(2026, 9, 22, 6, 0, 0)

function c(over: Partial<Customer>): Customer {
  return {
    mobile: '01711000000',
    name: 'Name',
    address: '',
    note: '',
    totalDuePaisa: 0,
    smsEnabled: true,
    reminderEnabled: true,
    archived: false,
    lastTxnAt: null,
    lastPaymentAt: null,
    lastReminderAt: null,
    reminderMonth: null,
    reminderCountThisMonth: 0,
    createdAt: NOW - DAY,
    createdBy: 'owner',
    updatedAt: null,
    schemaVersion: SCHEMA_VERSION,
    ...over,
  }
}

const list = [
  c({ mobile: '01711460114', name: 'রহিম উদ্দিন', address: 'Sreemangal', totalDuePaisa: 750000, createdAt: NOW - 70 * DAY }),
  c({ mobile: '01811222333', name: 'Karim', totalDuePaisa: 120000, lastPaymentAt: NOW - 5 * DAY, lastTxnAt: NOW }),
  c({ mobile: '01911444555', name: 'Abdul', totalDuePaisa: 0, smsEnabled: false }),
  c({ mobile: '01611666777', name: 'Old', totalDuePaisa: 900000, archived: true }),
  c({ mobile: '01511888999', name: 'Advance', totalDuePaisa: -20000 }),
]

describe('cleanProfile', () => {
  it('trims, collapses spaces and requires a name', () => {
    expect(cleanProfile({ name: '  রহিম   উদ্দিন ', address: ' Road  1 ', note: '' })).toEqual({
      name: 'রহিম উদ্দিন',
      address: 'Road 1',
      note: '',
    })
    try {
      cleanProfile({ name: '   ', address: '', note: '' })
      expect.unreachable()
    } catch (e) {
      expect((e as DomainError).code).toBe('NAME_REQUIRED')
    }
  })
})

describe('search', () => {
  it('matches mobile digits (Bangla, +880, partial) and names/addresses', () => {
    const rahim = list[0]!
    expect(matchesQuery(rahim, '01711')).toBe(true)
    expect(matchesQuery(rahim, '০১৭১১৪৬')).toBe(true)
    expect(matchesQuery(rahim, '+880 1711-460114')).toBe(true)
    expect(matchesQuery(rahim, '460114')).toBe(true)
    expect(matchesQuery(rahim, '01811')).toBe(false)
    expect(matchesQuery(rahim, 'রহিম')).toBe(true)
    expect(matchesQuery(rahim, 'sreem')).toBe(true)
    expect(matchesQuery(rahim, '')).toBe(true)
  })
})

describe('queryCustomers', () => {
  const ids = (cs: Customer[]) => cs.map((x) => x.name)

  it('sorts by due desc by default and hides archived', () => {
    expect(ids(queryCustomers(list, { now: NOW }))).toEqual(['রহিম উদ্দিন', 'Karim', 'Abdul', 'Advance'])
  })

  it('filters', () => {
    expect(ids(queryCustomers(list, { filter: 'due', now: NOW }))).toEqual(['রহিম উদ্দিন', 'Karim'])
    expect(ids(queryCustomers(list, { filter: 'bigDue', now: NOW }))).toEqual(['রহিম উদ্দিন'])
    expect(ids(queryCustomers(list, { filter: 'smsOff', now: NOW }))).toEqual(['Abdul'])
    expect(ids(queryCustomers(list, { filter: 'archived', now: NOW }))).toEqual(['Old'])
  })

  it('sorts by activity and aging', () => {
    expect(ids(queryCustomers(list, { sort: 'activity', now: NOW }))[0]).toBe('Karim')
    expect(ids(queryCustomers(list, { sort: 'aging', now: NOW })).slice(0, 2)).toEqual(['রহিম উদ্দিন', 'Karim'])
  })

  it('combines query and filter', () => {
    expect(ids(queryCustomers(list, { query: '018', filter: 'due', now: NOW }))).toEqual(['Karim'])
  })
})

describe('aging and market due', () => {
  it('falls back to createdAt when never paid', () => {
    expect(customerAging(list[0]!, NOW)).toEqual({ days: 70, level: 'red' })
    expect(customerAging(list[1]!, NOW).level).toBe('green')
  })

  it('sums positive dues of active customers only', () => {
    expect(marketDue(list)).toBe(870000)
  })
})

describe('settings defaults', () => {
  it('fills missing fields and ignores wrong types', () => {
    const s = withDefaults({ shop: { name: 'X', phone: 123 }, billing: { roundToTaka: false }, junk: 1 })
    expect(s.shop.name).toBe('X')
    expect(s.shop.phone).toBe(DEFAULT_SETTINGS.shop.phone)
    expect(s.billing.roundToTaka).toBe(false)
    expect(s.sms.templates.payment).toBe(DEFAULT_SETTINGS.sms.templates.payment)
    expect(withDefaults({ reminder: { lastRunDate: '2026-10-22' } }).reminder.lastRunDate).toBe('2026-10-22')
    expect(withDefaults(null)).toEqual(DEFAULT_SETTINGS)
  })
})
