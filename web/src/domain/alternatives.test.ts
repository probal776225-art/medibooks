import { describe, expect, it } from 'vitest'
import { findAlternatives, genericKey, refAsMedicine } from './alternatives'
import { makeMedicine } from './fixtures'

const ref = (id: string, brandName: string, strength = '500 mg', dosageForm = 'Tablet', unitPricePaisa: number | null = null) => ({
  id,
  brandName,
  genericName: 'Paracetamol',
  strength,
  dosageForm,
  manufacturer: 'X Ltd.',
  unitPricePaisa,
})

describe('alternatives', () => {
  it('treats combination generics in any order, and salt/hydrate names, as the same', () => {
    expect(genericKey('Amlodipine + Olmesartan Medoxomil')).toBe(genericKey('olmesartan medoxomil+ amlodipine'))
    expect(genericKey('Amlodipine Besilate')).toBe(genericKey('Amlodipine'))
    expect(genericKey('Cefixime Trihydrate')).toBe('cefixime')
    expect(genericKey('Diclofenac Sodium')).not.toBe(genericKey('Diclofenac Potassium'))
    expect(genericKey('')).toBe('')
  })

  it('shows a stocked MedEx row as the shop medicine even when the generic text differs', () => {
    const shop = makeMedicine({ id: 'amd10', brandName: 'Amdocal', genericName: 'Amlodipine', strength: '10 mg', dosageForm: 'Tablet', sourceName: 'csv', sourceId: null })
    const refs = [
      { ...ref('m1', 'Amdocal', '10 mg'), genericName: 'Amlodipine Besilate' },
      { ...ref('m2', 'Amlopin', '10 mg'), genericName: 'Amlodipine Besilate' },
    ]
    const alt = findAlternatives({ id: 'x', medexId: 'm3', genericName: 'Amlodipine Besilate', strength: '10 mg', dosageForm: 'Tablet' }, [shop], refs)
    expect(alt.same.map((x) => `${x.kind}:${x.brandName}`).sort()).toEqual(['ref:Amlopin', 'shop:Amdocal'])
  })

  it('splits direct swaps from other strengths/forms, cheapest first, shop rows win over MedEx rows', () => {
    const napa = makeMedicine({ id: 'napa', brandName: 'Napa', genericName: 'Paracetamol', strength: '500 mg', dosageForm: 'Tablet', shopUnitPricePaisa: 120, sourceUnitPricePaisa: null })
    const ace = makeMedicine({ id: 'ace', brandName: 'Ace', genericName: 'Paracetamol', strength: '500mg', dosageForm: 'Tab', sourceName: 'medex', sourceId: 'm-ace', shopUnitPricePaisa: null, sourceUnitPricePaisa: 100 })
    const off = makeMedicine({ id: 'old', brandName: 'Old', genericName: 'Paracetamol', strength: '500 mg', dosageForm: 'Tablet', status: 'inactive' })
    const other = makeMedicine({ id: 'seclo', brandName: 'Seclo', genericName: 'Omeprazole', strength: '20 mg', dosageForm: 'Capsule' })
    const refs = [
      ref('m-ace', 'Ace', '500 mg', 'Tablet', 90), // already in the shop by MedEx id
      ref('m-renova', 'Renova', '500 mg', 'Tablet', 80),
      ref('m-fast', 'Fast', '500 mg', 'Tablet'),
      ref('m-napa-syr', 'Napa', '120 mg/5 ml', 'Syrup', 3500),
      { ...ref('m-napa', 'Napa'), genericName: 'Paracetamol' }, // same as the shop's Napa by name
    ]
    const alt = findAlternatives({ id: 'napa', medexId: null, genericName: 'Paracetamol', strength: '500 mg', dosageForm: 'Tablet' }, [napa, ace, off, other], refs)
    expect(alt.same.map((x) => `${x.kind}:${x.brandName}`)).toEqual(['ref:Renova', 'shop:Ace', 'ref:Fast'])
    expect(alt.same.find((x) => x.brandName === 'Ace')?.piecePricePaisa).toBe(100)
    expect(alt.other.map((x) => x.brandName)).toEqual(['Napa'])
    expect(alt.other[0]?.dosageForm).toBe('Syrup')
  })

  it('leaves out the medicine itself when it is a MedEx row', () => {
    const alt = findAlternatives({ id: 'medex-m-fast', medexId: 'm-fast', genericName: 'Paracetamol', strength: '500 mg', dosageForm: 'Tablet' }, [], [ref('m-fast', 'Fast'), ref('m-renova', 'Renova')])
    expect(alt.same.map((x) => x.brandName)).toEqual(['Renova'])
  })

  it('shows a MedEx row like a shop medicine, priced from the list', () => {
    const m = refAsMedicine({ ...ref('7701', 'Napa', '500 mg', 'Tablet', 120), packDescription: '50 x 10', packPricePaisa: 60_000 }, 'https://medex.com.bd/brands/7701/napa', 0)
    expect(m).toMatchObject({ id: 'medex-7701', sourceId: '7701', piecesPerStrip: 10, piecesPerPack: 500, sourceUnitPricePaisa: 120, sourceStripPricePaisa: 1200, sourcePackPricePaisa: 60_000, shopUnitPricePaisa: null })
  })
})
