// ওষুধের দামের ফাইল: supplier/company CSV → review (new · changed old→new · same · problems) → tick → save.
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../app/routes'
import { upsertLocalMany, useCatalogStore } from '../../catalog/store'
import { Button, Card } from '../../components/ui'
import { applyMedicineImport } from '../../data/repos/medicineImport'
import {
  MEDICINE_TEMPLATE_CSV,
  medicineRowsFromCsv,
  planMedicineImport,
  type FieldChange,
  type ImportPlan,
  type PlanItem,
} from '../../domain/medicineCsv'
import { medicineDisplayName } from '../../domain/pricing'
import { downloadText, readCsv, sha256OfFile } from '../../lib/files'
import { useT, type MessageKey } from '../../i18n'
import { useFormat } from '../../i18n/format'

type View = 'new' | 'changed' | 'unchanged' | 'errors'

function ChangeText({ change }: { change: FieldChange }) {
  const t = useT()
  const f = useFormat()
  const show = (v: string | number | null) => {
    if (v === null || v === '') return '—'
    if (typeof v === 'number' && change.field.endsWith('PricePaisa')) return f.money(v)
    if (typeof v === 'number' && change.field === 'sourceUpdatedAt') return f.date(v)
    return String(v)
  }
  return (
    <span className="mr-3 inline-block">
      <span className="text-slate-500">{t(`mi.field.${change.field}` as MessageKey)}:</span> {show(change.before)} →{' '}
      <span className="font-medium">{show(change.after)}</span>
    </span>
  )
}

function ItemRow({ item, checked, onToggle }: { item: PlanItem; checked: boolean; onToggle?: () => void }) {
  const f = useFormat()
  const r = item.record
  const name = medicineDisplayName({ brandName: r.brandName, strength: r.strength ?? '', dosageForm: r.dosageForm ?? '' })
  return (
    <li className="flex gap-3 px-3 py-2">
      {onToggle && <input type="checkbox" checked={checked} onChange={onToggle} className="mt-1 size-5 shrink-0 accent-teal-700" />}
      <div className="min-w-0 flex-1 text-[15px]">
        <p className="font-medium">
          {name} <span className="text-xs font-normal text-slate-400">#{f.num(item.line)}</span>
        </p>
        {item.kind === 'new' && (
          <p className="text-sm text-slate-500">
            {[r.genericName, r.manufacturer].filter(Boolean).join(' · ')}
            {r.unitPricePaisa !== undefined && ` · ${f.money(r.unitPricePaisa)}/পিস`}
            {r.piecesPerStrip && ` · ${f.num(r.piecesPerStrip)}/স্ট্রিপ`}
          </p>
        )}
        {item.kind === 'changed' && (
          <p className="text-sm">
            {item.changes.map((c) => (
              <ChangeText key={c.field} change={c} />
            ))}
          </p>
        )}
      </div>
    </li>
  )
}

