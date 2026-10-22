// Supplier / company price list (CSV) → plan of changes to the shop's medicine list (ARCHITECTURE §6).
// normalize → validate → match → diff. Applying the plan only ever touches source fields:
// shop price overrides, status and old bills are never changed; nothing is deleted.
import { parseDateDMY } from './dates'
import { medicineKey, normalizeDosageForm, parsePackDescription } from './medicines'
import { parseMoney } from './money'
import type { Medicine, Millis, Paisa, SourceRecord } from './types'

export const MEDICINE_CSV_COLUMNS = [
  'brand_name',
  'generic_name',
  'strength',
  'dosage_form',
  'manufacturer',
  'unit_price',
  'strip_price',
  'pack_price',
  'pack_description',
  'pieces_per_strip',
  'pieces_per_pack',
  'source_url',
  'source_date',
] as const

export const MEDICINE_TEMPLATE_CSV =
  `${MEDICINE_CSV_COLUMNS.join(',')}\n` +
  'Napa,Paracetamol,500 mg,Tablet,Beximco Pharmaceuticals Ltd.,1.20,12,600,50 x 10,10,500,,22/10/2026\n' +
  'Seclo,Omeprazole,20 mg,Capsule,Square Pharmaceuticals PLC,6,60,,10 x 10,,,,22/10/2026\n'

export type CsvIssue = 'brand' | 'price' | 'pieces' | 'url' | 'date' | 'duplicate' | 'ambiguous'

export interface CsvRow {
  line: number
  record: SourceRecord | null
  issues: CsvIssue[]
}

function cell(r: Record<string, string>, name: string): string {
  for (const [k, v] of Object.entries(r)) if (k.trim().toLowerCase().replace(/\s+/g, '_') === name) return (v ?? '').replace(/\s+/g, ' ').trim()
  return ''
}

/** Rows from PapaParse (header: true) → normalized source records, with problems listed per row. */
export function medicineRowsFromCsv(records: readonly Record<string, string>[]): CsvRow[] {
  const seen = new Set<string>()
  return records.map((r, i) => {
    const issues: CsvIssue[] = []
    const brandName = cell(r, 'brand_name')
    if (!brandName) issues.push('brand')

    const price = (name: string): Paisa | undefined => {
      const text = cell(r, name)
      if (!text) return undefined
      const p = parseMoney(text)
      if (p === null) issues.push('price')
      return p ?? undefined
    }
    const pieces = (name: string): number | undefined => {
      const text = cell(r, name)
      if (!text) return undefined
      const n = Number(text)
      if (!Number.isInteger(n) || n <= 0 || n > 10_000) {
        issues.push('pieces')
        return undefined
      }
      return n
    }

    const packDescription = cell(r, 'pack_description')
    const fromPack = parsePackDescription(packDescription)
    const sourceUrl = cell(r, 'source_url')
    if (sourceUrl && !/^https:\/\/\S+$/i.test(sourceUrl)) issues.push('url')
    const dateText = cell(r, 'source_date')
    let sourceUpdatedAt: Millis | undefined
    if (dateText) {
      const d = parseDateDMY(dateText)
      if (d === null) issues.push('date')
      else sourceUpdatedAt = d
    }

    const record: SourceRecord = {
      sourceName: 'csv',
      brandName,
      genericName: cell(r, 'generic_name') || undefined,
      strength: cell(r, 'strength'),
      dosageForm: normalizeDosageForm(cell(r, 'dosage_form')),
      manufacturer: cell(r, 'manufacturer') || undefined,
      packDescription: packDescription || undefined,
      piecesPerStrip: pieces('pieces_per_strip') ?? fromPack.piecesPerStrip ?? undefined,
      piecesPerPack: pieces('pieces_per_pack') ?? fromPack.piecesPerPack ?? undefined,
      unitPricePaisa: price('unit_price'),
      stripPricePaisa: price('strip_price'),
      packPricePaisa: price('pack_price'),
      sourceUrl: sourceUrl || undefined,
      sourceUpdatedAt,
      raw: r,
    }
    if (brandName) {
      const key = medicineKey({ brandName, strength: record.strength ?? '', dosageForm: record.dosageForm ?? '' })
      if (seen.has(key)) issues.push('duplicate')
      seen.add(key)
    }
    return { line: i + 2, record: issues.length ? null : record, issues }
  })
}

