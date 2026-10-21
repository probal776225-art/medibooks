// Entity types — mirror of docs/ARCHITECTURE.md §3.
// Times are epoch milliseconds here; the data layer converts to/from Firestore Timestamps.

/** Integer paisa (৳1 = 100). Never a float. */
export type Paisa = number
/** Epoch milliseconds. */
export type Millis = number

export const SCHEMA_VERSION = 1 as const

export type Language = 'bn' | 'en'
export type DigitStyle = 'bn' | 'en'

export type PaymentMethod = 'cash' | 'card' | 'bkash' | 'nagad'
export const PAYMENT_METHODS: readonly PaymentMethod[] = ['cash', 'card', 'bkash', 'nagad']

// ---------- customers ----------

export interface Customer {
  /** Doc id = normalized mobile 01XXXXXXXXX */
  mobile: string
  name: string
  address: string
  note: string
  /** Changes only via increment() in the same batch as a transaction. */
  totalDuePaisa: Paisa
  smsEnabled: boolean
  reminderEnabled: boolean
  archived: boolean
  lastTxnAt: Millis | null
  lastPaymentAt: Millis | null
  lastReminderAt: Millis | null
  /** 'YYYY-MM' */
  reminderMonth: string | null
  reminderCountThisMonth: number
  createdAt: Millis
  createdBy: string
  updatedAt: Millis | null
  schemaVersion: typeof SCHEMA_VERSION
}

// ---------- medicines ----------

export type SourceName = 'manual' | 'csv' | 'medex' | 'dgda'
export type SourceStatus = 'listed' | 'missing'
export type MedicineStatus = 'active' | 'inactive'

export interface Medicine {
  id: string
  brandName: string
  genericName: string
  strength: string
  dosageForm: string
  manufacturer: string
  /** Form/dosage text exactly as the source wrote it. */
  dosageText: string
  /** e.g. "10 x 10", "100 ml bottle" */
  packDescription: string
  piecesPerStrip: number | null
  piecesPerPack: number | null

  sourceUnitPricePaisa: Paisa | null
  sourceStripPricePaisa: Paisa | null
  sourcePackPricePaisa: Paisa | null
  /** Owner overrides — imports never touch these. */
  shopUnitPricePaisa: Paisa | null
  shopStripPricePaisa: Paisa | null
  shopPackPricePaisa: Paisa | null

  sourceName: SourceName
  sourceId: string | null
  sourceUrl: string | null
  sourceUpdatedAt: Millis | null
  sourceFetchedAt: Millis | null
  lastImportId: string | null
  sourceStatus: SourceStatus
  status: MedicineStatus

  createdAt: Millis
  createdBy: string
  updatedAt: Millis | null
  schemaVersion: typeof SCHEMA_VERSION
}

// ---------- transactions ----------

export type TxnType = 'sale' | 'payment' | 'opening' | 'adjustment'
export type SaleMode = 'items' | 'amount'
export type SaleUnit = 'piece' | 'strip' | 'pack' | 'custom'

/** Percent value is basis points (12.5% = 1250); flat value is paisa. */
export interface BillDiscount {
  type: 'none' | 'percent' | 'flat'
  value: number
}

/** Snapshot copied at sale time; never re-read from `medicines`. */
export interface SaleLine {
  lineNo: number
  /** Link only; null for free-text items. */
  medicineId: string | null
  name: string
  genericName: string
  strength: string
  dosageForm: string
  manufacturer: string
  unit: SaleUnit
  /** Free text for custom units ("১ পাতা"); null for piece/strip/pack (label comes from unit + piecesPerUnit). */
  unitLabel: string | null
  /** 1, strip size, pack size, or null for a custom unit with no piece mapping. */
  piecesPerUnit: number | null
  /** Positive integer of `unit`. */
  qty: number
  /** Master price for this unit at sale time (audit); null if unknown. */
  listUnitPricePaisa: Paisa | null
  /** Price actually charged per unit. */
  unitPricePaisa: Paisa
  priceOverridden: boolean
  discountPaisa: Paisa
  /** qty × unitPricePaisa − discountPaisa */
  lineTotalPaisa: Paisa
}

export interface Transaction {
  id: string
  customerId: string
  /** Name snapshot for memos. */
  customerName: string
  type: TxnType
  /** 'B-YYMMDD-XXXX' style, random suffix (offline-safe). */
  memoNo: string
  mode: SaleMode | null
  lines: SaleLine[]
  subtotalPaisa: Paisa
  billDiscount: BillDiscount
  billDiscountPaisa: Paisa
  roundOffPaisa: Paisa
  /** sale: bill net · payment: amount received · opening/adjustment: absolute amount */
  netPaisa: Paisa
  /** Money received in this transaction (sale: paid now · payment: amount). */
  paidNowPaisa: Paisa
  paymentMethod: PaymentMethod | null
  trxId: string
  /** Signed change to the customer's totalDuePaisa. */
  effectPaisa: Paisa
  /** What the memo showed as "আগের বাকি" — display only, not authoritative. */
  memoPrevDuePaisa: Paisa | null
  note: string
  deviceId: string
  createdAt: Millis
  createdBy: string
  serverAt: Millis | null
  voided: boolean
  voidedAt: Millis | null
  voidedBy: string | null
  voidReason: string
  schemaVersion: typeof SCHEMA_VERSION
}

/** A transaction built on the device, before the repository assigns id/serverAt. */
export type TransactionDraft = Omit<Transaction, 'id' | 'serverAt'>

// ---------- medicine import ----------

/** Normalized row produced by any SourceAdapter (ARCHITECTURE §6). */
export interface SourceRecord {
  sourceName: SourceName
  sourceId?: string
  sourceUrl?: string
  brandName: string
  genericName?: string
  strength?: string
  dosageForm?: string
  manufacturer?: string
  dosageText?: string
  packDescription?: string
  piecesPerStrip?: number
  piecesPerPack?: number
  unitPricePaisa?: Paisa
  stripPricePaisa?: Paisa
  packPricePaisa?: Paisa
  /** ISO date the source says the data is from. */
  sourceUpdatedAt?: string
  raw: Record<string, string>
}
