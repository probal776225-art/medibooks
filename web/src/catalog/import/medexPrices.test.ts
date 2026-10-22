import { describe, expect, it } from 'vitest'
import { makeMedicine } from '../../domain/fixtures'
import { refUrl, type RefMedicine } from './medexRef'
import {
  carryRefPrices,
  isMedexPriceCsv,
  mergeRefPrices,
  parseMedexPrice,
  parseMedexPriceCsv,
  planMedexShopUpdates,
} from './medexPrices'
import { packRefCatalog, unpackRefCatalog } from './refPack'

const row = (over: Record<string, string>): Record<string, string> => ({
  '﻿Brand Name': 'Napa',
  'Dosage Form': 'Tablet',
  Strength: '500 mg',
  'Generic Name': 'Paracetamol',
  Company: 'Beximco Pharmaceuticals Ltd.',
  'Unit Price (৳)': '1.20',
  'Pack Info': '50 x 10: ৳ 600.00',
  'All Prices': 'Unit Price: ৳1.20 (50 x 10: ৳ 600.00)',
  'MedEx URL': 'https://medex.com.bd/brands/7701/napa-500-mg-tablet',
  ...over,
})

const ref = (id: string, over: Partial<RefMedicine> = {}): RefMedicine => ({
  id,
  brandName: 'Napa',
  dosageForm: 'Tablet',
  strength: '500 mg',
  genericName: 'Paracetamol',
  manufacturer: 'Beximco Pharmaceuticals Ltd.',
  slug: 'napa-500-mg-tablet',
  herbal: false,
  ...over,
})

describe('parseMedexPrice', () => {
  it('reads a per-piece price with its box', () => {
    expect(parseMedexPrice('5.00', '10 x 10: ৳ 500.00', 'Unit Price: ৳5.00 (10 x 10: ৳ 500.00)')).toEqual({
      unitPricePaisa: 500,
      packPricePaisa: 50_000,
      packDescription: '10 x 10',
      priceText: 'Unit Price: ৳5.00 (10 x 10: ৳ 500.00)',
    })
  })

  it('uses the first size as the piece price for liquids', () => {
    expect(parseMedexPrice('', '', '60 ml bottle: ৳35.00 | 100 ml bottle: ৳50.00')).toMatchObject({
      unitPricePaisa: 3_500,
      packPricePaisa: null,
      packDescription: '60 ml bottle',
    })
  })

  it('reads a per-piece price that only appears in All Prices', () => {
    expect(parseMedexPrice('', '', 'Unit Price: ৳7.00 (1 x 15: ৳ 105.00) | Unit Price: ৳7.00 (1 x 30: ৳ 210.00)')).toMatchObject({
      unitPricePaisa: 700,
      packPricePaisa: 10_500,
      packDescription: '1 x 15',
    })
  })

  it('reads a per-item price with its box (ampoules, sachets, vials)', () => {
    expect(parseMedexPrice('', '', '2 ml ampoule: ৳150.00 (1 x 5: ৳ 750.00)')).toMatchObject({
      unitPricePaisa: 15_000,
      packPricePaisa: 75_000,
      packDescription: '1 x 5',
    })
    expect(parseMedexPrice('', '', "100 mg sachet: ৳10.00 (20's pack: ৳ 200.00)")).toMatchObject({
      unitPricePaisa: 1_000,
      packPricePaisa: 20_000,
      packDescription: "20's pack",
    })
  })

  it('gives no price when there is none', () => {
    expect(parseMedexPrice('', '', '').unitPricePaisa).toBeNull()
  })
})

