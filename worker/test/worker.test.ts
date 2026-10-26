import { describe, expect, it } from 'vitest'
import { autoId, fromFields, toFields, ts } from '../src/firestore'
import { parseSendReply, toProviderNumber } from '../src/providers/bulksmsbd'
import { apiKeyFrom } from '../src/providers'
import { toReminderCustomer } from '../src/reminders'

describe('Firestore values', () => {
  it('round-trips the shapes the queue and customers use', () => {
    const fields = toFields({ a: 1, b: 1.5, c: 'ক', d: true, e: null, f: ts(Date.UTC(2026, 9, 26)), g: [1, 'x'], h: { i: 2 } })
    expect(fields.a).toEqual({ integerValue: '1' })
    expect(fields.b).toEqual({ doubleValue: 1.5 })
    expect(fields.f).toEqual({ timestampValue: '2026-10-26T00:00:00.000Z' })
    expect(fromFields(fields)).toEqual({ a: 1, b: 1.5, c: 'ক', d: true, e: null, f: Date.UTC(2026, 9, 26), g: [1, 'x'], h: { i: 2 } })
  })

  it('skips undefined and makes 20-character ids', () => {
    expect(toFields({ a: undefined, b: 1 })).toEqual({ b: { integerValue: '1' } })
    expect(autoId()).toMatch(/^[A-Za-z0-9]{20}$/)
  })
})

describe('bulksmsbd adapter', () => {
  it('takes the key out of a pasted sample URL, or uses the value as it is', () => {
    expect(apiKeyFrom('API URL (GET & POST) : http://bulksmsbd.net/api/smsapi?api_key=AbC123xyz&type=text&number=Receiver')).toBe('AbC123xyz')
    expect(apiKeyFrom('  AbC123xyz \n')).toBe('AbC123xyz')
  })

  it('sends to 8801XXXXXXXXX', () => {
    expect(toProviderNumber('01711460114')).toBe('8801711460114')
  })

  it('reads 202 as sent', () => {
    expect(parseSendReply(200, '{"response_code":202,"message_id":5521,"success_message":"SMS Submitted Successfully","error_message":""}')).toEqual({
      ok: true,
      ref: '5521',
    })
    expect(parseSendReply(200, '{"response_code":202,"success_message":"SMS Submitted Successfully"}')).toEqual({
      ok: true,
      ref: 'SMS Submitted Successfully',
    })
  })

  it('retries only failures where nothing went out and a later try can work', () => {
    expect(parseSendReply(200, '{"response_code":1007,"error_message":"Balance Insufficient"}')).toEqual({
      ok: false,
      error: '1007 Balance Insufficient',
      retry: true,
    })
    expect(parseSendReply(200, '{"response_code":1001,"error_message":""}')).toEqual({ ok: false, error: '1001 Invalid number', retry: false })
    expect(parseSendReply(200, '{"response_code":"1032"}')).toMatchObject({ ok: false, retry: false, error: expect.stringContaining('whitelist') })
    expect(parseSendReply(502, '<html>Bad gateway</html>')).toEqual({ ok: false, error: 'HTTP 502: <html>Bad gateway</html>', retry: false })
  })
})

describe('reminder job', () => {
  it('reads customers with the app’s defaults (a missing switch means on)', () => {
    const c = toReminderCustomer({
      path: 'shops/main/customers/01711000000',
      id: '01711000000',
      updateTime: 'x',
      data: { name: 'Rahim', totalDuePaisa: 600000, lastPaymentAt: 1, reminderMonth: '2026-10', reminderCountThisMonth: 2 },
    })
    expect(c).toEqual({
      mobile: '01711000000',
      name: 'Rahim',
      totalDuePaisa: 600000,
      smsEnabled: true,
      reminderEnabled: true,
      archived: false,
      lastPaymentAt: 1,
      lastReminderAt: null,
      reminderMonth: '2026-10',
      reminderCountThisMonth: 2,
    })
  })
})
