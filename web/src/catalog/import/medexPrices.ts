// MedEx price file (owner-supplied CSV, used with MedEx's written permission) → prices on the reference list,
// and source-price updates for shop medicines that are the same MedEx brand.
// Columns: Brand Name, Dosage Form, Strength, Generic Name, Company, Unit Price (৳), Pack Info, All Prices, MedEx URL.
// Tablets/capsules carry a per-piece price + the box ("10 x 10: ৳ 500.00"). Liquids, tubes, vials … have no
// per-piece price; "All Prices" lists each size ("100 ml bottle: ৳40.00") and the first one becomes the piece
// price (one bottle = one piece), the same way the shop list stores syrups.
import { medicineKey, normalizeDosageForm, parsePackDescription } from '../../domain/medicines'
import { sourceChanges, type PlanItem } from '../../domain/medicineCsv'
import { parseMoney } from '../../domain/money'
import type { Medicine, Paisa, SourceRecord } from '../../domain/types'
import type { RefMedicine } from './medexRef'

export const MEDEX_PRICE_COLUMNS = {
  brandName: 'brand name',
  dosageForm: 'dosage form',
  strength: 'strength',
  genericName: 'generic name',
  manufacturer: 'company',
  unitPrice: 'unit price (৳)',
  packInfo: 'pack info',
  allPrices: 'all prices',
  url: 'medex url',
} as const

const LINK = /^https:\/\/medex\.com\.bd\/brands\/(\d+)\/([a-z0-9-]+)\/?$/

/** Price fields a reference row can carry (all empty when the file had no price for it). */
export type RefPrice = Required<Pick<RefMedicine, 'unitPricePaisa' | 'packPricePaisa' | 'packDescription' | 'priceText'>>

const NO_PRICE: RefPrice = { unitPricePaisa: null, packPricePaisa: null, packDescription: '', priceText: '' }

const taka = (text: string): Paisa | null => parseMoney(text.replace(/৳/g, ''))

/** "10 x 10: ৳ 500.00" → ["10 x 10", 50000] (the description may itself hold a colon-free size). */
function sizeAndPrice(text: string): [string, Paisa] | null {
  const i = text.lastIndexOf(':')
  if (i < 0) return null
  const price = taka(text.slice(i + 1))
  const size = text.slice(0, i).replace(/\s+/g, ' ').trim()
  return price === null || !size ? null : [size, price]
}

export function parseMedexPrice(unitPrice: string, packInfo: string, allPrices: string): RefPrice {
  const priceText = allPrices.replace(/\s+/g, ' ').trim().slice(0, 240)
  const unit = unitPrice.trim() ? taka(unitPrice) : null
  if (unit !== null) {
    const pack = sizeAndPrice(packInfo)
    return { unitPricePaisa: unit, packPricePaisa: pack?.[1] ?? null, packDescription: pack?.[0] ?? '', priceText }
  }
  // No per-piece price column: the first listed size is the selling unit. Parts look like
  // "Unit Price: ৳7.00 (1 x 15: ৳ 105.00)", "2 ml ampoule: ৳150.00 (1 x 5: ৳ 750.00)" or "100 ml bottle: ৳40.00".
  for (const part of priceText.split('|').map((p) => p.trim())) {
    const m = /^(.+?):\s*৳\s*([\d.,]+)\s*(?:\((.+)\))?$/.exec(part)
    const price = m ? taka(m[2]!) : null
    if (!m || price === null) continue
    const pack = m[3] ? sizeAndPrice(m[3]) : null
    const size = /^unit price$/i.test(m[1]!.trim()) ? '' : m[1]!.trim()
    return { unitPricePaisa: price, packPricePaisa: pack?.[1] ?? null, packDescription: pack?.[0] ?? size, priceText }
  }
  return { ...NO_PRICE, priceText }
}

export const hasRefPrice = (r: Pick<RefMedicine, 'unitPricePaisa'>): boolean =>
  r.unitPricePaisa !== null && r.unitPricePaisa !== undefined

export interface MedexPriceParse {
  rows: RefMedicine[]
  /** Rows without a usable brand or MedEx link. */
  skipped: number
  /** Rows kept (names are still useful) but with no price at all. */
  noPrice: number
}

const header = (records: readonly Record<string, string>[]) =>
  new Set(Object.keys(records[0] ?? {}).map((k) => k.replace(/^﻿/, '').trim().toLowerCase()))

/** True when the CSV has the MedEx price columns. */
export function isMedexPriceCsv(records: readonly Record<string, string>[]): boolean {
  const h = header(records)
  return Object.values(MEDEX_PRICE_COLUMNS).every((c) => h.has(c))
}

