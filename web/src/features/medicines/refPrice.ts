// How a MedEx reference price reads: tablets "৳5.00/পিস (10 x 10: ৳500.00)", liquids "100 ml bottle: ৳40.00".
import { hasRefPrice, medexSourceRecord } from '../../catalog/import/medexPrices'
import { refUrl, type RefMedicine } from '../../catalog/import/medexRef'
import type { Paisa } from '../../domain/types'

export function refPriceText(r: RefMedicine, money: (p: Paisa) => string, piece: string, withPack = false): string | null {
  if (!hasRefPrice(r)) return null
  const unit = r.unitPricePaisa as Paisa
  if (r.packPricePaisa == null) return r.packDescription ? `${r.packDescription}: ${money(unit)}` : money(unit)
  const box = withPack && r.packDescription ? ` (${r.packDescription}: ${money(r.packPricePaisa)})` : ''
  return `${money(unit)}/${piece}${box}`
}

/** Source prices a medicine added from this reference row starts with (null when the row has none). */
export function refSourcePrices(r: RefMedicine): { unit: Paisa | null; strip: Paisa | null; pack: Paisa | null } | undefined {
  if (!hasRefPrice(r)) return undefined
  const rec = medexSourceRecord(r, refUrl(r))
  return { unit: rec.unitPricePaisa ?? null, strip: rec.stripPricePaisa ?? null, pack: rec.packPricePaisa ?? null }
}
