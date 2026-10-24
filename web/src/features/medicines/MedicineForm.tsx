import { useMemo, useState, type FormEvent } from 'react'
import { useCatalogStore } from '../../catalog/store'
import { Button, Field, TextInput } from '../../components/ui'
import { parsePackDescription, type MedicineInput } from '../../domain/medicines'
import { formatMoney, parseMoney } from '../../domain/money'
import type { Medicine, Paisa } from '../../domain/types'
import { useT, type MessageKey } from '../../i18n'
import { errorKey } from '../../i18n/format'

const COMMON_FORMS = [
  'Tablet', 'Capsule', 'Syrup', 'Suspension', 'Powder for Suspension', 'Injection', 'Drops', 'Eye Drop',
  'Ear Drop', 'Nasal Spray', 'Inhaler', 'Ointment', 'Cream', 'Gel', 'Sachet', 'Suppository', 'Oral Saline',
]

const priceText = (p: Paisa | null) => (p === null ? '' : formatMoney(p, { symbol: false }).replace(/,/g, ''))
const piecesText = (n: number | null) => (n === null ? '' : String(n))

interface Props {
  initial?: Medicine
  /** Prefill the brand name (e.g. what was typed in search). */
  initialName?: string
  /** Prefill from a reference row (MedEx list); the owner adds price and pack. */
  prefill?: Partial<
    Pick<MedicineInput, 'brandName' | 'genericName' | 'strength' | 'dosageForm' | 'manufacturer' | 'sourceUrl' | 'packDescription'>
  >
  /** Source prices a new medicine will get (MedEx price file); shown as placeholders like an import's. */
  sourcePrices?: { unit: Paisa | null; strip: Paisa | null; pack: Paisa | null }
  /** Shown above the price fields (e.g. "the file has no prices"). */
  note?: string
  /** Staff: no shop price fields (the source price, if any, is used; the price can be typed in the bill). */
  hidePrices?: boolean
  submitLabel: string
  onSubmit: (input: MedicineInput) => void
  onCancel?: () => void
}