export function parseMedexPriceCsv(records: readonly Record<string, string>[]): MedexPriceParse {
  const byId = new Map<string, RefMedicine>()
  let skipped = 0
  for (const r of records) {
    const cells = new Map(Object.entries(r).map(([k, v]) => [k.replace(/^﻿/, '').trim().toLowerCase(), (v ?? '').replace(/\s+/g, ' ').trim()]))
    const cell = (k: keyof typeof MEDEX_PRICE_COLUMNS) => cells.get(MEDEX_PRICE_COLUMNS[k]) ?? ''
    const link = LINK.exec(cell('url'))
    if (!cell('brandName') || !link) {
      if ([...cells.values()].some(Boolean)) skipped++
      continue
    }
    byId.set(link[1]!, {
      id: link[1]!,
      brandName: cell('brandName'),
      dosageForm: cell('dosageForm'),
      strength: cell('strength'),
      genericName: cell('genericName'),
      manufacturer: cell('manufacturer'),
      slug: link[2]!,
      herbal: false,
      ...parseMedexPrice(cell('unitPrice'), cell('packInfo'), cell('allPrices')),
    })
  }
  const rows = [...byId.values()]
  return { rows, skipped, noPrice: rows.filter((x) => !hasRefPrice(x)).length }
}

export interface RefMerge {
  items: RefMedicine[]
  /** Brands already in the list that got a price. */
  updated: number
  /** Brands the list did not have yet (added with their price). */
  added: number
  /** Brands in the merged list that now have a price. */
  priced: number
}

/** Put the file's prices on the reference list by MedEx id. Names come from the list; a row without a price changes nothing. */
export function mergeRefPrices(list: readonly RefMedicine[], rows: readonly RefMedicine[]): RefMerge {
  const byId = new Map(list.map((r) => [r.id, r]))
  let updated = 0
  let added = 0
  for (const row of rows) {
    const old = byId.get(row.id)
    if (!old) {
      byId.set(row.id, row)
      added++
    } else if (hasRefPrice(row)) {
      const price: RefPrice = {
        unitPricePaisa: row.unitPricePaisa ?? null,
        packPricePaisa: row.packPricePaisa ?? null,
        packDescription: row.packDescription ?? '',
        priceText: row.priceText ?? '',
      }
      byId.set(row.id, { ...old, ...price })
      updated++
    }
  }
  const items = [...byId.values()]
  return { items, updated, added, priced: items.filter(hasRefPrice).length }
}

/** A new brand list (xlsx) keeps the prices the old list had, by MedEx id. */
export function carryRefPrices(next: readonly RefMedicine[], old: readonly RefMedicine[]): RefMedicine[] {
  const priced = new Map(old.filter(hasRefPrice).map((r) => [r.id, r]))
  return next.map((r) => {
    const p = priced.get(r.id)
    return p && !hasRefPrice(r)
      ? { ...r, unitPricePaisa: p.unitPricePaisa, packPricePaisa: p.packPricePaisa, packDescription: p.packDescription, priceText: p.priceText }
      : r
  })
}

/** Source-layer values for a shop medicine (prices, pack, link). Names stay as the owner has them. */
export function medexSourceRecord(row: RefMedicine, url: string): SourceRecord {
  const pieces = parsePackDescription(row.packDescription ?? '')
  const unit = row.unitPricePaisa ?? undefined
  return {
    sourceName: 'medex',
    sourceId: row.id,
    sourceUrl: url,
    brandName: row.brandName,
    strength: row.strength,
    dosageForm: normalizeDosageForm(row.dosageForm),
    packDescription: row.packDescription || undefined,
    piecesPerStrip: pieces.piecesPerStrip ?? undefined,
    piecesPerPack: pieces.piecesPerPack ?? undefined,
    unitPricePaisa: unit,
    // A strip is never priced separately on MedEx; strip = piece × pieces keeps an older strip price from winning.
    stripPricePaisa: unit !== undefined && pieces.piecesPerStrip ? unit * pieces.piecesPerStrip : undefined,
    packPricePaisa: row.packPricePaisa ?? undefined,
    raw: {},
  }
}

/**
 * Shop medicines the file prices: same MedEx id first, else the one shop medicine with the same
 * name + strength + form. Rows that match nothing stay in the reference list only (not added to the shop).
 */
export function planMedexShopUpdates(
  rows: readonly RefMedicine[],
  medicines: readonly Medicine[],
  url: (r: RefMedicine) => string,
): PlanItem[] {
  const byMedexId = new Map(medicines.filter((m) => m.sourceName === 'medex' && m.sourceId).map((m) => [m.sourceId!, m]))
  const byKey = new Map<string, Medicine[]>()
  for (const m of medicines) byKey.set(medicineKey(m), [...(byKey.get(medicineKey(m)) ?? []), m])
  const used = new Set<string>()
  const items: PlanItem[] = []
  rows.forEach((row, i) => {
    if (!hasRefPrice(row)) return
    const record = medexSourceRecord(row, url(row))
    const sameKey = byKey.get(medicineKey({ brandName: row.brandName, strength: row.strength, dosageForm: record.dosageForm ?? '' })) ?? []
    const m = byMedexId.get(row.id) ?? (sameKey.length === 1 ? sameKey[0] : undefined)
    if (!m || used.has(m.id)) return
    used.add(m.id)
    const changes = sourceChanges(record, m)
    items.push({ line: i + 2, kind: changes.length ? 'changed' : 'unchanged', record, medicine: m, changes })
  })
  return items
}
