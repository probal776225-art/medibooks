// Sellable units and prices for a medicine, and building the sale-line snapshot.
// Price priority for a unit: shop override → source price for that unit → piece price × pieces per unit.
import { DomainError } from './errors'
import { assertPaisa } from './money'
import type { Medicine, Paisa, SaleLine, SaleUnit } from './types'

export type StandardUnit = Exclude<SaleUnit, 'custom'>

export interface UnitOption {
  unit: StandardUnit
  piecesPerUnit: number
  /** null when no price is known yet for this unit. */
  pricePaisa: Paisa | null
}

type PriceFields = Pick<
  Medicine,
  | 'piecesPerStrip'
  | 'piecesPerPack'
  | 'sourceUnitPricePaisa'
  | 'sourceStripPricePaisa'
  | 'sourcePackPricePaisa'
  | 'shopUnitPricePaisa'
  | 'shopStripPricePaisa'
  | 'shopPackPricePaisa'
>

function validPieces(n: number | null): n is number {
  return n !== null && Number.isInteger(n) && n > 0
}

export function piecesPerUnit(m: PriceFields, unit: StandardUnit): number | null {
  if (unit === 'piece') return 1
  const n = unit === 'strip' ? m.piecesPerStrip : m.piecesPerPack
  return validPieces(n) ? n : null
}

/** Effective price of one piece (shop override → source). */
export function piecePrice(m: PriceFields): Paisa | null {
  return m.shopUnitPricePaisa ?? m.sourceUnitPricePaisa
}

/** Effective price of one `unit`, or null if it cannot be determined. */
export function effectiveUnitPrice(m: PriceFields, unit: StandardUnit): Paisa | null {
  if (unit === 'piece') return piecePrice(m)
  const pieces = piecesPerUnit(m, unit)
  if (pieces === null) return null
  const explicit =
    unit === 'strip'
      ? (m.shopStripPricePaisa ?? m.sourceStripPricePaisa)
      : (m.shopPackPricePaisa ?? m.sourcePackPricePaisa)
  if (explicit !== null) return explicit
  const piece = piecePrice(m)
  return piece === null ? null : piece * pieces
}

/** Units the sale screen can offer: piece always, strip/pack only when their size is known. */
export function sellableUnits(m: PriceFields): UnitOption[] {
  const units: StandardUnit[] = ['piece', 'strip', 'pack']
  const options: UnitOption[] = []
  for (const unit of units) {
    const pieces = piecesPerUnit(m, unit)
    if (pieces === null) continue
    options.push({ unit, piecesPerUnit: pieces, pricePaisa: effectiveUnitPrice(m, unit) })
  }
  return options
}

/** "Napa 500 mg Tablet" — avoids repeating strength/form already in the brand name. */
export function medicineDisplayName(m: Pick<Medicine, 'brandName' | 'strength' | 'dosageForm'>): string {
  const parts = [m.brandName.trim()]
  const lower = m.brandName.toLowerCase()
  for (const extra of [m.strength, m.dosageForm]) {
    const e = extra.trim()
    if (e && !lower.includes(e.toLowerCase())) parts.push(e)
  }
  return parts.join(' ')
}

export type SaleLineInput =
  | {
      lineNo: number
      medicine: Medicine
      unit: StandardUnit
      qty: number
      /** Omit to charge the effective list price. */
      unitPricePaisa?: Paisa
      discountPaisa?: Paisa
    }
  | {
      lineNo: number
      medicine: Medicine | null
      /** Free-text item when medicine is null. */
      name?: string
      unit: 'custom'
      unitLabel: string
      piecesPerUnit?: number | null
      qty: number
      unitPricePaisa: Paisa
      discountPaisa?: Paisa
    }

function assertQty(qty: number): void {
  if (!Number.isInteger(qty) || qty <= 0) throw new DomainError('INVALID_QTY')
}

function assertPrice(p: Paisa): void {
  if (!Number.isSafeInteger(p) || p < 0) throw new DomainError('INVALID_PRICE')
}

/** Build the immutable snapshot stored on the transaction. */
export function buildSaleLine(input: SaleLineInput): SaleLine {
  assertQty(input.qty)
  const discountPaisa = input.discountPaisa ?? 0
  assertPaisa(discountPaisa, 'discount')

  const m = input.medicine
  let unitLabel: string | null = null
  let pieces: number | null
  let listUnitPricePaisa: Paisa | null
  let unitPricePaisa: Paisa
  let name: string

  if (input.unit === 'custom') {
    unitLabel = input.unitLabel.trim()
    if (!unitLabel) throw new DomainError('UNIT_NOT_AVAILABLE', 'custom unit needs a label')
    const p = input.piecesPerUnit ?? null
    pieces = validPieces(p) ? p : null
    listUnitPricePaisa = null
    unitPricePaisa = input.unitPricePaisa
    name = m ? medicineDisplayName(m) : (input.name ?? '').trim()
  } else {
    if (!m) throw new DomainError('UNIT_NOT_AVAILABLE')
    pieces = piecesPerUnit(m, input.unit)
    if (pieces === null) throw new DomainError('UNIT_NOT_AVAILABLE', `${input.unit} size unknown`)
    listUnitPricePaisa = effectiveUnitPrice(m, input.unit)
    const charged = input.unitPricePaisa ?? listUnitPricePaisa
    if (charged === null || charged === undefined) throw new DomainError('INVALID_PRICE', 'no price known; enter one')
    unitPricePaisa = charged
    name = medicineDisplayName(m)
  }

  if (!name) throw new DomainError('NAME_REQUIRED')
  assertPrice(unitPricePaisa)
  const gross = input.qty * unitPricePaisa
  if (discountPaisa < 0 || discountPaisa > gross) throw new DomainError('LINE_DISCOUNT_EXCEEDS')

  return {
    lineNo: input.lineNo,
    medicineId: m?.id ?? null,
    name,
    genericName: m?.genericName ?? '',
    strength: m?.strength ?? '',
    dosageForm: m?.dosageForm ?? '',
    manufacturer: m?.manufacturer ?? '',
    unit: input.unit,
    unitLabel,
    piecesPerUnit: pieces,
    qty: input.qty,
    listUnitPricePaisa,
    unitPricePaisa,
    priceOverridden: input.unit !== 'custom' && unitPricePaisa !== listUnitPricePaisa,
    discountPaisa,
    lineTotalPaisa: gross - discountPaisa,
  }
}

/** Pieces that leave the shelf for a line (for future stock); null when unknown. */
export function linePieces(line: Pick<SaleLine, 'qty' | 'piecesPerUnit'>): number | null {
  return line.piecesPerUnit === null ? null : line.qty * line.piecesPerUnit
}
