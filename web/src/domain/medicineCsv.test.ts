import Papa from 'papaparse'
import { describe, expect, it } from 'vitest'
import { makeMedicine } from './fixtures'
import { MEDICINE_TEMPLATE_CSV, medicineRowsFromCsv, newMedicineFields, planMedicineImport } from './medicineCsv'
import type { Medicine } from './types'

const parse = (csv: string) => medicineRowsFromCsv(Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true }).data)
const HEAD = 'brand_name,generic_name,strength,dosage_form,manufacturer,unit_price,strip_price,pack_price,pack_description,pieces_per_strip,pieces_per_pack,source_url,source_date\n'

describe('medicineRowsFromCsv', () => {
  it('normalizes prices, forms and pack sizes', () => {
    const rows = parse(HEAD + 'Napa,Paracetamol,500 mg,tab,Beximco,1.20,,,"10 x 10",,,https://medex.com.bd/brands/1/napa,22/10/2026\n')
    expect(rows[0]!.issues).toEqual([])
    expect(rows[0]!.record).toMatchObject({
      brandName: 'Napa',
      dosageForm: 'Tablet',
      unitPricePaisa: 120,
      piecesPerStrip: 10,
      piecesPerPack: 100,
      sourceUrl: 'https://medex.com.bd/brands/1/napa',
      sourceUpdatedAt: Date.UTC(2026, 9, 21, 18, 0),
    })
  })

  it('reports problems per row', () => {
    const rows = parse(
      HEAD +
        ',Paracetamol,500 mg,Tablet,,1,,,,,,,\n' +
        'A,,1 mg,Tablet,,abc,,,,,,,\n' +
        'B,,1 mg,Tablet,,1,,,,0,,,\n' +
        'C,,1 mg,Tablet,,1,,,,,,http://x.com,\n' +
        'D,,1 mg,Tablet,,1,,,,,,,31/02/2026\n' +
        'E,,1 mg,Tablet,,1,,,,,,,\n' +
        'e,,1 MG,tab,,2,,,,,,,\n',
    )
    expect(rows.map((r) => r.issues)).toEqual([['brand'], ['price'], ['pieces'], ['url'], ['date'], [], ['duplicate']])
  })

  it('reads the downloadable template', () => {
    expect(parse(MEDICINE_TEMPLATE_CSV).every((r) => r.issues.length === 0)).toBe(true)
  })
})

describe('planMedicineImport', () => {
  const napa = makeMedicine({ sourceName: 'csv', sourceUnitPricePaisa: 120, shopUnitPricePaisa: 150, genericName: 'Paracetamol', manufacturer: 'Beximco', packDescription: '50 x 10' })
  const shop: Medicine[] = [napa]

  it('splits rows into new / changed / unchanged and only compares given fields', () => {
    const rows = parse(
      HEAD +
        'Napa,Paracetamol,500 mg,Tablet,Beximco,1.30,,,,,,,\n' + // price change
        'Seclo,Omeprazole,20 mg,Capsule,Square,6,,,,10,,,\n', // new
    )
    const plan = planMedicineImport(rows, shop)
    expect(plan.errors).toEqual([])
    expect(plan.items.map((i) => i.kind)).toEqual(['changed', 'new'])
    expect(plan.items[0]!.changes).toEqual([{ field: 'sourceUnitPricePaisa', before: 120, after: 130 }])
    // The shop's own price is not part of an import.
    expect(plan.items[0]!.changes.some((c) => c.field.startsWith('shop'))).toBe(false)
  })

  it('is idempotent: the same data again means no changes', () => {
    const rows = parse(HEAD + 'Napa,Paracetamol,500 mg,Tablet,Beximco,1.20,,,50 x 10,,,,\n')
    const plan = planMedicineImport(rows, shop)
    expect(plan.items.map((i) => i.kind)).toEqual(['unchanged'])
  })

  it('applying a plan then planning again gives zero changes', () => {
    const rows = parse(HEAD + 'Napa,Paracetamol Plus,500 mg,Tablet,Beximco,1.25,13,,,,,,\nRolac,Ketorolac,10 mg,Tablet,Renata,12,,,3 x 10,,,,\n')
    const first = planMedicineImport(rows, shop)
    const after: Medicine[] = first.items.map((i) =>
      i.medicine
        ? { ...i.medicine, ...Object.fromEntries(i.changes.map((c) => [c.field, c.after])) }
        : makeMedicine({ id: `new-${i.line}`, ...newMedicineFields(i.record) }),
    )
    expect(planMedicineImport(rows, after).items.every((i) => i.kind === 'unchanged')).toBe(true)
  })

  it('refuses ambiguous matches', () => {
    const twins = [napa, { ...napa, id: 'napa-2' }]
    const plan = planMedicineImport(parse(HEAD + 'Napa,,500 mg,Tablet,,1,,,,,,,\n'), twins)
    expect(plan.errors).toEqual([{ line: 2, record: null, issues: ['ambiguous'] }])
    expect(plan.items).toEqual([])
  })
})
