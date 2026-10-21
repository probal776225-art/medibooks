// Offline medicine search over the local list (no network). Pure: no Dexie/Firebase imports, so it is unit-tested.
import MiniSearch from 'minisearch'
import { toEnglishDigits } from '../domain/digits'
import type { Medicine } from '../domain/types'

export type MedicineIndex = MiniSearch<Medicine>

export function buildMedicineIndex(medicines: readonly Medicine[]): MedicineIndex {
  const index: MedicineIndex = new MiniSearch<Medicine>({
    idField: 'id',
    fields: ['brandName', 'genericName', 'manufacturer', 'strength', 'dosageForm'],
    processTerm: (term) => toEnglishDigits(term).toLowerCase(),
    searchOptions: {
      boost: { brandName: 4, genericName: 2, manufacturer: 1, strength: 1, dosageForm: 0.5 },
      prefix: true,
      fuzzy: (term) => (term.length > 3 ? 0.2 : false),
      combineWith: 'AND',
    },
  })
  index.addAll(medicines as Medicine[])
  return index
}

export interface SearchOptions {
  /** medicineId → times sold on this device; frequent items rank first. */
  usage?: ReadonlyMap<string, number>
  includeInactive?: boolean
  limit?: number
}

export function searchMedicines(
  index: MedicineIndex,
  byId: ReadonlyMap<string, Medicine>,
  query: string,
  opts: SearchOptions = {},
): Medicine[] {
  const q = query.trim()
  if (!q) return []
  const { usage, includeInactive = false, limit = 20 } = opts
  const ranked: { m: Medicine; score: number }[] = []
  for (const r of index.search(q)) {
    const m = byId.get(String(r.id))
    if (!m || (!includeInactive && m.status !== 'active')) continue
    const used = usage?.get(m.id) ?? 0
    ranked.push({ m, score: r.score * (1 + Math.log1p(used) * 0.5) })
  }
  ranked.sort((a, b) => b.score - a.score)
  return ranked.slice(0, limit).map((x) => x.m)
}
