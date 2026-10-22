// Settings → ইমপোর্ট → MedEx দামের ফাইল (CSV): prices onto the MedEx reference list, and the MedEx (source)
// price of shop medicines that are the same brand. The owner's own prices are never changed.
import { useRef, useState } from 'react'
import { confirmPriceImport, previewPriceFile, PriceFileError, type PriceImportPreview } from '../../catalog/priceImport'
import { useRefStore } from '../../catalog/refStore'
import { Button, Card } from '../../components/ui'
import { medicineDisplayName } from '../../domain/pricing'
import type { Paisa } from '../../domain/types'
import { useT, type MessageKey } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { refPriceText } from '../medicines/refPrice'

type Step = 'idle' | 'reading' | 'preview' | 'saving' | 'done'

export function MedexPriceCard() {
  const t = useT()
  const f = useFormat()
  const meta = useRefStore((s) => s.meta)
  const input = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('idle')
  const [preview, setPreview] = useState<PriceImportPreview | null>(null)
  const [error, setError] = useState<MessageKey | null>(null)
  const [permission, setPermission] = useState(false)
  const [result, setResult] = useState<{ priced: number; shop: number } | null>(null)

  async function onFile(file: File | undefined) {
    if (!file) return
    setError(null)
    setPermission(false)
    setStep('reading')
    try {
      setPreview(await previewPriceFile(file))
      setStep('preview')
    } catch (e) {
      console.error('Price file read failed', e)
      setError(e instanceof PriceFileError ? `imp.price.${e.reason}` : 'imp.price.readFailed')
      setStep('idle')
    } finally {
      if (input.current) input.current.value = ''
    }
  }

  async function save() {
    if (!preview) return
    setStep('saving')
    const { meta: saved, shopUpdated } = await confirmPriceImport(preview, permission)
    setResult({ priced: saved.pricedCount ?? 0, shop: shopUpdated })
    setPreview(null)
    setStep('done')
  }

  const money = (p: Paisa | null) => (p === null ? '—' : f.money(p))
  const changed = preview?.shop.filter((i) => i.kind === 'changed') ?? []
  const partial = preview !== null && preview.parsed.rows.length < preview.listCount * 0.9

  return (
    <Card>
      <h2 className="text-lg font-semibold">{t('imp.price.title')}</h2>
      <p className="mt-1 text-[15px] text-slate-600">{t('imp.price.body')}</p>
      <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
        {meta?.priceFile
          ? t('imp.price.current', {
              count: f.num(meta.pricedCount ?? 0),
              file: meta.priceFile.fileName,
              date: f.date(meta.priceFile.importedAt),
            })
          : t('imp.price.none')}
      </p>

      <input
        ref={input}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0])}
        data-testid="medex-price-file"
      />
      {(step === 'idle' || step === 'done') && (
        <Button variant="outline" className="mt-3" onClick={() => input.current?.click()}>
          {t('imp.price.choose')}
        </Button>
      )}
      {step === 'reading' && <p className="mt-3 text-slate-600">{t('imp.ref.reading')}</p>}
      {step === 'saving' && <p className="mt-3 text-slate-600">{t('imp.ref.saving')}</p>}
      {step === 'done' && result && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">
          {t('imp.price.done', { priced: f.num(result.priced), shop: f.num(result.shop) })}
        </p>
      )}
      {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-rose-700">{t(error)}</p>}

      {step === 'preview' && preview && (
        <div className="mt-4 space-y-3">
          <p className="font-medium">
            {preview.file.name} ·{' '}
            {t('imp.price.found', {
              count: f.num(preview.parsed.rows.length),
              priced: f.num(preview.parsed.rows.length - preview.parsed.noPrice),
              noPrice: f.num(preview.parsed.noPrice),
              skipped: f.num(preview.parsed.skipped),
            })}
          </p>
          {partial && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">
              {t('imp.price.partial', {
                pct: f.num(Math.round((preview.parsed.rows.length / preview.listCount) * 100)),
                list: f.num(preview.listCount),
              })}
            </p>
          )}
          <ul className="space-y-1 text-[15px]">
            <li>{t('imp.price.listEffect', { updated: f.num(preview.merge.updated), added: f.num(preview.merge.added) })}</li>
            <li>{t('imp.price.shopEffect', { changed: f.num(changed.length), same: f.num(preview.shop.length - changed.length) })}</li>
          </ul>

          {changed.length > 0 && (
            <div>
              <p className="text-sm text-slate-500">{t('imp.price.shopSample')}</p>
              <ul className="mt-1 divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
                {changed.slice(0, 8).map((i) => {
                  const c = i.changes.find((x) => x.field === 'sourceUnitPricePaisa')
                  return (
                    <li key={i.medicine!.id} className="flex gap-2 px-3 py-1.5">
                      <span className="min-w-0 flex-1 truncate font-medium">{medicineDisplayName(i.medicine!)}</span>
                      {c && (
                        <span className="shrink-0 tabular-nums">
                          {money(c.before as Paisa | null)} → {money(c.after as Paisa | null)}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          <div>
            <p className="text-sm text-slate-500">{t('imp.ref.sample')}</p>
            <ul className="mt-1 divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
              {preview.parsed.rows.slice(0, 5).map((r) => (
                <li key={r.id} className="flex gap-2 px-3 py-1.5">
                  <span className="min-w-0 flex-1 truncate font-medium">{medicineDisplayName(r)}</span>
                  <span className="shrink-0 text-slate-600 tabular-nums">{refPriceText(r, f.money, t('med.piece')) ?? t('med.noPrice')}</span>
                </li>
              ))}
            </ul>
          </div>

          {preview.sameAsCurrent ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">{t('imp.ref.same')}</p>
          ) : (
            <>
              <p className="text-sm text-slate-500">{t('imp.price.ownPrices')}</p>
              <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                <input
                  type="checkbox"
                  checked={permission}
                  onChange={(e) => setPermission(e.target.checked)}
                  className="mt-1 size-5 shrink-0 accent-teal-700"
                />
                <span>{t('imp.price.permission')}</span>
              </label>
              <div className="flex gap-2">
                <Button disabled={!permission} onClick={() => void save()}>
                  {t('imp.price.apply')}
                </Button>
                <Button variant="ghost" onClick={() => setStep('idle')}>
                  {t('customer.cancel')}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  )
}
