// রিপোর্ট (SPEC §10): one transactions query per date range + the in-memory customer list.
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { customerPath } from '../../app/routes'
import { Button, Card } from '../../components/ui'
import { fetchRange } from '../../data/repos/transactions'
import { formatDate } from '../../domain/dates'
import {
  agingBuckets,
  customRange,
  newCustomersIn,
  presetRange,
  reportCsv,
  summarize,
  topDue,
  type DateRange,
  type RangePreset,
} from '../../domain/reports'
import { marketDue } from '../../domain/customers'
import { PAYMENT_METHODS, type Transaction } from '../../domain/types'
import { downloadText } from '../../lib/files'
import { useT, type MessageKey } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { useDataStore } from '../../stores/data'
import { PngPreviewDialog } from '../print/PngPreviewDialog'
import { ReportImage } from '../print/PrintTemplates'

type Choice = RangePreset | 'custom'
const PRESETS: { id: Choice; label: MessageKey }[] = [
  { id: 'today', label: 'rep.today' },
  { id: 'week', label: 'rep.week' },
  { id: 'month', label: 'rep.month' },
  { id: 'custom', label: 'rep.custom' },
]

function Row({ label, value, sub, strong }: { label: string; value: string; sub?: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <span>
        <span className={strong ? 'font-semibold' : 'text-slate-700'}>{label}</span>
        {sub && <span className="ml-2 text-sm text-slate-500">{sub}</span>}
      </span>
      <span className={`tabular-nums ${strong ? 'text-lg font-bold' : 'font-medium'}`}>{value}</span>
    </div>
  )
}