/** Prices typed here are the SHOP's own prices; imported (source) prices are shown as placeholders. */
export function MedicineForm({ initial, initialName = '', prefill, sourcePrices, note, hidePrices, submitLabel, onSubmit, onCancel }: Props) {
  const t = useT()
  const medicines = useCatalogStore((s) => s.medicines)
  const companies = useMemo(
    () => [...new Set(medicines.map((m) => m.manufacturer).filter(Boolean))].sort(),
    [medicines],
  )
  const [v, setV] = useState({
    brandName: initial?.brandName ?? prefill?.brandName ?? initialName,
    genericName: initial?.genericName ?? prefill?.genericName ?? '',
    strength: initial?.strength ?? prefill?.strength ?? '',
    dosageForm: initial?.dosageForm ?? prefill?.dosageForm ?? '',
    manufacturer: initial?.manufacturer ?? prefill?.manufacturer ?? '',
    packDescription: initial?.packDescription ?? prefill?.packDescription ?? '',
    piecesPerStrip: piecesText(initial?.piecesPerStrip ?? parsePackDescription(prefill?.packDescription ?? '').piecesPerStrip),
    piecesPerPack: piecesText(initial?.piecesPerPack ?? parsePackDescription(prefill?.packDescription ?? '').piecesPerPack),
    unitPrice: priceText(initial?.shopUnitPricePaisa ?? null),
    stripPrice: priceText(initial?.shopStripPricePaisa ?? null),
    packPrice: priceText(initial?.shopPackPricePaisa ?? null),
    sourceUrl: initial?.sourceUrl ?? prefill?.sourceUrl ?? '',
  })
  const [error, setError] = useState<MessageKey | null>(null)
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value }))

  function onPackChange(text: string) {
    const parsed = parsePackDescription(text)
    setV((s) => ({
      ...s,
      packDescription: text,
      // Fill sizes from the pack text only while the owner has not typed them.
      piecesPerStrip: s.piecesPerStrip || piecesText(parsed.piecesPerStrip),
      piecesPerPack: s.piecesPerPack || piecesText(parsed.piecesPerPack),
    }))
  }

  function readPrice(text: string): Paisa | null {
    if (!text.trim()) return null
    const p = parseMoney(text)
    if (p === null) throw new Error('price')
    return p
  }

  function readPieces(text: string): number | null {
    const s = text.trim()
    return s ? Number(s) : null
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    let prices: Pick<MedicineInput, 'shopUnitPricePaisa' | 'shopStripPricePaisa' | 'shopPackPricePaisa'>
    try {
      prices = {
        shopUnitPricePaisa: readPrice(v.unitPrice),
        shopStripPricePaisa: readPrice(v.stripPrice),
        shopPackPricePaisa: readPrice(v.packPrice),
      }
    } catch {
      setError('error.INVALID_PRICE')
      return
    }
    try {
      onSubmit({
        brandName: v.brandName,
        genericName: v.genericName,
        strength: v.strength,
        dosageForm: v.dosageForm,
        manufacturer: v.manufacturer,
        packDescription: v.packDescription,
        piecesPerStrip: readPieces(v.piecesPerStrip),
        piecesPerPack: readPieces(v.piecesPerPack),
        ...prices,
        sourceUrl: v.sourceUrl,
      })
    } catch (err) {
      setError(errorKey(err))
    }
  }

  const sourceHint = (p: Paisa | null | undefined) => (p == null ? undefined : formatMoney(p, { symbol: false }))

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label={t('med.brand')}>
        <TextInput value={v.brandName} onChange={set('brandName')} autoFocus maxLength={120} autoComplete="off" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('med.strength')}>
          <TextInput value={v.strength} onChange={set('strength')} maxLength={80} autoComplete="off" />
        </Field>
        <Field label={t('med.form')}>
          <TextInput value={v.dosageForm} onChange={set('dosageForm')} list="med-forms" maxLength={60} autoComplete="off" />
        </Field>
      </div>
      <Field label={t('med.generic')}>
        <TextInput value={v.genericName} onChange={set('genericName')} maxLength={200} autoComplete="off" />
      </Field>
      <Field label={t('med.company')}>
        <TextInput value={v.manufacturer} onChange={set('manufacturer')} list="med-companies" maxLength={120} autoComplete="off" />
      </Field>
      <Field label={t('med.packText')}>
        <TextInput value={v.packDescription} onChange={(e) => onPackChange(e.target.value)} maxLength={80} autoComplete="off" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('med.stripSize')}>
          <TextInput value={v.piecesPerStrip} onChange={set('piecesPerStrip')} inputMode="numeric" pattern="[0-9]*" />
        </Field>
        <Field label={t('med.packSize')}>
          <TextInput value={v.piecesPerPack} onChange={set('piecesPerPack')} inputMode="numeric" pattern="[0-9]*" />
        </Field>
      </div>
      {note && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{note}</p>}
      {!hidePrices && (
        <>
          <Field label={t('med.unitPrice')}>
            <TextInput
              value={v.unitPrice}
              onChange={set('unitPrice')}
              inputMode="decimal"
              placeholder={sourceHint(initial?.sourceUnitPricePaisa ?? sourcePrices?.unit)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('med.stripPrice')}>
              <TextInput
                value={v.stripPrice}
                onChange={set('stripPrice')}
                inputMode="decimal"
                placeholder={sourceHint(initial?.sourceStripPricePaisa ?? sourcePrices?.strip)}
              />
            </Field>
            <Field label={t('med.packPrice')}>
              <TextInput
                value={v.packPrice}
                onChange={set('packPrice')}
                inputMode="decimal"
                placeholder={sourceHint(initial?.sourcePackPricePaisa ?? sourcePrices?.pack)}
              />
            </Field>
          </div>
          <p className="-mt-1 text-sm text-slate-500">{t('med.priceHint')}</p>
        </>
      )}
      <Field label={t('med.link')} hint={t('med.linkHint')}>
        <TextInput value={v.sourceUrl} onChange={set('sourceUrl')} type="url" inputMode="url" placeholder="https://medex.com.bd/brands/…" />
      </Field>

      {error && (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {t(error)}
        </p>
      )}
      <div className="flex gap-2 pt-1">
        <Button type="submit" className="flex-1">
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            {t('customer.cancel')}
          </Button>
        )}
      </div>

      <datalist id="med-forms">
        {COMMON_FORMS.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>
      <datalist id="med-companies">
        {companies.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </form>
  )
}