describe('parseMedexPriceCsv', () => {
  it('recognises the file and keeps rows by MedEx id', () => {
    const records = [
      row({}),
      row({ 'Brand Name': 'Ace Syrup', 'Unit Price (৳)': '', 'Pack Info': '', 'All Prices': '100 ml bottle: ৳40.00', 'MedEx URL': 'https://medex.com.bd/brands/7702/ace-syrup' }),
      row({ 'Brand Name': 'Plain', 'Unit Price (৳)': '', 'Pack Info': '', 'All Prices': '', 'MedEx URL': 'https://medex.com.bd/brands/7703/plain' }),
      row({ 'MedEx URL': 'https://example.com/brands/1/x' }),
    ]
    expect(isMedexPriceCsv(records)).toBe(true)
    expect(isMedexPriceCsv([{ brand_name: 'x' }])).toBe(false)
    const parsed = parseMedexPriceCsv(records)
    expect(parsed.rows.map((r) => r.id)).toEqual(['7701', '7702', '7703'])
    expect(parsed.skipped).toBe(1)
    expect(parsed.noPrice).toBe(1)
    expect(parsed.rows[0]).toMatchObject({ brandName: 'Napa', unitPricePaisa: 120, packPricePaisa: 60_000, slug: 'napa-500-mg-tablet' })
  })
})

describe('reference list prices', () => {
  it('merges prices by id, adds unknown brands, keeps the list names', () => {
    const list = [ref('1', { brandName: 'Napa (list)' }), ref('2')]
    const rows = [
      ref('1', { unitPricePaisa: 120, packPricePaisa: 60_000, packDescription: '50 x 10', priceText: 't' }),
      ref('2', { unitPricePaisa: null }),
      ref('3', { unitPricePaisa: 500, packDescription: '10 x 10' }),
    ]
    const m = mergeRefPrices(list, rows)
    expect(m).toMatchObject({ updated: 1, added: 1, priced: 2 })
    expect(m.items.find((r) => r.id === '1')).toMatchObject({ brandName: 'Napa (list)', unitPricePaisa: 120 })
    expect(m.items.find((r) => r.id === '2')?.unitPricePaisa).toBeUndefined()
  })

  it('keeps prices when a new brand list replaces the old one', () => {
    const next = carryRefPrices([ref('1'), ref('9')], [ref('1', { unitPricePaisa: 120, priceText: 'x' })])
    expect(next[0]).toMatchObject({ unitPricePaisa: 120, priceText: 'x' })
    expect(next[1]?.unitPricePaisa).toBeUndefined()
  })

  it('packs and unpacks priced and unpriced rows', () => {
    const items = [ref('1'), ref('2', { unitPricePaisa: 3_500, packPricePaisa: null, packDescription: '60 ml bottle', priceText: '60 ml bottle: ৳35.00' })]
    const packed = packRefCatalog(items)
    expect(unpackRefCatalog(packed.dict, packed.chunks)).toEqual(items)
  })
})

describe('planMedexShopUpdates', () => {
  it('updates the matching shop medicine’s source prices only', () => {
    const shop = [
      makeMedicine({ id: 'a', brandName: 'Napa', strength: '500 mg', dosageForm: 'Tablet', sourceName: 'csv', sourceUnitPricePaisa: 100, shopUnitPricePaisa: 150 }),
      makeMedicine({ id: 'b', brandName: 'Other', strength: '', dosageForm: 'Syrup', sourceName: 'medex', sourceId: '7702' }),
    ]
    const rows = [
      ref('7701', { unitPricePaisa: 120, packPricePaisa: 60_000, packDescription: '50 x 10' }),
      ref('7702', { brandName: 'Ace', dosageForm: 'Syrup', strength: '120 mg/5 ml', unitPricePaisa: 4_000, packDescription: '100 ml bottle' }),
      ref('7703', { brandName: 'Not in shop', unitPricePaisa: 100 }),
    ]
    const items = planMedexShopUpdates(rows, shop, refUrl)
    expect(items.map((i) => i.medicine?.id)).toEqual(['a', 'b'])
    const napa = items[0]!
    expect(napa.record).toMatchObject({ sourceName: 'medex', sourceId: '7701', stripPricePaisa: 1_200 })
    expect(napa.changes.map((c) => c.field)).toEqual(
      expect.arrayContaining(['sourceUnitPricePaisa', 'sourcePackPricePaisa', 'sourceStripPricePaisa', 'sourceUrl']),
    )
    expect(napa.changes.some((c) => String(c.field).startsWith('shop'))).toBe(false)
    expect(items[1]!.changes).toEqual(expect.arrayContaining([{ field: 'sourceUnitPricePaisa', before: 120, after: 4_000 }]))
  })
})
