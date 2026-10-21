import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { customerPath, ROUTES } from '../../app/routes'
import { Icon } from '../../components/Icon'
import { marketDue, queryCustomers } from '../../domain/customers'
import { useT, type MessageKey } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { useDataStore } from '../../stores/data'
import { DueText } from '../customers/parts'

/** Today's numbers and transactions are wired up in Phase 9. */
const TODAY_CARDS: MessageKey[] = ['home.todaySale', 'home.todayPaid', 'home.todayReminders']

export function HomePage() {
  const t = useT()
  const f = useFormat()
  const customers = useDataStore((s) => s.customers)
  const [query, setQuery] = useState('')

  const results = useMemo(
    () => (query.trim() ? queryCustomers(customers, { query, now: Date.now() }).slice(0, 8) : []),
    [customers, query],
  )
  const total = useMemo(() => marketDue(customers), [customers])

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
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">{t('home.marketDue')}</p>
          <p className="mt-1 text-2xl font-bold text-rose-700 tabular-nums">{f.money(total)}</p>
        </div>
        {TODAY_CARDS.map((key) => (
          <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">{t(key)}</p>
            <p className="mt-1 text-2xl font-bold text-slate-300">—</p>
          </div>
        ))}
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

      <h2 className="mt-6 text-lg font-semibold">{t('home.recent')}</h2>
      <p className="mt-2 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
        {t('home.noData')}
      </p>
    </section>
  )
}
