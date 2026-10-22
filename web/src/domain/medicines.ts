// Medicine master-data rules (ARCHITECTURE §5): input cleaning, pack text parsing, price-change log, sync cursor.
import { toEnglishDigits } from './digits'
import { DomainError } from './errors'
import type { Medicine, Millis, Paisa } from './types'

/** Fields the owner edits by hand. Prices typed here are SHOP prices (imports never touch them). */
export interface MedicineInput {
  brandName: string
  genericName: string
  strength: string
  dosageForm: string
  manufacturer: string
  packDescription: string
  piecesPerStrip: number | null
  piecesPerPack: number | null
  shopUnitPricePaisa: Paisa | null
  shopStripPricePaisa: Paisa | null
  shopPackPricePaisa: Paisa | null
  sourceUrl: string | null
}

const FORM_ALIASES: Record<string, string> = {
  tab: 'Tablet',
  tabs: 'Tablet',
  tablet: 'Tablet',
  cap: 'Capsule',
  caps: 'Capsule',
  capsule: 'Capsule',
  syp: 'Syrup',
  syr: 'Syrup',
  syrup: 'Syrup',
  susp: 'Suspension',
  suspension: 'Suspension',
  inj: 'Injection',
  injection: 'Injection',
  drop: 'Drops',
  drops: 'Drops',
  oint: 'Ointment',
  ointment: 'Ointment',
  cream: 'Cream',
  gel: 'Gel',
  sachet: 'Sachet',
  supp: 'Suppository',
  suppository: 'Suppository',
  inh: 'Inhaler',
  inhaler: 'Inhaler',
}

/** "Tab." → "Tablet", "syp" → "Syrup"; unknown forms are kept as typed (trimmed). */
export function normalizeDosageForm(form: string): string {
  const t = form.replace(/\s+/g, ' ').trim()
  const key = t.toLowerCase().replace(/\.$/, '')
  return FORM_ALIASES[key] ?? t
}

/**
 * Read strip/pack sizes from pack text.
 * "10 x 10" → strip 10, pack 100 · "2 x 10" → strip 10, pack 20 · "3x14's" → strip 14, pack 42
 * "10's" / "10 pcs" → strip 10 · "100 ml bottle" → nothing.
 */
export function parsePackDescription(text: string): { piecesPerStrip: number | null; piecesPerPack: number | null } {
  const s = toEnglishDigits(text).toLowerCase()
  const grid = /(\d{1,4})\s*[x×*]\s*(\d{1,4})(?![\d.])(?!\s*(?:ml|mg|g|gm|mcg|l)\b)/.exec(s)
  if (grid) {
    const strips = Number(grid[1])
    const per = Number(grid[2])
    if (strips > 0 && per > 0) return { piecesPerStrip: per, piecesPerPack: strips * per }
  }
  const count = /(\d{1,4})\s*(?:'s|s\b|pcs?\b|pieces?\b|tabs?\b|caps?\b)/.exec(s)
  if (count && Number(count[1]) > 0) return { piecesPerStrip: Number(count[1]), piecesPerPack: null }
  return { piecesPerStrip: null, piecesPerPack: null }
}

function cleanText(s: string, max: number): string {
  return s.replace(/\s+/g, ' ').trim().slice(0, max)
}

function cleanPieces(n: number | null): number | null {
  if (n === null) return null
  if (!Number.isInteger(n) || n <= 0 || n > 10_000) throw new DomainError('INVALID_QTY')
  return n
}

function cleanPrice(p: Paisa | null): Paisa | null {
  if (p === null) return null
  if (!Number.isSafeInteger(p) || p < 0) throw new DomainError('INVALID_PRICE')
  return p
}

function cleanUrl(url: string | null): string | null {
  const u = (url ?? '').trim()
  if (!u) return null
  if (!/^https:\/\/[^\s]+$/i.test(u)) throw new DomainError('INVALID_URL')
  return u
}

export function cleanMedicineInput(input: MedicineInput): MedicineInput {
  const brandName = cleanText(input.brandName, 120)
  if (!brandName) throw new DomainError('NAME_REQUIRED')
  return {
    brandName,
    genericName: cleanText(input.genericName, 200),
    strength: cleanText(input.strength, 80),
    dosageForm: normalizeDosageForm(cleanText(input.dosageForm, 60)),
    manufacturer: cleanText(input.manufacturer, 120),
    packDescription: cleanText(input.packDescription, 80),
    piecesPerStrip: cleanPieces(input.piecesPerStrip),
    piecesPerPack: cleanPieces(input.piecesPerPack),
    shopUnitPricePaisa: cleanPrice(input.shopUnitPricePaisa),
    shopStripPricePaisa: cleanPrice(input.shopStripPricePaisa),
    shopPackPricePaisa: cleanPrice(input.shopPackPricePaisa),
    sourceUrl: cleanUrl(input.sourceUrl),
  }
}

export function medicineToInput(m: Medicine): MedicineInput {
  return {
    brandName: m.brandName,
    genericName: m.genericName,
    strength: m.strength,
    dosageForm: m.dosageForm,
    manufacturer: m.manufacturer,
    packDescription: m.packDescription,
    piecesPerStrip: m.piecesPerStrip,
    piecesPerPack: m.piecesPerPack,
    shopUnitPricePaisa: m.shopUnitPricePaisa,
    shopStripPricePaisa: m.shopStripPricePaisa,
    shopPackPricePaisa: m.shopPackPricePaisa,
    sourceUrl: m.sourceUrl,
  }
}

export type ShopPriceField = 'shopUnitPricePaisa' | 'shopStripPricePaisa' | 'shopPackPricePaisa'
const SHOP_PRICE_FIELDS: ShopPriceField[] = ['shopUnitPricePaisa', 'shopStripPricePaisa', 'shopPackPricePaisa']

export interface PriceChange {
  field: ShopPriceField
  oldPaisa: Paisa | null
  newPaisa: Paisa | null
}

/** Shop price changes between two versions — each becomes a medicinePriceHistory entry. */
export function shopPriceChanges(
  before: Pick<Medicine, ShopPriceField> | null,
  after: Pick<MedicineInput, ShopPriceField>,
): PriceChange[] {
  const changes: PriceChange[] = []
  for (const field of SHOP_PRICE_FIELDS) {
    const oldPaisa = before ? before[field] : null
    const newPaisa = after[field]
    if (oldPaisa !== newPaisa) changes.push({ field, oldPaisa, newPaisa })
  }
  return changes
}

/** "napa|500 mg|tablet" — identifies a medicine across lists (shop list, MedEx list, supplier files). */
export function medicineKey(m: { brandName: string; strength: string; dosageForm: string }): string {
  return [m.brandName, m.strength, m.dosageForm].map((x) => x.replace(/\s+/g, ' ').trim().toLowerCase()).join('|')
}

/** Re-read a short window before the cursor so a doc committed with a slightly older server time is not missed. */
export const SYNC_OVERLAP_MS = 60_000

export function syncQueryStart(cursor: Millis | null): Millis {
  return cursor === null ? 0 : Math.max(0, cursor - SYNC_OVERLAP_MS)
}

/** New cursor after a page of synced docs: the newest server time seen (never moves backwards). */
export function advanceCursor(cursor: Millis | null, updatedAts: readonly (Millis | null)[]): Millis | null {
  let next = cursor
  for (const t of updatedAts) if (t !== null && (next === null || t > next)) next = t
  return next
}
