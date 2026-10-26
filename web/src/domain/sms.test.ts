import { describe, expect, it } from 'vitest'
import { buildPayment } from './billing'
import { DEFAULT_SETTINGS } from './settings'
import { planReminderSms, planTxnSms, renderSms, txnSmsKind } from './sms'
import type { TransactionDraft } from './types'

const AT = Date.UTC(2026, 9, 26, 6, 0) // 26/10/2026 12:00 Dhaka
const meta = { memoNo: 'J-1', deviceId: 'd', createdAt: AT, createdBy: 'owner' }
const customer = { mobile: '01711000000', name: 'রহিম' }

function payment(amountPaisa: number, prevDuePaisa: number): TransactionDraft {
  return buildPayment({ customer, prevDuePaisa, amountPaisa, method: 'bkash', trxId: '', note: '', meta })
}

function sale(effectPaisa: number, prevDuePaisa: number): TransactionDraft {
  return { ...payment(100, prevDuePaisa), type: 'sale', effectPaisa, paidNowPaisa: 0, paymentMethod: null }
}

describe('SMS texts', () => {
  it('writes amounts in Bangla digits without a second ৳', () => {
    expect(renderSms('bakiAdd', { name: 'রহিম', amountPaisa: 125050, totalPaisa: 1250000, at: AT }, DEFAULT_SETTINGS)).toBe(
      'রহিম, আজ ৳১,২৫০.৫০ বাকি যোগ হলো। মোট বাকি ৳১২,৫০০। -অ্যালোপ্যাথিক স্টোর',
    )
  })

  it('uses English digits and fills date, phone and method when asked', () => {
    const s = {
      ...DEFAULT_SETTINGS,
      sms: { ...DEFAULT_SETTINGS.sms, digits: 'en' as const, templates: { ...DEFAULT_SETTINGS.sms.templates, payment: '{date} {method} {amount} {phone}' } },
    }
    expect(renderSms('payment', { name: 'A', amountPaisa: 50000, totalPaisa: 0, method: 'bkash', at: AT }, s)).toBe(
      '26/10/2026 বিকাশ 500 01711460114',
    )
  })
})

describe('which SMS a transaction sends', () => {
  it('bill: only when it adds due', () => {
    expect(txnSmsKind({ type: 'sale', effectPaisa: 100 }, 100)).toBe('bakiAdd')
    expect(txnSmsKind({ type: 'sale', effectPaisa: 0 }, 0)).toBeNull()
    expect(txnSmsKind({ type: 'opening', effectPaisa: 100 }, 100)).toBeNull()
  })

  it('payment: "no due left" when the new total is zero or an advance', () => {
    expect(txnSmsKind({ type: 'payment', effectPaisa: -100 }, 50)).toBe('payment')
    expect(txnSmsKind({ type: 'payment', effectPaisa: -100 }, 0)).toBe('paymentClear')
    expect(txnSmsKind({ type: 'payment', effectPaisa: -100 }, -20)).toBe('paymentClear')
  })

  it('plans the bill SMS with the new total', () => {
    const plan = planTxnSms(sale(30000, 120000), { smsEnabled: true }, DEFAULT_SETTINGS)
    expect(plan).toMatchObject({ kind: 'bakiAdd', to: '01711000000', unicode: true, segments: 1 })
    expect(plan?.text).toContain('৳৩০০ বাকি')
    expect(plan?.text).toContain('মোট বাকি ৳১,৫০০')
  })

  it('plans the payment SMS', () => {
    expect(planTxnSms(payment(50000, 120000), { smsEnabled: true }, DEFAULT_SETTINGS)?.text).toBe(
      'রহিম, ৳৫০০ জমা পেয়েছি, ধন্যবাদ। বাকি আছে ৳৭০০। -অ্যালোপ্যাথিক স্টোর',
    )
    expect(planTxnSms(payment(120000, 120000), { smsEnabled: true }, DEFAULT_SETTINGS)?.kind).toBe('paymentClear')
  })

  it('sends nothing when SMS is off for the shop or the customer', () => {
    expect(planTxnSms(payment(500, 1000), { smsEnabled: false }, DEFAULT_SETTINGS)).toBeNull()
    expect(planTxnSms(payment(500, 1000), undefined, DEFAULT_SETTINGS)).toBeNull()
    const off = { ...DEFAULT_SETTINGS, sms: { ...DEFAULT_SETTINGS.sms, enabled: false } }
    expect(planTxnSms(payment(500, 1000), { smsEnabled: true }, off)).toBeNull()
  })

  it('plans a reminder with the shop phone', () => {
    const plan = planReminderSms({ mobile: '01711000000', name: 'রহিম', totalDuePaisa: 600000 }, DEFAULT_SETTINGS, AT)
    expect(plan.kind).toBe('reminder')
    expect(plan.text).toBe('রহিম, আপনার মোট বাকি ৳৬,০০০। সুবিধামতো পরিশোধের অনুরোধ রইলো। -অ্যালোপ্যাথিক স্টোর, ০১৭১১৪৬০১১৪')
    expect(plan.segments).toBe(2)
  })
})
