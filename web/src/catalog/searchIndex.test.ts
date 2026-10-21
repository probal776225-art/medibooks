import { describe, expect, it } from 'vitest'
import { makeMedicine } from '../domain/fixtures'
import type { Medicine } from '../domain/types'
import { buildMedicineIndex, searchMedicines } from './searchIndex'

const meds: Medicine[] = [
  makeMedicine({ id: 'napa', brandName: 'Napa', genericName: 'Paracetamol', strength: '500 mg' }),
  makeMedicine({ id: 'napa-extra', brandName: 'Napa Extra', genericName: 'Paracetamol + Caffeine', strength: '500 mg+65 mg' }),
  makeMedicine({ id: 'napa-syrup', brandName: 'Napa', genericName: 'Paracetamol', strength: '120 mg/5 ml', dosageForm: 'Suspension' }),
  makeMedicine({ id: 'ace', brandName: 'Ace', genericName: 'Paracetamol', manufacturer: 'Square Pharmaceuticals PLC' }),
  makeMedicine({ id: 'seclo', brandName: 'Seclo', genericName: 'Omeprazole', strength: '20 mg', dosageForm: 'Capsule', manufacturer: 'Square Pharmaceuticals PLC' }),
  makeMedicine({ id: 'losectil', brandName: 'Losectil', genericName: 'Omeprazole', strength: '20 mg', dosageForm: 'Capsule', manufacturer: 'Eskayef Pharmaceuticals Ltd.' }),
  makeMedicine({ id: 'old', brandName: 'Napaxyl', genericName: 'Paracetamol', status: 'inactive' }),
]
const byId = new Map(meds.map((m) => [m.id, m]))
const index = buildMedicineIndex(meds)
const ids = (q: string, opts = {}) => searchMedicines(index, byId, q, opts).map((m) => m.id)

describe('searchMedicines', () => {
  it('finds brands by prefix, brand first', () => {
    expect(ids('napa').slice(0, 3).sort()).toEqual(['napa', 'napa-extra', 'napa-syrup'])
    expect(ids('seclo')).toEqual(['seclo'])
  })

  it('finds by generic prefix and company', () => {
    expect(ids('omep').sort()).toEqual(['losectil', 'seclo'])
    expect(ids('para')).toContain('ace')
    expect(ids('square').sort()).toEqual(['ace', 'seclo'])
  })

  it('narrows with more words (AND) and tolerates small typos', () => {
    expect(ids('napa 120')).toEqual(['napa-syrup'])
    expect(ids('losectl')).toEqual(['losectil'])
  })

  it('hides inactive unless asked, and ranks frequently sold items first', () => {
    expect(ids('napaxyl')).toEqual([])
    expect(ids('napaxyl', { includeInactive: true })).toEqual(['old'])
    expect(ids('omep', { usage: new Map([['losectil', 20]]) })[0]).toBe('losectil')
    expect(ids('   ')).toEqual([])
  })
})