/** Medicine fields an import may set (the "source layer"). Shop prices and status are not here on purpose. */
export type ImportField =
  | 'genericName'
  | 'manufacturer'
  | 'packDescription'
  | 'piecesPerStrip'
  | 'piecesPerPack'
  | 'sourceUnitPricePaisa'
  | 'sourceStripPricePaisa'
  | 'sourcePackPricePaisa'
  | 'sourceUrl'
  | 'sourceUpdatedAt'

export interface FieldChange {
  field: ImportField
  before: string | number | null
  after: string | number | null
}

export interface PlanItem {
  line: number
  kind: 'new' | 'changed' | 'unchanged'
  record: SourceRecord
  /** The shop medicine this row updates (null for new). */
  medicine: Medicine | null
  changes: FieldChange[]
}

export interface ImportPlan {
  items: PlanItem[]
  /** Rows that cannot be imported, with the reason. */
  errors: CsvRow[]
}

/** Only fields the file actually gives are compared — an empty cell never wipes existing data. */
function sourceValues(r: SourceRecord): Partial<Record<ImportField, string | number>> {
  const v: Partial<Record<ImportField, string | number | undefined>> = {
    genericName: r.genericName,
    manufacturer: r.manufacturer,
    packDescription: r.packDescription,
    piecesPerStrip: r.piecesPerStrip,
    piecesPerPack: r.piecesPerPack,
    sourceUnitPricePaisa: r.unitPricePaisa,
    sourceStripPricePaisa: r.stripPricePaisa,
    sourcePackPricePaisa: r.packPricePaisa,
    sourceUrl: r.sourceUrl,
    sourceUpdatedAt: r.sourceUpdatedAt,
  }
  return Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined && x !== '')) as Partial<
    Record<ImportField, string | number>
  >
}

export function planMedicineImport(rows: readonly CsvRow[], medicines: readonly Medicine[]): ImportPlan {
  const byKey = new Map<string, Medicine[]>()
  for (const m of medicines) {
    const k = medicineKey(m)
    byKey.set(k, [...(byKey.get(k) ?? []), m])
  }
  const items: PlanItem[] = []
  const errors: CsvRow[] = rows.filter((r) => r.issues.length > 0)
  for (const row of rows) {
    if (!row.record) continue
    const r = row.record
    const matches = byKey.get(medicineKey({ brandName: r.brandName, strength: r.strength ?? '', dosageForm: r.dosageForm ?? '' })) ?? []
    if (matches.length > 1) {
      errors.push({ line: row.line, record: null, issues: ['ambiguous'] })
      continue
    }
    const m = matches[0] ?? null
    if (!m) {
      items.push({ line: row.line, kind: 'new', record: r, medicine: null, changes: [] })
      continue
    }
    const changes: FieldChange[] = []
    for (const [field, after] of Object.entries(sourceValues(r)) as [ImportField, string | number][]) {
      const before = m[field] ?? null
      if (before !== after) changes.push({ field, before, after })
    }
    items.push({ line: row.line, kind: changes.length ? 'changed' : 'unchanged', record: r, medicine: m, changes })
  }
  errors.sort((a, b) => a.line - b.line)
  return { items, errors }
}

/** Shop medicine fields to write for a new row (source layer only; no shop prices). */
export function newMedicineFields(r: SourceRecord): Pick<
  Medicine,
  | 'brandName'
  | 'genericName'
  | 'strength'
  | 'dosageForm'
  | 'manufacturer'
  | 'dosageText'
  | 'packDescription'
  | 'piecesPerStrip'
  | 'piecesPerPack'
  | 'sourceUnitPricePaisa'
  | 'sourceStripPricePaisa'
  | 'sourcePackPricePaisa'
  | 'sourceUrl'
  | 'sourceUpdatedAt'
> {
  return {
    brandName: r.brandName,
    genericName: r.genericName ?? '',
    strength: r.strength ?? '',
    dosageForm: r.dosageForm ?? '',
    manufacturer: r.manufacturer ?? '',
    dosageText: r.dosageForm ?? '',
    packDescription: r.packDescription ?? '',
    piecesPerStrip: r.piecesPerStrip ?? null,
    piecesPerPack: r.piecesPerPack ?? null,
    sourceUnitPricePaisa: r.unitPricePaisa ?? null,
    sourceStripPricePaisa: r.stripPricePaisa ?? null,
    sourcePackPricePaisa: r.packPricePaisa ?? null,
    sourceUrl: r.sourceUrl ?? null,
    sourceUpdatedAt: r.sourceUpdatedAt ?? null,
  }
}
