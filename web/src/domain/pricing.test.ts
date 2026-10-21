import { describe, expect, it } from 'vitest'
import { DomainError } from './errors'
import { makeMedicine } from './fixtures'
import { buildSaleLine, effectiveUnitPrice, linePieces, medicineDisplayName, sellableUnits } from './pricing'

describe('medicineDisplayName', () => {
  it('joins brand, strength, form without repeats', () => {
    expect(medicineDisplayName(makeMedicine())).toBe('Napa 500 mg Tablet')
    expect(medicineDisplayName(makeMedicine({ brandName: 'Napa Extra 500 mg' }))).toBe('Napa Extra 500 mg Tablet')
    expect(medicineDisplayName(makeMedicine({ strength: '', dosageForm: '' }))).toBe('Napa')
  })
})

describe('effective prices', () => {
  it('derives strip and pack from the piece price', () => {
    const m = makeMedicine()
    expect(effectiveUnitPrice(m, 'piece')).toBe(120)
    expect(effectiveUnitPrice(m, 'strip')).toBe(1200)
    expect(effectiveUnitPrice(m, 'pack')).toBe(60000)
  })

  it('prefers shop override → source unit price → derived', () => {
    const m = makeMedicine({ sourceStripPricePaisa: 1150, shopUnitPricePaisa: 150 })
    expect(effectiveUnitPrice(m, 'piece')).toBe(150) // shop override wins
    expect(effectiveUnitPrice(m, 'strip')).toBe(1150) // explicit source strip price beats derived
    expect(effectiveUnitPrice(m, 'pack')).toBe(75000) // derived from effective piece price
    expect(effectiveUnitPrice({ ...m, shopStripPricePaisa: 1400 }, 'strip')).toBe(1400)
  })

  it('returns null when nothing is known', () => {
    const m = makeMedicine({ sourceUnitPricePaisa: null, piecesPerStrip: null })
    expect(effectiveUnitPrice(m, 'piece')).toBeNull()
    expect(effectiveUnitPrice(m, 'strip')).toBeNull()
  })

  it('offers only units whose size is known', () => {
    expect(sellableUnits(makeMedicine()).map((u) => u.unit)).toEqual(['piece', 'strip', 'pack'])
    const syrup = makeMedicine({ dosageForm: 'Syrup', piecesPerStrip: null, piecesPerPack: null })
    expect(sellableUnits(syrup)).toEqual([{ unit: 'piece', piecesPerUnit: 1, pricePaisa: 120 }])
    expect(sellableUnits(makeMedicine({ piecesPerStrip: 0 })).map((u) => u.unit)).toEqual(['piece', 'pack'])
  })
})

describe('buildSaleLine', () => {
  it('snapshots the medicine at list price', () => {
    const line = buildSaleLine({ lineNo: 1, medicine: makeMedicine(), unit: 'strip', qty: 2 })
    expect(line).toEqual({
      lineNo: 1,
      medicineId: 'med-napa',
      name: 'Napa 500 mg Tablet',
      genericName: 'Paracetamol',
      strength: '500 mg',
      dosageForm: 'Tablet',
      manufacturer: 'Beximco Pharmaceuticals Ltd.',
      unit: 'strip',
      unitLabel: null,
      piecesPerUnit: 10,
      qty: 2,
      listUnitPricePaisa: 1200,
      unitPricePaisa: 1200,
      priceOverridden: false,
      discountPaisa: 0,
      lineTotalPaisa: 2400,
    })
    expect(linePieces(line)).toBe(20)
  })

  it('marks a custom selling price and applies a line discount', () => {
    const line = buildSaleLine({
      lineNo: 1,
      medicine: makeMedicine(),
      unit: 'piece',
      qty: 7,
      unitPricePaisa: 100,
      discountPaisa: 50,
    })
    expect(line.priceOverridden).toBe(true)
    expect(line.listUnitPricePaisa).toBe(120)
    expect(line.lineTotalPaisa).toBe(650)
  })

  it('allows a price when the master has none (counts as overridden)', () => {
    const m = makeMedicine({ sourceUnitPricePaisa: null })
    const line = buildSaleLine({ lineNo: 1, medicine: m, unit: 'piece', qty: 1, unitPricePaisa: 500 })
    expect(line.listUnitPricePaisa).toBeNull()
    expect(line.priceOverridden).toBe(true)
    expect(() => buildSaleLine({ lineNo: 1, medicine: m, unit: 'piece', qty: 1 })).toThrow(DomainError)
  })

  it('supports custom units and free-text items', () => {
    const line = buildSaleLine({
      lineNo: 1,
      medicine: null,
      name: 'Bandage roll',
      unit: 'custom',
      unitLabel: '১ রোল',
      qty: 3,
      unitPricePaisa: 4500,
    })
    expect(line).toMatchObject({
      medicineId: null,
      name: 'Bandage roll',
      unitLabel: '১ রোল',
      piecesPerUnit: null,
      priceOverridden: false,
      lineTotalPaisa: 13500,
    })
    expect(linePieces(line)).toBeNull()
  })

  it('rejects bad input', () => {
    const m = makeMedicine({ piecesPerPack: null })
    const err = (fn: () => unknown) => {
      try {
        fn()
      } catch (e) {
        return (e as DomainError).code
      }
      return 'no error'
    }
    expect(err(() => buildSaleLine({ lineNo: 1, medicine: m, unit: 'piece', qty: 0 }))).toBe('INVALID_QTY')
    expect(err(() => buildSaleLine({ lineNo: 1, medicine: m, unit: 'piece', qty: 1.5 }))).toBe('INVALID_QTY')
    expect(err(() => buildSaleLine({ lineNo: 1, medicine: m, unit: 'pack', qty: 1 }))).toBe('UNIT_NOT_AVAILABLE')
    expect(err(() => buildSaleLine({ lineNo: 1, medicine: m, unit: 'piece', qty: 1, discountPaisa: 121 }))).toBe(
      'LINE_DISCOUNT_EXCEEDS',
    )
    expect(err(() => buildSaleLine({ lineNo: 1, medicine: m, unit: 'piece', qty: 1, unitPricePaisa: -1 }))).toBe(
      'INVALID_PRICE',
    )
    expect(
      err(() =>
        buildSaleLine({ lineNo: 1, medicine: null, name: ' ', unit: 'custom', unitLabel: 'x', qty: 1, unitPricePaisa: 1 }),
      ),
    ).toBe('NAME_REQUIRED')
  })

  it('snapshot does not change when the medicine changes later', () => {
    const m = makeMedicine()
    const line = buildSaleLine({ lineNo: 1, medicine: m, unit: 'piece', qty: 10 })
    const frozen = structuredClone(line)
    m.sourceUnitPricePaisa = 999
    m.brandName = 'Renamed'
    expect(line).toEqual(frozen)
  })
})
