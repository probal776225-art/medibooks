// SMS text helpers: segment counting, template rendering and the queue item shape (SPEC §8).
// Sending happens only in the Worker, which imports this file too (keep it free of browser APIs).
import { formatDate } from './dates'
import { withDigits } from './digits'
import { formatMoney } from './money'
import type { DigitStyle, Millis, Paisa, PaymentMethod, TransactionDraft } from './types'

export type SmsKind = 'bakiAdd' | 'payment' | 'paymentClear' | 'reminder' | 'opening'
/** Queue items also carry the owner's test message from the template editor. */
export type SmsQueueKind = SmsKind | 'test'
export type SmsStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'test'

export const SMS_KINDS: readonly SmsKind[] = ['bakiAdd', 'payment', 'paymentClear', 'reminder', 'opening']
/** Automatic tries per item; a failure the provider calls permanent stops at once. */
export const SMS_MAX_ATTEMPTS = 3
/** Longest text the rules accept (about 10 Bangla SMS parts). */
export const SMS_MAX_TEXT = 640

/** shops/main/smsQueue/{id} — written by the app (pending), moved on only by the Worker. */
export interface SmsQueueItem {
  id: string
  kind: SmsQueueKind
  /** Customer mobile (doc id); null for a test message. */
  customerId: string | null
  customerName: string
  /** 01XXXXXXXXX — the Worker converts it to the provider's format. */
  to: string
  text: string
  segments: number
  unicode: boolean
  txnId: string | null
  status: SmsStatus
  attempts: number
  lastError: string
  providerRef: string
  createdAt: Millis
  createdBy: string
  sentAt: Millis | null
}

export const SMS_VARIABLES = ['name', 'amount', 'total', 'shop', 'phone', 'date', 'method'] as const
export type SmsVariable = (typeof SMS_VARIABLES)[number]

export const DEFAULT_SMS_TEMPLATES: Record<SmsKind, string> = {
  bakiAdd: '{name}, আজ ৳{amount} বাকি যোগ হলো। মোট বাকি ৳{total}। -{shop}',
  payment: '{name}, ৳{amount} জমা পেয়েছি, ধন্যবাদ। বাকি আছে ৳{total}। -{shop}',
  paymentClear: '{name}, ৳{amount} জমা পেয়েছি। আপনার কোনো বাকি নেই, ধন্যবাদ। -{shop}',
  reminder: '{name}, আপনার মোট বাকি ৳{total}। সুবিধামতো পরিশোধের অনুরোধ রইলো। -{shop}, {phone}',
  opening: '{name}, আমাদের দোকানে আপনার বর্তমান বাকি ৳{total}। -{shop}',
}

/** The part of the shop settings an SMS text needs. */
export interface SmsTextSettings {
  shop: { phone: string; smsShortName: string }
  sms: { enabled: boolean; digits: DigitStyle; templates: Record<SmsKind, string> }
}

/** SMS go out in Bangla whatever the app language is. */
export const SMS_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'ক্যাশ',
  card: 'কার্ড',
  bkash: 'বিকাশ',
  nagad: 'নগদ',
}

export interface SmsValues {
  name: string
  amountPaisa?: Paisa
  totalPaisa: Paisa
  method?: PaymentMethod | null
  at: Millis
}

/** The finished text of one SMS (templates already contain the ৳ sign, so amounts are written without it). */
export function renderSms(kind: SmsKind, v: SmsValues, s: SmsTextSettings): string {
  const d = s.sms.digits
  const money = (p: Paisa) => formatMoney(p, { digits: d, symbol: false })
  return renderTemplate(s.sms.templates[kind], {
    name: v.name.trim(),
    amount: v.amountPaisa === undefined ? '' : money(v.amountPaisa),
    total: money(v.totalPaisa),
    shop: s.shop.smsShortName,
    phone: withDigits(s.shop.phone, d),
    date: formatDate(v.at, d),
    method: v.method ? SMS_METHOD_LABEL[v.method] : '',
  }).trim()
}

/** What goes into a queue item besides the bookkeeping fields. */
export interface SmsPlan {
  kind: SmsQueueKind
  to: string
  text: string
  segments: number
  unicode: boolean
}

export function smsPlan(kind: SmsQueueKind, to: string, text: string): SmsPlan {
  const seg = smsSegments(text)
  return { kind, to, text, segments: seg.segments, unicode: seg.encoding === 'unicode' }
}

/** Which SMS a transaction sends: a bill only when it adds due, a payment always. Imports send none. */
export function txnSmsKind(txn: Pick<TransactionDraft, 'type' | 'effectPaisa'>, totalAfterPaisa: Paisa): SmsKind | null {
  if (txn.type === 'sale') return txn.effectPaisa > 0 ? 'bakiAdd' : null
  if (txn.type === 'payment') return totalAfterPaisa <= 0 ? 'paymentClear' : 'payment'
  return null
}

/** The SMS for a new bill or payment, or null when SMS is off (shop-wide or for this customer). */
export function planTxnSms(
  txn: TransactionDraft,
  customer: { smsEnabled: boolean } | undefined,
  s: SmsTextSettings,
): SmsPlan | null {
  if (!s.sms.enabled || !customer?.smsEnabled) return null
  const total = (txn.memoPrevDuePaisa ?? 0) + txn.effectPaisa
  const kind = txnSmsKind(txn, total)
  if (!kind) return null
  const text = renderSms(
    kind,
    {
      name: txn.customerName,
      amountPaisa: kind === 'bakiAdd' ? txn.effectPaisa : txn.paidNowPaisa,
      totalPaisa: total,
      method: txn.paymentMethod,
      at: txn.createdAt,
    },
    s,
  )
  return smsPlan(kind, txn.customerId, text)
}

/** A due reminder for one customer (তাগাদা). */
export function planReminderSms(
  c: { mobile: string; name: string; totalDuePaisa: Paisa },
  s: SmsTextSettings,
  now: Millis,
): SmsPlan {
  return smsPlan('reminder', c.mobile, renderSms('reminder', { name: c.name, totalPaisa: c.totalDuePaisa, at: now }, s))
}

/** Replace {variable} placeholders; unknown placeholders are left as they are. */
export function renderTemplate(template: string, vars: Partial<Record<SmsVariable, string>>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => {
    const v = (vars as Record<string, string | undefined>)[key]
    return v === undefined ? whole : v
  })
}

// GSM 03.38 basic set and the extension set (extension chars cost 2 septets).
const GSM_BASIC =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?' +
  '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'
const GSM_EXT = '^{}\\[~]|€\f'

export interface SmsSegments {
  encoding: 'gsm7' | 'unicode'
  /** Septets (GSM-7) or UTF-16 code units (Unicode). */
  units: number
  segments: number
  /** Capacity of each segment for this message. */
  perSegment: number
}

export function smsSegments(text: string): SmsSegments {
  let septets = 0
  let gsm = true
  for (const ch of text) {
    if (GSM_BASIC.includes(ch)) septets += 1
    else if (GSM_EXT.includes(ch)) septets += 2
    else {
      gsm = false
      break
    }
  }
  if (gsm) {
    const perSegment = septets <= 160 ? 160 : 153
    return { encoding: 'gsm7', units: septets, segments: septets === 0 ? 0 : Math.ceil(septets / perSegment), perSegment }
  }
  const units = text.length // UTF-16 code units; Bangla letters are 1 each
  const perSegment = units <= 70 ? 70 : 67
  return { encoding: 'unicode', units, segments: Math.ceil(units / perSegment), perSegment }
}
