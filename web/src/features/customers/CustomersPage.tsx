import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { customerPath, ROUTES } from '../../app/routes'
import { Icon } from '../../components/Icon'
import { buttonClass, TextInput } from '../../components/ui'
import { queryCustomers, type CustomerFilter, type CustomerSort } from '../../domain/customers'
import { useT, type MessageKey } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { useDataStore } from '../../stores/data'
import { AgingBadge, DueText } from './parts'

const FILTERS: { id: CustomerFilter; label: MessageKey }[] = [
  { id: 'all', label: 'filter.all' },
  { id: 'due', label: 'filter.due' },
  { id: 'bigDue', label: 'filter.bigDue' },
  { id: 'smsOff', label: 'filter.smsOff' },
  { id: 'archived', label: 'filter.archived' },
]

const SORTS: { id: CustomerSort; label: MessageKey }[] = [
  { id: 'due', label: 'sort.due' },
  { id: 'name', label: 'sort.name' },
  { id: 'activity', label: 'sort.activity' },
  { id: 'aging', label: 'sort.aging' },
]

export function CustomersPage() {
  const t = useT()
  const f = useFormat()
  const customers = useDataStore((s) => s.customers)
  const status = useDataStore((s) => s.customersStatus)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<CustomerFilter>('all')
  const [sort, setSort] = useState<CustomerSort>('due')
  const now = Date.now()

  const rows = useMemo(
    () => queryCustomers(customers, { query, filter, sort, now: Date.now() }),
    [customers, query, filter, sort],
  )

  return (
    <section className="mx-auto max-w-4xl">
      <div className="flex items-center gap-3">
        <h1 className="flex-1 text-2xl font-bold">
          {t('nav.customers')}{' '}
          <span className="text-base font-normal text-slate-500">{t('customer.count', { count: rows.length })}</span>
        </h1>
        <Link to={ROUTES.customerNew} className={buttonClass('primary')}>
          <Icon name="plus" className="size-5" /> {t('customer.new')}
        </Link>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Icon name="search" className="pointer-events-none absolute top-3.5 left-3 size-5 text-slate-400" />
          <TextInput
            type="search"
            placeholder={t('list.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </label>
        <select
          aria-label={t('list.sort')}
          value={sort}
          onChange={(e) => setSort(e.target.value as CustomerSort)}
          className="min-h-12 rounded-xl border border-slate-300 bg-white px-3 text-[16px]"
        >
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {t(s.label)}
            </option>
          ))}
        </select>
      </div>

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">
        {FILTERS.map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setFilter(x.id)}
            className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-medium ${
              filter === x.id ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-700'
            }`}
          >
            {t(x.label)}
          </button>
        ))}
      </div>

      {status === 'loading' && customers.length === 0 ? (
        <p className="mt-6 text-center text-slate-500">{t('app.loading')}</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
          {customers.length === 0 ? t('customer.empty') : t('home.noMatch')}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {rows.map((c) => (
            <li key={c.mobile}>
              <Link to={customerPath(c.mobile)} className="flex min-h-16 items-center gap-3 px-4 py-2 hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.name}</p>
                  <p className="truncate text-sm text-slate-500">
                    {f.mobile(c.mobile)}
                    {c.address ? ` · ${c.address}` : ''}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <DueText paisa={c.totalDuePaisa} />
                  <AgingBadge customer={c} now={now} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
