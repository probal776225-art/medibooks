// Guards the "< 100 ms" search target (SPEC 4A) on a list much larger than a shop needs.
import { describe, expect, it } from 'vitest'
import { makeMedicine } from '../domain/fixtures'
import { buildMedicineIndex, searchMedicines } from './searchIndex'

const WORDS = ['Napa', 'Ace', 'Seclo', 'Maxpro', 'Fexo', 'Monas', 'Zimax', 'Comet', 'Calbo', 'Rolac', 'Tufnil', 'Atova']
const GENERICS = ['Paracetamol', 'Omeprazole', 'Esomeprazole', 'Fexofenadine', 'Montelukast', 'Azithromycin', 'Metformin']

describe('search speed', () => {
  it('builds and searches 5,000 medicines fast enough for the counter', () => {
    const meds = Array.from({ length: 5000 }, (_, i) =>
      makeMedicine({
        id: `m${i}`,
        brandName: `${WORDS[i % WORDS.length]}${i % 7 === 0 ? '' : ` ${String.fromCharCode(65 + (i % 26))}${i}`}`,
        genericName: GENERICS[i % GENERICS.length]!,
        strength: `${(i % 9) * 50 + 5} mg`,
      }),
    )
    const t0 = performance.now()
    const index = buildMedicineIndex(meds)
    const buildMs = performance.now() - t0
    const byId = new Map(meds.map((m) => [m.id, m]))

    let worst = 0
    for (const q of ['napa', 'para', 'omep', 'seclo', 'fexo 120', 'a']) {
      const s = performance.now()
      searchMedicines(index, byId, q)
      worst = Math.max(worst, performance.now() - s)
    }
    console.log(`5,000 medicines: index ${buildMs.toFixed(0)} ms, slowest search ${worst.toFixed(1)} ms`)
    expect(worst).toBeLessThan(100)
  })
})