export function ReportsPage() {
  const t = useT()
  const f = useFormat()
  const customers = useDataStore((s) => s.customers)
  const [choice, setChoice] = useState<Choice>('today')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [range, setRange] = useState<DateRange>(() => presetRange('today', Date.now()))
  const [badRange, setBadRange] = useState(false)
  const [data, setData] = useState<{ txns: Transaction[]; fromCache: boolean } | null>(null)
  const [showImage, setShowImage] = useState(false)

  useEffect(() => {
    let alive = true
    setData(null)
    fetchRange(range.start, range.end)
      .then((d) => alive && setData(d))
      .catch(() => alive && setData({ txns: [], fromCache: true }))
    return () => {
      alive = false
    }
  }, [range])

  function pick(c: Choice) {
    setChoice(c)
    setBadRange(false)
    if (c !== 'custom') setRange(presetRange(c, Date.now()))
  }

  function showCustom() {
    const r = customRange(from, to)
    setBadRange(r === null)
    if (r) setRange(r)
  }

  const sum = useMemo(() => (data ? summarize(data.txns) : null), [data])
  const now = Date.now()
  const buckets = useMemo(() => agingBuckets(customers, now), [customers, now])
  const top = useMemo(() => topDue(customers, 10), [customers])
  const market = useMemo(() => marketDue(customers), [customers])
  const newCount = useMemo(() => newCustomersIn(customers, range), [customers, range])
  const rangeText = `${f.date(range.start)} – ${f.date(range.end - 1)}`

  function exportCsv() {
    if (!sum) return
    const csv = reportCsv({
      title: `${useDataStore.getState().settings.shop.name} — ${t('nav.reports')}`,
      rangeText: `${formatDate(range.start)} – ${formatDate(range.end - 1)}`,
      rows: [
        [t('rep.bakiGiven'), sum.bakiGivenPaisa, true],
        [t('rep.salesNet'), sum.salesNetPaisa, true],
        [t('rep.billsCount'), sum.saleCount, false],
        [t('rep.collected'), sum.collectedPaisa, true],
        ...PAYMENT_METHODS.map((m) => [`${t('rep.collected')} — ${t(`method.${m}`)}`, sum.collectedByMethod[m], true] as [string, number, boolean]),
        [t('rep.discount'), sum.discountPaisa, true],
        [t('rep.opening'), sum.openingPaisa, true],
        [t('rep.adjustment'), sum.adjustmentPaisa, true],
        [t('rep.voided'), sum.voidedCount, false],
        [t('rep.netChange'), sum.netChangePaisa, true],
        [t('rep.newCustomers'), newCount, false],
        [t('rep.marketNow'), market, true],
      ],
      buckets: buckets.map((b) => ({ label: b.key, count: b.count, paisa: b.paisa })),
      top: top.map((c) => ({ name: c.name, mobile: c.mobile, paisa: c.totalDuePaisa })),
      headings: {
        bucket: t('rep.colDays'),
        count: t('rep.colCustomers'),
        amount: t('rep.colAmount'),
        name: t('rep.colName'),
        mobile: t('rep.colMobile'),
        due: t('rep.colDue'),
      },
    })
    const stamp = new Date(range.start + 6 * 3_600_000).toISOString().slice(0, 10)
    downloadText(`report-${stamp}.csv`, csv)
  }

  const dash = '—'
  return (
    <section className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex-1 text-2xl font-bold">{t('nav.reports')}</h1>
        <Button variant="outline" disabled={!sum} onClick={exportCsv}>
          {t('rep.csv')}
        </Button>
        <Button variant="ghost" disabled={!sum} className="border border-slate-200" onClick={() => setShowImage(true)}>
          {t('rep.png')}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={choice === p.id}
            onClick={() => pick(p.id)}
            className={`min-h-10 rounded-full border px-4 text-sm font-medium ${
              choice === p.id ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-700'
            }`}
          >
            {t(p.label)}
          </button>
        ))}
      </div>
      {choice === 'custom' && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">
            <span className="block text-slate-600">{t('rep.from')}</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-11 rounded-lg border border-slate-300 px-2" />
          </label>
          <label className="text-sm">
            <span className="block text-slate-600">{t('rep.to')}</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-11 rounded-lg border border-slate-300 px-2" />
          </label>
          <Button onClick={showCustom}>{t('rep.show')}</Button>
          {badRange && <span className="text-sm text-rose-600">{t('rep.badRange')}</span>}
        </div>
      )}
      <p className="text-slate-600">{rangeText}</p>
      {data?.fromCache && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{t('rep.cached')}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="divide-y divide-slate-100 py-1">
          <Row label={t('rep.bakiGiven')} value={sum ? f.money(sum.bakiGivenPaisa) : dash} strong />
          <Row
            label={t('rep.salesNet')}
            sub={sum ? t('rep.saleCount', { count: sum.saleCount }) : undefined}
            value={sum ? f.money(sum.salesNetPaisa) : dash}
          />
          <Row label={t('rep.collected')} sub={t('rep.collectedNote')} value={sum ? f.money(sum.collectedPaisa) : dash} strong />
          <Row label={t('rep.discount')} value={sum ? f.money(sum.discountPaisa) : dash} />
          <Row label={t('rep.newCustomers')} value={f.num(newCount)} />
          {sum && sum.openingCount > 0 && <Row label={t('rep.opening')} sub={f.num(sum.openingCount)} value={f.money(sum.openingPaisa)} />}
          {sum && sum.adjustmentCount > 0 && <Row label={t('rep.adjustment')} value={f.money(sum.adjustmentPaisa)} />}
          {sum && sum.voidedCount > 0 && <Row label={t('rep.voided')} value={f.num(sum.voidedCount)} />}
          <Row label={t('rep.netChange')} value={sum ? f.money(sum.netChangePaisa) : dash} />
        </Card>

        <Card>
          <h2 className="font-semibold">{t('rep.byMethod')}</h2>
          <div className="mt-1 divide-y divide-slate-100">
            {PAYMENT_METHODS.map((m) => (
              <Row key={m} label={t(`method.${m}`)} value={sum ? f.money(sum.collectedByMethod[m]) : dash} />
            ))}
            {sum && <Row label={t('rep.paymentCount', { count: sum.paymentCount })} value="" />}
          </div>
          <p className="mt-2 text-sm text-slate-500">{t('rep.smsLater')}</p>
        </Card>

        <Card>
          <Row label={t('rep.marketNow')} value={f.money(market)} strong />
          <h2 className="mt-2 font-semibold">{t('rep.aging')}</h2>
          <ul className="mt-1 space-y-2">
            {buckets.map((b) => {
              const share = market > 0 ? Math.round((b.paisa / market) * 100) : 0
              return (
                <li key={b.key}>
                  <div className="flex justify-between text-[15px]">
                    <span>
                      {t('rep.days', { range: b.key })} <span className="text-slate-500">· {t('rep.count', { count: b.count })}</span>
                    </span>
                    <span className="tabular-nums">{f.money(b.paisa)}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full ${b.key === '0-30' ? 'bg-emerald-500' : b.key === '31-60' ? 'bg-amber-400' : 'bg-rose-500'}`}
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>

        <Card>
          <h2 className="font-semibold">{t('rep.top')}</h2>
          <ol className="mt-1 divide-y divide-slate-100">
            {top.map((c, i) => (
              <li key={c.mobile}>
                <Link to={customerPath(c.mobile)} className="flex min-h-11 items-center gap-3 hover:bg-slate-50">
                  <span className="w-6 text-sm text-slate-400">{f.num(i + 1)}</span>
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  <span className="font-semibold text-rose-700 tabular-nums">{f.money(c.totalDuePaisa)}</span>
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      </div>
      {showImage && sum && (
        <PngPreviewDialog
          title={t('nav.reports')}
          fileName={`report-${new Date(range.start + 6 * 3_600_000).toISOString().slice(0, 10)}.png`}
          image={<ReportImage rangeText={rangeText} sum={sum} newCount={newCount} market={market} buckets={buckets} top={top} />}
          onClose={() => setShowImage(false)}
        />
      )}
    </section>
  )
}
