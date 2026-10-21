// MedEx brand list (owner-supplied file, used with MedEx's written permission) → reference rows.
// Reference rows are NOT shop medicines: they have no prices. The owner adds what the shop sells.
import type { Sheet } from './xlsx'

export interface RefMedicine {
  /** MedEx brand id */
  id: string
  brandName: string
  dosageForm: string
  strength: string
  genericName: string
  manufacturer: string
  /** Last part of the MedEx page link (the link is rebuilt from id + slug). */
  slug: string
  herbal: boolean
}

export const MEDEX_COLUMNS = {
  id: 'id',
  brandName: 'brand name',
  dosageForm: 'dosage form',
  strength: 'strength',
  genericName: 'generic name',
  manufacturer: 'company',
  link: 'medex link',
} as const

export function refUrl(r: Pick<RefMedicine, 'id' | 'slug'>): string {
  return `https://medex.com.bd/brands/${r.id}/${r.slug}`
}

export interface MedexParseResult {
  items: RefMedicine[]
  herbalCount: number
  skipped: number
  sheetsUsed: string[]
}

/** Uses every sheet whose header has the MedEx brand columns; other sheets (generics, companies) are ignored. */
export function mapMedexSheets(sheets: readonly Sheet[]): MedexParseResult {
  const byId = new Map<string, RefMedicine>()
  const sheetsUsed: string[] = []
  let skipped = 0
  for (const sheet of sheets) {
    const header = (sheet.rows[0] ?? []).map((h) => h.trim().toLowerCase())
    const col = Object.fromEntries(
      Object.entries(MEDEX_COLUMNS).map(([key, name]) => [key, header.indexOf(name)]),
    ) as Record<keyof typeof MEDEX_COLUMNS, number>
    if (Object.values(col).some((i) => i < 0)) continue
    sheetsUsed.push(sheet.name)
    const herbal = /herbal/i.test(sheet.name)
    for (const row of sheet.rows.slice(1)) {
      const cell = (k: keyof typeof MEDEX_COLUMNS) => (row[col[k]] ?? '').replace(/\s+/g, ' ').trim()
      const id = cell('id')
      const link = /^https:\/\/medex\.com\.bd\/brands\/(\d+)\/([a-z0-9-]+)\/?$/.exec(cell('link'))
      if (!/^\d+$/.test(id) || !cell('brandName') || !link || link[1] !== id) {
        if (row.some((v) => v.trim())) skipped++
        continue
      }
      byId.set(id, {
        id,
        brandName: cell('brandName'),
        dosageForm: cell('dosageForm'),
        strength: cell('strength'),
        genericName: cell('genericName'),
        manufacturer: cell('manufacturer'),
        slug: link[2]!,
        herbal,
      })
    }
  }
  const items = [...byId.values()]
  return { items, herbalCount: items.filter((i) => i.herbal).length, skipped, sheetsUsed }
}