export function MedicineImportPage() {
  const t = useT()
  const f = useFormat()
  const medicines = useCatalogStore((s) => s.medicines)
  const fileInput = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<{ name: string; sha: string } | null>(null)
  const [plan, setPlan] = useState<ImportPlan | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [view, setView] = useState<View>('changed')
  const [error, setError] = useState<MessageKey | null>(null)
  const [done, setDone] = useState<number | null>(null)

  const groups = useMemo(() => {
    const items = plan?.items ?? []
    return {
      new: items.filter((i) => i.kind === 'new'),
      changed: items.filter((i) => i.kind === 'changed'),
      unchanged: items.filter((i) => i.kind === 'unchanged'),
    }
  }, [plan])

  async function onFile(input: File | undefined) {
    if (!input) return
    setError(null)
    setDone(null)
    try {
      const [records, sha] = await Promise.all([readCsv(input), sha256OfFile(input)])
      const p = planMedicineImport(medicineRowsFromCsv(records), medicines)
      setPlan(p)
      setFile({ name: input.name, sha })
      setSelected(new Set(p.items.filter((i) => i.kind !== 'unchanged').map((i) => i.line)))
      setView(p.items.some((i) => i.kind === 'changed') ? 'changed' : p.items.some((i) => i.kind === 'new') ? 'new' : p.errors.length ? 'errors' : 'unchanged')
    } catch (e) {
      console.error('CSV read failed', e)
      setError('imp.readFailed')
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  function toggle(line: number) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(line)) next.delete(line)
      else next.add(line)
      return next
    })
  }

  function apply() {
    if (!plan || !file) return
    const items = plan.items.filter((i) => i.kind !== 'unchanged' && selected.has(i.line))
    upsertLocalMany(
      applyMedicineImport(items, {
        fileName: file.name,
        fileSha256: file.sha,
        counts: { new: groups.new.length, changed: groups.changed.length, unchanged: groups.unchanged.length, errors: plan.errors.length },
      }),
    )
    setDone(items.length)
    setPlan(null)
  }

  const chosen = plan ? plan.items.filter((i) => i.kind !== 'unchanged' && selected.has(i.line)).length : 0
  const tabs: { id: View; label: MessageKey; count: number }[] = plan
    ? [
        { id: 'new', label: 'mi.new', count: groups.new.length },
        { id: 'changed', label: 'mi.changed', count: groups.changed.length },
        { id: 'unchanged', label: 'mi.unchanged', count: groups.unchanged.length },
        { id: 'errors', label: 'mi.errors', count: plan.errors.length },
      ]
    : []

  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <Link to={ROUTES.imports} className="inline-flex min-h-11 items-center text-slate-600">
        ← {t('imp.title')}
      </Link>
      <Card>
        <h1 className="text-xl font-bold">{t('mi.title')}</h1>
        <p className="mt-1 text-[15px] text-slate-600">{t('mi.body')}</p>
        <p className="mt-1 text-sm text-slate-500">{t('imp.excelHint')}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="ghost" className="border border-slate-200" onClick={() => downloadText('oshudh-dam-template.csv', MEDICINE_TEMPLATE_CSV)}>
            {t('imp.template')}
          </Button>
          <Button variant="outline" onClick={() => fileInput.current?.click()}>
            {t('imp.chooseCsv')}
          </Button>
          <input ref={fileInput} type="file" accept=".csv,text/csv" className="hidden" data-testid="medicine-file" onChange={(e) => void onFile(e.target.files?.[0])} />
        </div>

        {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-rose-700">{t(error)}</p>}
        {done !== null && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">{t('imp.done', { count: f.num(done) })}</p>}

        {plan && (
          <div className="mt-4 space-y-3">
            <p className="font-medium">{file?.name}</p>
            <div className="flex flex-wrap gap-2" role="tablist">
              {tabs.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  role="tab"
                  aria-selected={view === x.id}
                  onClick={() => setView(x.id)}
                  className={`min-h-10 rounded-full border px-4 text-sm font-medium ${
                    view === x.id ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  {t(x.label)} {f.num(x.count)}
                </button>
              ))}
            </div>

            <ul className="max-h-[28rem] divide-y divide-slate-100 overflow-auto rounded-lg border border-slate-200">
              {view === 'errors'
                ? plan.errors.map((e) => (
                    <li key={e.line} className="px-3 py-2 text-[15px]">
                      <span className="text-slate-500">
                        {t('imp.line')} {f.num(e.line)}:
                      </span>{' '}
                      <span className="text-rose-700">{e.issues.map((i) => t(`mi.issue.${i}` as MessageKey)).join(', ')}</span>
                    </li>
                  ))
                : groups[view].map((item) => (
                    <ItemRow
                      key={item.line}
                      item={item}
                      checked={selected.has(item.line)}
                      onToggle={view === 'unchanged' ? undefined : () => toggle(item.line)}
                    />
                  ))}
            </ul>

            {groups.new.length + groups.changed.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-slate-700">{t('mi.nothing')}</p>
            ) : (
              <Button disabled={chosen === 0} onClick={apply}>
                {t('mi.apply', { count: f.num(chosen) })}
              </Button>
            )}
          </div>
        )}
      </Card>
    </section>
  )
}
