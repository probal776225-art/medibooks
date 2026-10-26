// Firestore document data → domain types (Timestamps → epoch millis, missing fields → defaults).
import { Timestamp, type DocumentData } from 'firebase/firestore'
import type { SmsQueueItem, SmsQueueKind, SmsStatus } from '../domain/sms'
import {
  SCHEMA_VERSION,
  type BillDiscount,
  type Customer,
  type Medicine,
  type MedicineStatus,
  type Millis,
  type PaymentMethod,
  type SaleLine,
  type SourceName,
  type Transaction,
  type TxnType,
} from '../domain/types'

export function toMillis(v: unknown): Millis | null {
  if (v instanceof Timestamp) return v.toMillis()
  if (typeof v === 'number') return v
  return null
}

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
const int = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isSafeInteger(v) ? v : fallback)
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback)

export function customerFromDoc(id: string, d: DocumentData): Customer {
  return {
    mobile: id,
    name: str(d.name),
    address: str(d.address),
    note: str(d.note),
    totalDuePaisa: int(d.totalDuePaisa),
    smsEnabled: bool(d.smsEnabled, true),
    reminderEnabled: bool(d.reminderEnabled, true),
    archived: bool(d.archived, false),
    lastTxnAt: toMillis(d.lastTxnAt),
    lastPaymentAt: toMillis(d.lastPaymentAt),
    lastReminderAt: toMillis(d.lastReminderAt),
    reminderMonth: typeof d.reminderMonth === 'string' ? d.reminderMonth : null,
    reminderCountThisMonth: int(d.reminderCountThisMonth),
    movedTo: typeof d.movedTo === 'string' ? d.movedTo : null,
    createdAt: toMillis(d.createdAt) ?? 0,
    createdBy: str(d.createdBy),
    updatedAt: toMillis(d.updatedAt),
    schemaVersion: SCHEMA_VERSION,
  }
}

const intOrNull = (v: unknown): number | null => (typeof v === 'number' && Number.isSafeInteger(v) ? v : null)
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v ? v : null)
const SOURCE_NAMES: readonly SourceName[] = ['manual', 'csv', 'medex', 'dgda']

export function medicineFromDoc(id: string, d: DocumentData): Medicine {
  return {
    id,
    brandName: str(d.brandName),
    genericName: str(d.genericName),
    strength: str(d.strength),
    dosageForm: str(d.dosageForm),
    manufacturer: str(d.manufacturer),
    dosageText: str(d.dosageText),
    packDescription: str(d.packDescription),
    piecesPerStrip: intOrNull(d.piecesPerStrip),
    piecesPerPack: intOrNull(d.piecesPerPack),
    sourceUnitPricePaisa: intOrNull(d.sourceUnitPricePaisa),
    sourceStripPricePaisa: intOrNull(d.sourceStripPricePaisa),
    sourcePackPricePaisa: intOrNull(d.sourcePackPricePaisa),
    shopUnitPricePaisa: intOrNull(d.shopUnitPricePaisa),
    shopStripPricePaisa: intOrNull(d.shopStripPricePaisa),
    shopPackPricePaisa: intOrNull(d.shopPackPricePaisa),
    sourceName: SOURCE_NAMES.includes(d.sourceName) ? d.sourceName : 'manual',
    sourceId: strOrNull(d.sourceId),
    sourceUrl: strOrNull(d.sourceUrl),
    sourceUpdatedAt: toMillis(d.sourceUpdatedAt),
    sourceFetchedAt: toMillis(d.sourceFetchedAt),
    lastImportId: strOrNull(d.lastImportId),
    sourceStatus: d.sourceStatus === 'missing' ? 'missing' : 'listed',
    status: (d.status === 'inactive' ? 'inactive' : 'active') satisfies MedicineStatus,
    createdAt: toMillis(d.createdAt) ?? 0,
    createdBy: str(d.createdBy),
    updatedAt: toMillis(d.updatedAt),
    schemaVersion: SCHEMA_VERSION,
  }
}

const TXN_TYPES: readonly TxnType[] = ['sale', 'payment', 'opening', 'adjustment']
const METHODS: readonly PaymentMethod[] = ['cash', 'card', 'bkash', 'nagad']

export function transactionFromDoc(id: string, d: DocumentData): Transaction {
  const discount = (d.billDiscount ?? {}) as Partial<BillDiscount>
  return {
    id,
    customerId: str(d.customerId),
    customerName: str(d.customerName),
    type: TXN_TYPES.includes(d.type) ? d.type : 'adjustment',
    memoNo: str(d.memoNo),
    mode: d.mode === 'items' || d.mode === 'amount' ? d.mode : null,
    lines: Array.isArray(d.lines) ? (d.lines as SaleLine[]) : [],
    subtotalPaisa: int(d.subtotalPaisa),
    billDiscount: {
      type: discount.type === 'percent' || discount.type === 'flat' ? discount.type : 'none',
      value: int(discount.value),
    },
    billDiscountPaisa: int(d.billDiscountPaisa),
    roundOffPaisa: int(d.roundOffPaisa),
    netPaisa: int(d.netPaisa),
    paidNowPaisa: int(d.paidNowPaisa),
    paymentMethod: METHODS.includes(d.paymentMethod) ? d.paymentMethod : null,
    trxId: str(d.trxId),
    effectPaisa: int(d.effectPaisa),
    memoPrevDuePaisa: intOrNull(d.memoPrevDuePaisa),
    note: str(d.note),
    deviceId: str(d.deviceId),
    createdAt: toMillis(d.createdAt) ?? 0,
    createdBy: str(d.createdBy),
    serverAt: toMillis(d.serverAt),
    voided: d.voided === true,
    voidedAt: toMillis(d.voidedAt),
    voidedBy: strOrNull(d.voidedBy),
    voidReason: str(d.voidReason),
    schemaVersion: SCHEMA_VERSION,
  }
}

const SMS_STATUSES: readonly SmsStatus[] = ['pending', 'sending', 'sent', 'failed', 'test']

export function smsFromDoc(id: string, d: DocumentData): SmsQueueItem {
  return {
    id,
    kind: str(d.kind, 'test') as SmsQueueKind,
    customerId: typeof d.customerId === 'string' ? d.customerId : null,
    customerName: str(d.customerName),
    to: str(d.to),
    text: str(d.text),
    segments: int(d.segments, 1),
    unicode: bool(d.unicode, true),
    txnId: typeof d.txnId === 'string' ? d.txnId : null,
    status: SMS_STATUSES.includes(d.status as SmsStatus) ? (d.status as SmsStatus) : 'pending',
    attempts: int(d.attempts),
    lastError: str(d.lastError),
    providerRef: str(d.providerRef),
    createdAt: toMillis(d.createdAt) ?? 0,
    createdBy: str(d.createdBy),
    sentAt: toMillis(d.sentAt),
  }
}
