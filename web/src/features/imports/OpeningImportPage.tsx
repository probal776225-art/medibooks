// চালু বাকি ইমপোর্ট (SPEC §7): CSV file or quick grid → preview with problems → import (no SMS).
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../app/routes'
import { Button, Card } from '../../components/ui'
import { localDb } from '../../data/localdb'
import { importOpeningRows } from '../../data/repos/openingImport'
import {
  checkOpeningRows,
  OPENING_TEMPLATE_CSV,
  openingRowsFromCsv,
  type OpeningCheck,
  type OpeningInputRow,
} from '../../domain/openingImport'
import { downloadText, readCsv } from '../../lib/files'
import { useT, type MessageKey } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { useDataStore } from '../../stores/data'

type GridField = 'name' | 'mobile' | 'address' | 'amount'
const GRID_FIELDS: { field: GridField; label: MessageKey; mode?: 'tel' | 'decimal' }[] = [
  { field: 'name', label: 'op.colName' },
  { field: 'mobile', label: 'op.colMobile', mode: 'tel' },
  { field: 'address', label: 'op.colAddress' },
  { field: 'amount', label: 'op.colAmount', mode: 'decimal' },
]
const emptyRow = (line: number): OpeningInputRow => ({ line, name: '', mobile: '', address: '', amount: '', asOf: '', note: '' })
const emptyGrid = () => Array.from({ length: 5 }, (_, i) => emptyRow(i + 1))

