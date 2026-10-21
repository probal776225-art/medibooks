// SMS text helpers: segment counting and template rendering (SPEC §8).
// Sending happens only in the Worker.

export type SmsKind = 'bakiAdd' | 'payment' | 'paymentClear' | 'reminder' | 'opening'

export const SMS_VARIABLES = ['name', 'amount', 'total', 'shop', 'phone', 'date', 'method'] as const
export type SmsVariable = (typeof SMS_VARIABLES)[number]

export const DEFAULT_SMS_TEMPLATES: Record<SmsKind, string> = {
  bakiAdd: '{name}, আজ ৳{amount} বাকি যোগ হলো। মোট বাকি ৳{total}। -{shop}',
  payment: '{name}, ৳{amount} জমা পেয়েছি, ধন্যবাদ। বাকি আছে ৳{total}। -{shop}',
  paymentClear: '{name}, ৳{amount} জমা পেয়েছি। আপনার কোনো বাকি নেই, ধন্যবাদ। -{shop}',
  reminder: '{name}, আপনার মোট বাকি ৳{total}। সুবিধামতো পরিশোধের অনুরোধ রইলো। -{shop}, {phone}',
  opening: '{name}, আমাদের দোকানে আপনার বর্তমান বাকি ৳{total}। -{shop}',
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
