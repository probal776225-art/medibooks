import { describe, expect, it } from 'vitest'
import { autoId, fromFields, toFields, ts } from '../src/firestore'
import { parseBalanceReply, parseSendReply } from '../src/providers/automas'
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

describe('Automas adapter', () => {
  it('takes the key out of a pasted sample URL, or uses the value as it is', () => {
    expect(apiKeyFrom('https://api.automas.com.bd/smsapiv3?apikey=AbC123xyz&sender=8809617642327&msisdn=01…&smstext=SMS Success')).toBe(
      'AbC123xyz',
    )
    expect(apiKeyFrom('http://bulksmsbd.net/api/smsapi?api_key=AbC123xyz&type=text')).toBe('AbC123xyz')
    expect(apiKeyFrom('  AbC123xyz \n')).toBe('AbC123xyz')
  })

  it('reads status 0 as sent', () => {
    expect(parseSendReply(200, '{"response":[{"status":0,"id":296334,"msisdn":"01886888816"}]}')).toEqual({ ok: true, ref: '296334' })
  })

  it('retries only failures where nothing went out and a later try can work', () => {
    // Replies as the live API gives them (a failure carries an id too).
    expect(parseSendReply(200, '{"response":[{"status":106,"id":122967,"msisdn":"01711000000"}]}')).toEqual({
      ok: false,
      error: '106 Incorrect API key',
      retry: false,
    })
    expect(parseSendReply(200, '{"response":[{"status":105,"id":128576,"msisdn":"NA"}]}')).toEqual({ ok: false, error: '105 Invalid number', retry: false })
    expect(parseSendReply(200, '{"response":[{"status":"1000","id":1}]}')).toEqual({ ok: false, error: '1000 Insufficient balance', retry: true })
    expect(parseSendReply(200, '{"response":[{"status":108,"id":1}]}')).toMatchObject({ ok: false, retry: false, error: expect.stringContaining('whitelist') })
    expect(parseSendReply(200, '{"response":[{"status":3300,"id":1}]}')).toMatchObject({ ok: false, retry: true })
    expect(parseSendReply(502, '<html>Bad gateway</html>')).toEqual({ ok: false, error: 'HTTP 502: <html>Bad gateway</html>', retry: false })
    expect(parseSendReply(200, '{"response":[]}')).toMatchObject({ ok: false, retry: false })
  })

  it('reads the balance, and an error code as an error', () => {
    expect(parseBalanceReply('{"response":"1234.50"}')).toBe(1234.5)
    expect(parseBalanceReply('{"response":"0.00"}')).toBe(0)
    expect(() => parseBalanceReply('{"response":"104"}')).toThrow('104 Invalid user')
    expect(() => parseBalanceReply('<html>')).toThrow('balance')
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
