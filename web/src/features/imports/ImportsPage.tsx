import { useRef, useState } from 'react'
import { confirmRefImport, previewRefFile, useRefStore, type RefImportPreview } from '../../catalog/refStore'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../app/routes'
import { Button, buttonClass, Card } from '../../components/ui'
import { medicineDisplayName } from '../../domain/pricing'
import { useT, type MessageKey } from '../../i18n'
import { useFormat } from '../../i18n/format'

type Step = 'idle' | 'reading' | 'preview' | 'saving' | 'done'

/** MedEx reference list import (owner confirmed written permission). */
function MedexListCard() {
  const t = useT()
  const f = useFormat()
  const { meta, downloading } = useRefStore()
  const input = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('idle')
  const [preview, setPreview] = useState<RefImportPreview | null>(null)
  const [error, setError] = useState<MessageKey | null>(null)
  const [permission, setPermission] = useState(false)

  async function onFile(file: File | undefined) {
    if (!file) return
    setError(null)
    setPermission(false)
    setStep('reading')
    try {
      const p = await previewRefFile(file)
      if (p.parsed.items.length === 0) {
        setError('imp.ref.noBrands')
        setStep('idle')
        return
      }
      setPreview(p)
      setStep('preview')
    } catch (e) {
      console.error('MedEx file read failed', e)
      setError('imp.ref.readFailed')
      setStep('idle')
    } finally {
      if (input.current) input.current.value = ''
    }
  }

  async function save() {
    if (!preview) return
    setStep('saving')
    await confirmRefImport(preview, permission)
    setPreview(null)
    setStep('done')
  }

  const sameAsCurrent = preview !== null && meta?.fileSha256 === preview.sha256

  return (
    <Card>
      <h2 className="text-lg font-semibold">{t('imp.ref.title')}</h2>
      <p className="mt-1 text-[15px] text-slate-600">{t('imp.ref.body')}</p>

      <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
        {downloading
          ? t('imp.ref.downloading')
          : meta
            ? t('imp.ref.current', {
                count: f.num(meta.count),
                herbal: f.num(meta.herbalCount),
                file: meta.fileName,
                date: f.date(meta.importedAt),
              })
            : t('imp.ref.none')}
      </p>

      <input
        ref={input}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0])}
        data-testid="medex-file"
      />
      {(step === 'idle' || step === 'done') && (
        <Button variant="outline" className="mt-3" onClick={() => input.current?.click()}>
          {t('imp.ref.choose')}
        </Button>
      )}
      {step === 'reading' && <p className="mt-3 text-slate-600">{t('imp.ref.reading')}</p>}
      {step === 'saving' && <p className="mt-3 text-slate-600">{t('imp.ref.saving')}</p>}
      {step === 'done' && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">{t('imp.ref.done')}</p>}
      {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-rose-700">{t(error)}</p>}

      {step === 'preview' && preview && (
        <div className="mt-4 space-y-3">
          <p className="font-medium">
            {preview.file.name} ·{' '}
            {t('imp.ref.found', {
              count: f.num(preview.parsed.items.length),
              herbal: f.num(preview.parsed.herbalCount),
              skipped: f.num(preview.parsed.skipped),
            })}
          </p>
          <div>
            <p className="text-sm text-slate-500">{t('imp.ref.sample')}</p>
            <ul className="mt-1 divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
              {preview.parsed.items.slice(0, 5).map((r) => (
                <li key={r.id} className="px-3 py-1.5">
                  <span className="font-medium">{medicineDisplayName(r)}</span>
                  <span className="text-slate-500"> · {r.genericName} · {r.manufacturer}</span>
                </li>
              ))}
            </ul>
          </div>
          {sameAsCurrent ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">{t('imp.ref.same')}</p>
          ) : (
            <>
              <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                <input
                  type="checkbox"
                  checked={permission}
                  onChange={(e) => setPermission(e.target.checked)}
                  className="mt-1 size-5 shrink-0 accent-teal-700"
                />
                <span>{t('imp.ref.permission')}</span>
              </label>
              <div className="flex gap-2">
                <Button disabled={!permission} onClick={() => void save()}>
                  {t('imp.ref.upload')}
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

export function ImportsPage() {
  const t = useT()
  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">{t('imp.title')}</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">{t('op.title')}</h2>
          <p className="mt-1 text-[15px] text-slate-600">{t('op.body')}</p>
          <Link to={ROUTES.importOpening} className={buttonClass('outline', 'mt-3')}>
            {t('imp.open')}
          </Link>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">{t('mi.title')}</h2>
          <p className="mt-1 text-[15px] text-slate-600">{t('mi.body')}</p>
          <Link to={ROUTES.importMedicines} className={buttonClass('outline', 'mt-3')}>
            {t('imp.open')}
          </Link>
        </Card>
      </div>
      <MedexListCard />
    </section>
  )
}
