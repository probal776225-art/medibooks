import { describe, expect, it } from 'vitest'
import type { DomainError } from './errors'
import { makeMedicine } from './fixtures'
import {
  advanceCursor,
  cleanMedicineInput,
  medicineToInput,
  normalizeDosageForm,
  parsePackDescription,
  shopPriceChanges,
  SYNC_OVERLAP_MS,
  syncQueryStart,
  type MedicineInput,
} from './medicines'

const base: MedicineInput = {
  brandName: ' Napa ',
  genericName: 'Paracetamol',
  strength: '500 mg',
  dosageForm: 'tab.',
  manufacturer: 'Beximco',
  packDescription: '50 x 10',
  piecesPerStrip: 10,
  piecesPerPack: 500,
  shopUnitPricePaisa: 120,
  shopStripPricePaisa: null,
  shopPackPricePaisa: null,
  sourceUrl: '',
}

function code(fn: () => unknown): string {
  try {
    fn()
  } catch (e) {
    return (e as DomainError).code
  }
  return 'no error'
}

describe('normalizeDosageForm', () => {
  it.each([
    ['Tab.', 'Tablet'],
    ['cap', 'Capsule'],
    ['SYP', 'Syrup'],
    ['Inj', 'Injection'],
    ['Powder for Suspension', 'Powder for Suspension'],
    ['  Eye   Drop ', 'Eye Drop'],
  ])('%s → %s', (input, out) => expect(normalizeDosageForm(input)).toBe(out))
})

describe('parsePackDescription', () => {
  it.each([
    ['10 x 10', 10, 100],
    ['2 x 10', 10, 20],
    ['3x14\'s', 14, 42],
    ['5 × 6', 6, 30],
    ['১০ x ১০', 10, 100],
    ["10's", 10, null],
    ['30 pcs', 30, null],
    ['100 ml bottle', null, null],
    ['1 x 100 ml', null, null],
    ['', null, null],
  ])('%j → strip %s, pack %s', (text, strip, pack) => {
    expect(parsePackDescription(text)).toEqual({ piecesPerStrip: strip, piecesPerPack: pack })
  })
})

describe('cleanMedicineInput', () => {
  it('trims, normalizes form, keeps valid values', () => {
    expect(cleanMedicineInput(base)).toMatchObject({ brandName: 'Napa', dosageForm: 'Tablet', sourceUrl: null })
  })

  it('validates', () => {
    expect(code(() => cleanMedicineInput({ ...base, brandName: '  ' }))).toBe('NAME_REQUIRED')
    expect(code(() => cleanMedicineInput({ ...base, piecesPerStrip: 0 }))).toBe('INVALID_QTY')
    expect(code(() => cleanMedicineInput({ ...base, piecesPerPack: 2.5 }))).toBe('INVALID_QTY')
    expect(code(() => cleanMedicineInput({ ...base, shopUnitPricePaisa: -1 }))).toBe('INVALID_PRICE')
    expect(code(() => cleanMedicineInput({ ...base, sourceUrl: 'javascript:alert(1)' }))).toBe('INVALID_URL')
    expect(code(() => cleanMedicineInput({ ...base, sourceUrl: 'http://medex.com.bd/x' }))).toBe('INVALID_URL')
    expect(cleanMedicineInput({ ...base, sourceUrl: ' https://medex.com.bd/brands/1/x ' }).sourceUrl).toBe(
      'https://medex.com.bd/brands/1/x',
    )
  })
})

describe('shopPriceChanges', () => {
  it('lists only changed shop price fields', () => {
    const m = makeMedicine({ shopUnitPricePaisa: 120, shopStripPricePaisa: null })
    expect(shopPriceChanges(m, { ...medicineToInput(m) })).toEqual([])
    expect(shopPriceChanges(m, { ...medicineToInput(m), shopUnitPricePaisa: 150, shopStripPricePaisa: 1400 })).toEqual([
      { field: 'shopUnitPricePaisa', oldPaisa: 120, newPaisa: 150 },
      { field: 'shopStripPricePaisa', oldPaisa: null, newPaisa: 1400 },
    ])
    expect(shopPriceChanges(null, base)).toEqual([{ field: 'shopUnitPricePaisa', oldPaisa: null, newPaisa: 120 }])
  })
})

describe('sync cursor', () => {
  it('starts from zero, overlaps a little, never moves backwards', () => {
    expect(syncQueryStart(null)).toBe(0)
    expect(syncQueryStart(1_000_000)).toBe(1_000_000 - SYNC_OVERLAP_MS)
    expect(syncQueryStart(10)).toBe(0)
    expect(advanceCursor(null, [])).toBeNull()
    expect(advanceCursor(null, [5, null, 9, 7])).toBe(9)
    expect(advanceCursor(20, [5, 9])).toBe(20)
  })
})
