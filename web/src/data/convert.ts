// Firestore document data → domain types (Timestamps → epoch millis, missing fields → defaults).
import { Timestamp, type DocumentData } from 'firebase/firestore'
import {
  SCHEMA_VERSION,
  type Customer,
  type Medicine,
  type MedicineStatus,
  type Millis,
  type SourceName,
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