function Preview({ check, onImport }: { check: OpeningCheck; onImport: (addToExisting: boolean) => void }) {
  const t = useT()
  const f = useFormat()
  const [addToExisting, setAddToExisting] = useState(true)
  const count = check.okRows.filter((r) => !r.existing || addToExisting).length
  return (
    <div className="mt-4 space-y-3">
      <p className="font-medium">
        {t('op.summary', {
          ok: f.num(check.okRows.length),
          new: f.num(check.newCount),
          old: f.num(check.existingCount),
          total: f.money(check.totalPaisa),
          bad: f.num(check.issueCount),
        })}
      </p>
      <div className="max-h-96 overflow-auto rounded-lg border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-2 py-1.5">{t('imp.line')}</th>
              <th className="px-2 py-1.5">{t('op.colName')}</th>
              <th className="px-2 py-1.5">{t('op.colMobile')}</th>
              <th className="px-2 py-1.5 text-right">{t('op.colAmount')}</th>
              <th className="px-2 py-1.5">{t('imp.status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {check.rows.map((r) => (
              <tr key={r.line} className={r.issues.length ? 'bg-rose-50' : ''}>
                <td className="px-2 py-1.5 text-slate-500">{f.num(r.line)}</td>
                <td className="px-2 py-1.5">{r.name}</td>
                <td className="px-2 py-1.5 font-mono text-xs">{r.mobileNorm ?? r.mobile}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{r.amountPaisa === null ? r.amount : f.money(r.amountPaisa)}</td>
                <td className="px-2 py-1.5">
                  {r.issues.length ? (
                    <span className="text-rose-700">{r.issues.map((i) => t(`op.issue.${i}` as MessageKey)).join(', ')}</span>
                  ) : r.existing ? (
                    <span className="text-amber-700">{t('op.existing')}</span>
                  ) : (
                    <span className="text-emerald-700">{t('imp.ok')}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {check.existingCount > 0 && (
        <fieldset className="space-y-1">
          <legend className="text-sm font-medium">{t('op.existingPolicy')}</legend>
          <label className="flex min-h-10 items-center gap-2">
            <input type="radio" checked={addToExisting} onChange={() => setAddToExisting(true)} className="size-5 accent-teal-700" />
            {t('op.existingAdd')}
          </label>
          <label className="flex min-h-10 items-center gap-2">
            <input type="radio" checked={!addToExisting} onChange={() => setAddToExisting(false)} className="size-5 accent-teal-700" />
            {t('op.existingSkip')}
          </label>
        </fieldset>
      )}
      <Button disabled={count === 0} onClick={() => onImport(addToExisting)}>
        {t('op.import', { count: f.num(count) })}
      </Button>
    </div>
  )
}

function Grid({ rows, setRows }: { rows: OpeningInputRow[]; setRows: (r: OpeningInputRow[]) => void }) {
  const t = useT()
  const table = useRef<HTMLTableElement>(null)

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const cells = [...(table.current?.querySelectorAll<HTMLInputElement>('input[data-cell]') ?? [])]
    const i = cells.indexOf(e.currentTarget)
    if (i >= 0 && i < cells.length - 1) cells[i + 1]!.focus()
    else {
      setRows([...rows, emptyRow(rows.length + 1)])
      setTimeout(() => table.current?.querySelectorAll<HTMLInputElement>('input[data-cell]')[cells.length]?.focus(), 0)
    }
  }

  return (
    <div>
      <p className="text-sm text-slate-500">{t('op.gridHint')}</p>
      <div className="mt-2 overflow-x-auto">
        <table ref={table} className="w-full min-w-[560px] text-sm">
          <thead className="text-left text-slate-600">
            <tr>
              <th className="w-8 px-1" />
              {GRID_FIELDS.map((c) => (
                <th key={c.field} className="px-1 py-1">
                  {t(c.label)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>
                <td className="px-1 text-slate-400">{ri + 1}</td>
                {GRID_FIELDS.map((c) => (
                  <td key={c.field} className="p-0.5">
                    <input
                      data-cell
                      aria-label={`${t(c.label)} ${ri + 1}`}
                      inputMode={c.mode}
                      value={r[c.field]}
                      onKeyDown={onKeyDown}
                      onChange={(e) => setRows(rows.map((x, xi) => (xi === ri ? { ...x, [c.field]: e.target.value } : x)))}
                      className="h-10 w-full rounded-lg border border-slate-300 px-2 outline-none focus:border-teal-600"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={() => setRows([...rows, emptyRow(rows.length + 1)])} className="mt-1 min-h-10 text-sm text-teal-700">
        {t('op.addRow')}
      </button>
    </div>
  )
}

export function OpeningImportPage() {
  const t = useT()
  const f = useFormat()
  const byMobile = useDataStore((s) => s.byMobile)
  const existing = useMemo(() => new Set(byMobile.keys()), [byMobile])
  const [tab, setTab] = useState<'csv' | 'grid'>('csv')
  const [check, setCheck] = useState<OpeningCheck | null>(null)
  const [error, setError] = useState<MessageKey | null>(null)
  const [done, setDone] = useState<number | null>(null)
  const [grid, setGrid] = useState<OpeningInputRow[]>(emptyGrid)
  const [gridLoaded, setGridLoaded] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  // Grid draft survives closing the app.
  useEffect(() => {
    void localDb.drafts.get('openingGrid').then((row) => {
      if (row?.key === 'openingGrid' && row.rows.length) setGrid(row.rows)
      setGridLoaded(true)
    })
  }, [])
  useEffect(() => {
    if (!gridLoaded) return
    const timer = setTimeout(() => void localDb.drafts.put({ key: 'openingGrid', rows: grid, savedAt: Date.now() }), 300)
    return () => clearTimeout(timer)
  }, [grid, gridLoaded])

  async function onFile(file: File | undefined) {
    if (!file) return
    setError(null)
    setDone(null)
    try {
      setCheck(checkOpeningRows(openingRowsFromCsv(await readCsv(file)), existing, Date.now()))
    } catch (e) {
      console.error('CSV read failed', e)
      setError('imp.readFailed')
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  function onImport(addToExisting: boolean) {
    if (!check) return
    const rows = check.okRows.filter((r) => !r.existing || addToExisting)
    setDone(importOpeningRows(rows, tab))
    setCheck(null)
    if (tab === 'grid') setGrid(emptyGrid())
  }

  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <Link to={ROUTES.imports} className="inline-flex min-h-11 items-center text-slate-600">
        ← {t('imp.title')}
      </Link>
      <Card>
        <h1 className="text-xl font-bold">{t('op.title')}</h1>
        <p className="mt-1 text-[15px] text-slate-600">{t('op.body')}</p>

        <div className="mt-3 flex overflow-hidden rounded-xl border border-slate-300" role="tablist">
          {(['csv', 'grid'] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => {
                setTab(id)
                setCheck(null)
                setDone(null)
              }}
              className={`min-h-11 flex-1 font-semibold ${tab === id ? 'bg-teal-700 text-white' : 'text-slate-700'}`}
            >
              {t(id === 'csv' ? 'op.tabCsv' : 'op.tabGrid')}
            </button>
          ))}
        </div>

        {tab === 'csv' ? (
          <div className="mt-3 space-y-2">
            <p className="text-sm text-slate-500">{t('imp.excelHint')}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" className="border border-slate-200" onClick={() => downloadText('chalu-baki-template.csv', OPENING_TEMPLATE_CSV)}>
                {t('imp.template')}
              </Button>
              <Button variant="outline" onClick={() => fileInput.current?.click()}>
                {t('imp.chooseCsv')}
              </Button>
              <input ref={fileInput} type="file" accept=".csv,text/csv" className="hidden" data-testid="opening-file" onChange={(e) => void onFile(e.target.files?.[0])} />
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <Grid rows={grid} setRows={setGrid} />
            <div className="mt-2 flex gap-2">
              <Button variant="outline" onClick={() => setCheck(checkOpeningRows(grid, existing, Date.now()))}>
                {t('op.check')}
              </Button>
              <Button variant="ghost" onClick={() => setGrid(emptyGrid())}>
                {t('op.clearGrid')}
              </Button>
            </div>
          </div>
        )}

        {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-rose-700">{t(error)}</p>}
        {done !== null && (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">{t('imp.done', { count: f.num(done) })}</p>
        )}
        {check && <Preview key={check.rows.length} check={check} onImport={onImport} />}
      </Card>
    </section>
  )
}
