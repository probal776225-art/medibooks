// Shop settings document (shops/main/settings/general) and its defaults (SPEC §8, §9, §12).
import { DEFAULT_SMS_TEMPLATES, type SmsKind } from './sms'
import { SCHEMA_VERSION, type DigitStyle, type Language, type Paisa } from './types'

export interface ShopSettings {
  shop: { name: string; address: string; phone: string; smsShortName: string }
  sms: {
    enabled: boolean
    /** Until the provider is verified nothing is really sent. */
    testMode: boolean
    digits: DigitStyle
    /** Cost of one SMS part, set once the provider is chosen. */
    ratePaisa: Paisa
    templates: Record<SmsKind, string>
  }
  reminder: {
    enabled: boolean
    thresholdPaisa: Paisa
    intervalDays: number
    /** Hour of day in Asia/Dhaka. */
    sendHour: number
    maxPerMonth: number
    skipIfPaidWithinDays: number
    /** 'YYYY-MM-DD' of the last automatic run. */
    lastRunDate: string | null
  }
  billing: { roundToTaka: boolean }
  ui: { language: Language; digits: DigitStyle }
  schemaVersion: typeof SCHEMA_VERSION
}

export const DEFAULT_SETTINGS: ShopSettings = {
  shop: {
    name: 'M/S ALLOPATHIC STORE & SURGICAL',
    address: 'R.K Mission Road, Sreemangal',
    phone: '01711460114',
    smsShortName: 'অ্যালোপ্যাথিক স্টোর',
  },
  sms: { enabled: true, testMode: true, digits: 'bn', ratePaisa: 0, templates: { ...DEFAULT_SMS_TEMPLATES } },
  reminder: {
    enabled: true,
    thresholdPaisa: 500_000,
    intervalDays: 2,
    sendHour: 10,
    maxPerMonth: 15,
    skipIfPaidWithinDays: 2,
    lastRunDate: null,
  },
  billing: { roundToTaka: true },
  ui: { language: 'bn', digits: 'bn' },
  schemaVersion: SCHEMA_VERSION,
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Fill anything missing (older docs, partial writes) from the defaults; ignore wrong types. */
export function withDefaults(data: unknown): ShopSettings {
  const src = isRecord(data) ? data : {}
  const pick = <T extends object>(defaults: T, value: unknown): T => {
    if (!isRecord(value)) return structuredClone(defaults)
    const out = structuredClone(defaults) as Record<string, unknown>
    for (const [k, d] of Object.entries(defaults)) {
      const v = value[k]
      if (isRecord(d)) out[k] = pick(d, v)
      else if (v !== undefined && (typeof v === typeof d || (d === null && typeof v === 'string'))) out[k] = v
    }
    return out as T
  }
  return {
    shop: pick(DEFAULT_SETTINGS.shop, src.shop),
    sms: pick(DEFAULT_SETTINGS.sms, src.sms),
    reminder: pick(DEFAULT_SETTINGS.reminder, src.reminder),
    billing: pick(DEFAULT_SETTINGS.billing, src.billing),
    ui: pick(DEFAULT_SETTINGS.ui, src.ui),
    schemaVersion: SCHEMA_VERSION,
  }
}
