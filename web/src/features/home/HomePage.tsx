import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { customerPath, ROUTES } from '../../app/routes'
import { Icon } from '../../components/Icon'
import { subscribeRange } from '../../data/repos/transactions'
import { marketDue, queryCustomers } from '../../domain/customers'
import { dueForReminder } from '../../domain/reminders'
import { presetRange, summarize } from '../../domain/reports'
import type { Transaction } from '../../domain/types'
import { useT, type MessageKey } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { useDataStore } from '../../stores/data'
import { DueText } from '../customers/parts'
import { useIsStaff } from '../../stores/role'
import { BackupReminder } from './BackupReminder'

/** Today's transactions, live (Asia/Dhaka day). Re-subscribes when the date changes. */
function useToday(): Transaction[] | null {
  const [txns, setTxns] = useState<Transaction[] | null>(null)
  const [dayStart, setDayStart] = useState(() => presetRange('today', Date.now()).start)
  useEffect(() => {
    const timer = setInterval(() => {
      const start = presetRange('today', Date.now()).start
      if (start !== dayStart) setDayStart(start)
    }, 60_000)
    return () => clearInterval(timer)
  }, [dayStart])
  useEffect(() => {
    const { end } = presetRange('today', dayStart)
    return subscribeRange(dayStart, end, (rows) => setTxns(rows), () => setTxns([]))
  }, [dayStart])
  return txns
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${tone ?? ''}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

export function HomePage() {
  const t = useT()
  const isStaff = useIsStaff()
  const f = useFormat()
  const customers = useDataStore((s) => s.customers)
  const [query, setQuery] = useState('')
  const today = useToday()

  const results = useMemo(
    () => (query.trim() ? queryCustomers(customers, { query, now: Date.now() }).slice(0, 8) : []),
    [customers, query],
  )
  const total = useMemo(() => marketDue(customers), [customers])
  const reminderRules = useDataStore((s) => s.settings.reminder)
  const remindable = useMemo(() => dueForReminder(customers, reminderRules, Date.now()).length, [customers, reminderRules])
  const sum = useMemo(() => (today ? summarize(today) : null), [today])
  const dash = '—'

  return (
    <section className="mx-auto max-w-4xl">
      <label className="flex min-h-14 items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 shadow-sm focus-within:border-teal-600">
        <Icon name="search" className="size-5 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('home.search')}
          className="h-14 flex-1 bg-transparent text-lg outline-none placeholder:text-slate-400"
        />
      </label>

      {query.trim() && (
        <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {results.length === 0 ? (
            <li className="p-4 text-center text-slate-500">{t('home.noMatch')}</li>
          ) : (
            results.map((c) => (
              <li key={c.mobile}>
                <Link to={customerPath(c.mobile)} className="flex min-h-14 items-center gap-3 px-4 hover:bg-slate-50">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{c.name}</span>
                    <span className="block text-sm text-slate-500">{f.mobile(c.mobile)}</span>
                  </span>
                  <DueText paisa={c.totalDuePaisa} />
                </Link>
              </li>
            ))
          )}
        </ul>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {!isStaff && <Stat label={t('home.marketDue')} value={f.money(total)} tone="text-rose-700" />}
        <Stat
          label={t('home.todaySale')}
          value={sum ? f.money(sum.bakiGivenPaisa) : dash}
          sub={sum ? t('home.todayCounts', { sales: sum.saleCount, payments: sum.paymentCount }) : undefined}
        />
        <Stat label={t('home.todayPaid')} value={sum ? f.money(sum.collectedPaisa) : dash} tone="text-emerald-700" />
        {!isStaff && (
          <Link to={ROUTES.reminders} className="block hover:opacity-90">
            <Stat label={t('home.todayReminders')} value={f.num(remindable)} sub={t('home.remindersSub')} tone="text-amber-700" />
          </Link>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link
          to={ROUTES.newSale}
          className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-teal-700 text-lg font-semibold text-white hover:bg-teal-800"
        >
          <Icon name="plus" /> {t('nav.newSale')}
        </Link>
        <Link
          to={ROUTES.payment}
          className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-teal-700 text-lg font-semibold text-teal-800 hover:bg-teal-50"
        >
          <Icon name="wallet" /> {t('nav.payment')}
        </Link>
      </div>

      {!isStaff && <BackupReminder />}

      <div className="mt-6 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">{t('home.recent')}</h2>
        <Link to={ROUTES.reports} className="min-h-11 text-sm font-medium text-teal-700">
          {t('home.allReports')} →
        </Link>
      </div>
      {today && today.length > 0 ? (
        <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {today.slice(0, 10).map((txn) => {
            const plus = txn.effectPaisa > 0
            return (
              <li key={txn.id}>
                <Link to={customerPath(txn.customerId)} className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-slate-50">
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate font-medium ${txn.voided ? 'text-slate-400 line-through' : ''}`}>
                      {txn.customerName}
                    </span>
                    <span className="block text-sm text-slate-500">
                      {t(`ledger.type.${txn.type}` as MessageKey)} · {f.time(txn.createdAt)}
                      {txn.voided && ` · ${t('ledger.voided')}`}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 font-semibold tabular-nums ${
                      txn.voided ? 'text-slate-400 line-through' : plus ? 'text-rose-700' : 'text-emerald-700'
                    }`}
                  >
                    {txn.effectPaisa > 0 ? '+' : txn.effectPaisa < 0 ? '−' : ''}
                    {f.money(Math.abs(txn.effectPaisa))}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-2 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
          {today === null ? t('app.loading') : t('home.recentEmpty')}
        </p>
      )}
    </section>
  )
}
