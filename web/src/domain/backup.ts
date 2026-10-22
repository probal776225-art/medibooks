// Backup file (SPEC §12): every shop document as JSON, plus checks before a restore.
// Firestore timestamps are written as {"$ts": [seconds, nanoseconds]} so they come back exactly.
import { csvLine, taka } from './reports'
import type { Customer, Millis, Paisa } from './types'

export const BACKUP_APP = 'baki-khata'
export const BACKUP_FORMAT = 1

/** What a backup holds. The reference list (refCatalog) is left out: it is re-imported from its own file. */
export const BACKUP_COLLECTIONS = [
  'settings',
  'customers',
  'transactions',
  'medicines',
  'medicinePriceHistory',
  'medicineImports',
  'auditLog',
] as const
export type BackupCollection = (typeof BACKUP_COLLECTIONS)[number]

export interface BackupDoc {
  id: string
  data: Record<string, unknown>
}

export interface BackupFile {
  app: typeof BACKUP_APP
  format: number
  shopId: string
  /** Random id; a restore that stopped half-way continues only with the same file. */
  backupId: string
  exportedAt: Millis
  exportedBy: string
  counts: Record<BackupCollection, number>
  collections: Record<BackupCollection, BackupDoc[]>
}

export interface TimestampLike {
  seconds: number
  nanoseconds: number
}

type IsTimestamp = (v: unknown) => v is TimestampLike

/** Firestore data → plain JSON. Timestamps become {"$ts": [s, ns]}; everything else is kept as is. */
export function encodeValue(v: unknown, isTimestamp: IsTimestamp): unknown {
  if (isTimestamp(v)) return { $ts: [v.seconds, v.nanoseconds] }
  if (Array.isArray(v)) return v.map((x) => encodeValue(x, isTimestamp))
  if (v !== null && typeof v === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, x] of Object.entries(v)) out[k] = encodeValue(x, isTimestamp)
    return out
  }
  return v
}

/** The reverse of encodeValue. */
export function decodeValue(v: unknown, makeTimestamp: (seconds: number, nanoseconds: number) => unknown): unknown {
  if (Array.isArray(v)) return v.map((x) => decodeValue(x, makeTimestamp))
  if (v !== null && typeof v === 'object') {
    const ts = (v as { $ts?: unknown }).$ts
    if (Object.keys(v).length === 1 && Array.isArray(ts) && ts.length === 2 && ts.every((n) => typeof n === 'number')) {
      return makeTimestamp(ts[0] as number, ts[1] as number)
    }
    const out: Record<string, unknown> = {}
    for (const [k, x] of Object.entries(v)) out[k] = decodeValue(x, makeTimestamp)
    return out
  }
  return v
}

export type BackupProblem = 'notJson' | 'notBackup' | 'newerFormat' | 'otherShop' | 'broken'

export function parseBackup(text: string, shopId: string): { backup: BackupFile } | { problem: BackupProblem } {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { problem: 'notJson' }
  }
  const b = raw as Partial<BackupFile> | null
  if (!b || b.app !== BACKUP_APP || typeof b.format !== 'number') return { problem: 'notBackup' }
  if (b.format > BACKUP_FORMAT) return { problem: 'newerFormat' }
  if (b.shopId !== shopId) return { problem: 'otherShop' }
  const cols = b.collections
  if (!cols || typeof b.backupId !== 'string' || typeof b.exportedAt !== 'number') return { problem: 'broken' }
  for (const name of BACKUP_COLLECTIONS) {
    const docs = cols[name]
    if (!Array.isArray(docs)) return { problem: 'broken' }
    for (const d of docs as unknown[]) {
      const doc = d as Partial<BackupDoc> | null
      if (!doc || typeof doc.id !== 'string' || !doc.id || !doc.data || typeof doc.data !== 'object') return { problem: 'broken' }
    }
  }
  return { backup: b as BackupFile }
}

export interface DueMismatch {
  mobile: string
  name: string
  storedPaisa: Paisa
  computedPaisa: Paisa
}

export interface BackupSummary {
  counts: Record<BackupCollection, number>
  exportedAt: Millis
  /** Σ customers' totalDuePaisa — the market total the restore should give back. */
  marketDuePaisa: Paisa
  /** Customers whose stored due differs from the sum of their live transactions (ব্যালেন্স যাচাই can fix later). */
  mismatches: DueMismatch[]
  /** Transactions whose customer is not in the file. */
  orphanTransactions: number
}

const int = (v: unknown): number => (typeof v === 'number' && Number.isSafeInteger(v) ? v : 0)

export function summarizeBackup(backup: BackupFile): BackupSummary {
  const live = new Map<string, number>()
  let orphanTransactions = 0
  const customerIds = new Set(backup.collections.customers.map((c) => c.id))
  for (const { data } of backup.collections.transactions) {
    const customerId = typeof data.customerId === 'string' ? data.customerId : ''
    if (!customerIds.has(customerId)) orphanTransactions++
    if (data.voided === true) continue
    live.set(customerId, (live.get(customerId) ?? 0) + int(data.effectPaisa))
  }
  let marketDuePaisa = 0
  const mismatches: DueMismatch[] = []
  for (const { id, data } of backup.collections.customers) {
    const stored = int(data.totalDuePaisa)
    marketDuePaisa += stored
    const computed = live.get(id) ?? 0
    if (stored !== computed) {
      mismatches.push({ mobile: id, name: typeof data.name === 'string' ? data.name : '', storedPaisa: stored, computedPaisa: computed })
    }
  }
  const counts = Object.fromEntries(BACKUP_COLLECTIONS.map((c) => [c, backup.collections[c].length])) as Record<
    BackupCollection,
    number
  >
  return { counts, exportedAt: backup.exportedAt, marketDuePaisa, mismatches, orphanTransactions }
}

/** Fields of a voided transaction that are written in a second step, because rules only create live ones. */
export const VOID_FIELDS = ['voided', 'voidedAt', 'voidedBy', 'voidReason'] as const

export function liveVersion(data: Record<string, unknown>): Record<string, unknown> {
  return { ...data, voided: false, voidedAt: null, voidedBy: null, voidReason: '' }
}

/** Customers CSV next to the JSON: easy to open in Excel; not used for restore. */
export function customersCsv(customers: readonly Customer[], date: (ms: Millis) => string): string {
  const header = csvLine(['name', 'mobile', 'address', 'total_due_taka', 'last_payment', 'last_transaction', 'added', 'archived', 'note'])
  const rows = [...customers]
    .sort((a, b) => b.totalDuePaisa - a.totalDuePaisa)
    .map((c) =>
      csvLine([
        c.name,
        c.mobile,
        c.address,
        taka(c.totalDuePaisa),
        c.lastPaymentAt ? date(c.lastPaymentAt) : '',
        c.lastTxnAt ? date(c.lastTxnAt) : '',
        date(c.createdAt),
        c.archived ? 'yes' : '',
        c.note,
      ]),
    )
  return `${[header, ...rows].join('\n')}\n`
}

export const BACKUP_REMIND_DAYS = 7

/** Days since the last backup, or null when there has never been one. */
export function daysSinceBackup(lastExportAt: Millis, now: Millis): number | null {
  if (!lastExportAt) return null
  return Math.floor((now - lastExportAt) / 86_400_000)
}
