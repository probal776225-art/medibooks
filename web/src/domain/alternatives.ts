// Same-generic alternatives: other brands of the same generic, from the shop's list and the MedEx list.
// "Same" = same generic + strength + form (a direct swap); "other" = same generic, another strength or form.
// Pure and local, so it works offline. The owner still decides whether a swap is right for the patient.
import { normalizeDosageForm, parsePackDescription } from './medicines'
import { effectiveUnitPrice } from './pricing'
import type { Medicine, Paisa } from './types'

/** A reference (MedEx list) row — only the fields this needs. */
export interface RefLike {
  id: string
  brandName: string
  genericName: string
  strength: string
  dosageForm: string
  manufacturer: string
  unitPricePaisa?: Paisa | null
}

export interface AltItem {
  /** Shop medicine id, or the MedEx id for a list row the shop has not used yet. */
  id: string
  kind: 'shop' | 'ref'
  brandName: string
  genericName: string
  strength: string
  dosageForm: string
  manufacturer: string
  piecePricePaisa: Paisa | null
}

export interface Alternatives {
  same: AltItem[]
  other: AltItem[]
}

// Salt and water-of-crystallisation words that name the same medicine ("Amlodipine Besilate" = "Amlodipine").
// Cation salts (sodium, potassium, calcium, magnesium) are kept: those are often different products.
const SALT_WORDS = new Set([
  'besilate', 'besylate', 'hydrochloride', 'hcl', 'maleate', 'mesylate', 'mesilate', 'fumarate', 'succinate',
  'tartrate', 'bitartrate', 'hyclate', 'hydrobromide', 'anhydrous', 'monohydrate', 'dihydrate', 'trihydrate',
  'hemihydrate', 'sesquihydrate', 'usp', 'bp',
])

/** "Amlodipine Besilate + Olmesartan" and "olmesartan+amlodipine" are the same generic. */
export function genericKey(generic: string): string {
  return generic
    .toLowerCase()
    .split('+')
    .map((p) =>
      p
        .replace(/[(),.]/g, ' ')
        .split(/\s+/)
        .filter((w) => w && !SALT_WORDS.has(w))
        .join(' '),
    )
    .filter(Boolean)
    .sort()
    .join(' + ')
}

export const strengthKey = (s: string) => s.toLowerCase().replace(/\s+/g, '')
export const formKey = (f: string) => normalizeDosageForm(f).toLowerCase()

export interface AltTarget {
  /** Shop medicine id or MedEx id of the medicine being replaced (left out of the result). */
  id: string
  medexId: string | null
  genericName: string
  strength: string
  dosageForm: string
}

const byPriceThenName = (a: AltItem, b: AltItem) =>
  (a.piecePricePaisa ?? Number.MAX_SAFE_INTEGER) - (b.piecePricePaisa ?? Number.MAX_SAFE_INTEGER) ||
  a.brandName.localeCompare(b.brandName)

/**
 * `refs` may be every MedEx row of this generic (or more — they are filtered). A MedEx row the shop already
 * stocks (same MedEx id, or same brand + strength + form) shows as the shop medicine, with the shop's price.
 */
export function findAlternatives(
  target: AltTarget,
  shop: readonly Medicine[],
  refs: readonly RefLike[],
  limit = 30,
): Alternatives {
  const g = genericKey(target.genericName)
  if (!g) return { same: [], other: [] }
  const items: AltItem[] = []
  const added = new Set<string>()
  const key = (x: { brandName: string; strength: string; dosageForm: string }) =>
    `${x.brandName.toLowerCase()}|${strengthKey(x.strength)}|${formKey(x.dosageForm)}`
  // Every active shop medicine, so a MedEx row the shop stocks under a slightly different generic text
  // still shows as the shop's own medicine (with the shop's price).
  const shopByMedexId = new Map<string, Medicine>()
  const shopByKey = new Map<string, Medicine>()
  for (const m of shop) {
    if (m.status !== 'active') continue
    if (m.sourceName === 'medex' && m.sourceId) shopByMedexId.set(m.sourceId, m)
    shopByKey.set(key(m), m)
  }
  const addShop = (m: Medicine) => {
    if (m.id === target.id || added.has(m.id)) return
    added.add(m.id)
    items.push({
      id: m.id,
      kind: 'shop',
      brandName: m.brandName,
      genericName: m.genericName,
      strength: m.strength,
      dosageForm: m.dosageForm,
      manufacturer: m.manufacturer,
      piecePricePaisa: effectiveUnitPrice(m, 'piece'),
    })
  }
  for (const m of shop) if (m.status === 'active' && genericKey(m.genericName) === g) addShop(m)
  for (const r of refs) {
    if (genericKey(r.genericName) !== g || r.id === target.medexId) continue
    const stocked = shopByMedexId.get(r.id) ?? shopByKey.get(key(r))
    if (stocked) {
      addShop(stocked)
      continue
    }
    items.push({
      id: r.id,
      kind: 'ref',
      brandName: r.brandName,
      genericName: r.genericName,
      strength: r.strength,
      dosageForm: r.dosageForm,
      manufacturer: r.manufacturer,
      piecePricePaisa: r.unitPricePaisa ?? null,
    })
  }
  const s = strengthKey(target.strength)
  const f = formKey(target.dosageForm)
  const same = items.filter((x) => strengthKey(x.strength) === s && formKey(x.dosageForm) === f).sort(byPriceThenName)
  const other = items
    .filter((x) => !(strengthKey(x.strength) === s && formKey(x.dosageForm) === f))
    .sort((a, b) => a.dosageForm.localeCompare(b.dosageForm) || a.strength.localeCompare(b.strength) || byPriceThenName(a, b))
  return { same: same.slice(0, limit), other: other.slice(0, limit) }
}

/** A MedEx row as a shop-shaped medicine (for display before it is saved; id `medex-<id>`). */
export function refAsMedicine(
  r: RefLike & { slug?: string; packDescription?: string; packPricePaisa?: Paisa | null },
  url: string,
  now: number,
): Medicine {
  const pieces = parsePackDescription(r.packDescription ?? '')
  const unit = r.unitPricePaisa ?? null
  return {
    id: `medex-${r.id}`,
    brandName: r.brandName,
    genericName: r.genericName,
    strength: r.strength,
    dosageForm: normalizeDosageForm(r.dosageForm),
    manufacturer: r.manufacturer,
    dosageText: r.dosageForm,
    packDescription: r.packDescription ?? '',
    piecesPerStrip: pieces.piecesPerStrip,
    piecesPerPack: pieces.piecesPerPack,
    sourceUnitPricePaisa: unit,
    sourceStripPricePaisa: unit !== null && pieces.piecesPerStrip ? unit * pieces.piecesPerStrip : null,
    sourcePackPricePaisa: r.packPricePaisa ?? null,
    shopUnitPricePaisa: null,
    shopStripPricePaisa: null,
    shopPackPricePaisa: null,
    sourceName: 'medex',
    sourceId: r.id,
    sourceUrl: url,
    sourceUpdatedAt: null,
    sourceFetchedAt: null,
    lastImportId: null,
    sourceStatus: 'listed',
    status: 'active',
    createdAt: now,
    createdBy: '',
    updatedAt: null,
    schemaVersion: 1,
  }
}

export const REF_MEDICINE_PREFIX = 'medex-'
export const isRefMedicineId = (id: string) => id.startsWith(REF_MEDICINE_PREFIX)
