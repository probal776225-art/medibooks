// Pack the ~26k-row reference list into a few Firestore documents (each < 1 MiB) instead of one doc per row,
// so the upload is ~5 writes and a new device downloads it with ~5 reads (free-tier friendly).
import type { RefMedicine } from './medexRef'

export interface RefDict {
  forms: string[]
  generics: string[]
  companies: string[]
}

/** [id, brand, formIdx, strength, genericIdx, companyIdx, slug, herbal] + [unit, pack, packText, priceText] when priced */
type BaseRow = [number, string, number, string, number, number, string, 0 | 1]
type PackedRow = BaseRow | [...BaseRow, number, number | null, string, string]

export const MAX_CHUNK_BYTES = 700_000

function indexer(): { list: string[]; at: (s: string) => number } {
  const list: string[] = []
  const pos = new Map<string, number>()
  return {
    list,
    at: (s) => {
      let i = pos.get(s)
      if (i === undefined) {
        i = list.length
        list.push(s)
        pos.set(s, i)
      }
      return i
    },
  }
}

export function packRefCatalog(items: readonly RefMedicine[], maxChunkBytes = MAX_CHUNK_BYTES): { dict: string; chunks: string[] } {
  const forms = indexer()
  const generics = indexer()
  const companies = indexer()
  const enc = new TextEncoder()
  const chunks: string[] = []
  let current: string[] = []
  let size = 2
  for (const r of items) {
    const base: BaseRow = [
      Number(r.id),
      r.brandName,
      forms.at(r.dosageForm),
      r.strength,
      generics.at(r.genericName),
      companies.at(r.manufacturer),
      r.slug,
      r.herbal ? 1 : 0,
    ]
    // Price columns only for priced rows, so a list without prices packs exactly as before.
    const row: PackedRow =
      r.unitPricePaisa === null || r.unitPricePaisa === undefined
        ? base
        : [...base, r.unitPricePaisa, r.packPricePaisa ?? null, r.packDescription ?? '', r.priceText ?? '']
    const json = JSON.stringify(row)
    const bytes = enc.encode(json).length + 1
    if (current.length && size + bytes > maxChunkBytes) {
      chunks.push(`[${current.join(',')}]`)
      current = []
      size = 2
    }
    current.push(json)
    size += bytes
  }
  if (current.length) chunks.push(`[${current.join(',')}]`)
  const dict: RefDict = { forms: forms.list, generics: generics.list, companies: companies.list }
  return { dict: JSON.stringify(dict), chunks }
}

export function unpackRefCatalog(dictJson: string, chunks: readonly string[]): RefMedicine[] {
  const dict = JSON.parse(dictJson) as RefDict
  const out: RefMedicine[] = []
  for (const chunk of chunks) {
    for (const row of JSON.parse(chunk) as PackedRow[]) {
      const [id, brandName, f, strength, g, c, slug, herbal, unit, pack, packText, priceText] = row as [
        ...BaseRow,
        number?,
        (number | null)?,
        string?,
        string?,
      ]
      out.push({
        id: String(id),
        brandName,
        dosageForm: dict.forms[f] ?? '',
        strength,
        genericName: dict.generics[g] ?? '',
        manufacturer: dict.companies[c] ?? '',
        slug,
        herbal: herbal === 1,
        ...(unit === undefined
          ? {}
          : { unitPricePaisa: unit, packPricePaisa: pack ?? null, packDescription: packText ?? '', priceText: priceText ?? '' }),
      })
    }
  }
  return out
}

/** Short content hash used as the catalog version (same file → same version → no re-download). */
export async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buf)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
