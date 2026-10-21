import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { medicinePath } from '../../app/routes'
import type { RefMedicine } from '../../catalog/import/medexRef'
import { syncMedicines, useCatalogStore, useMedicineSearch } from '../../catalog/store'
import { Icon } from '../../components/Icon'
import { Button, TextInput } from '../../components/ui'
import type { Medicine } from '../../domain/types'
import { useT, type MessageKey } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { MedicineLine } from './parts'
import { RefResults } from './RefResults'
import { QuickAddMedicine } from './QuickAddMedicine'

type StatusFilter = 'active' | 'inactive' | 'all'
const FILTERS: { id: StatusFilter; label: MessageKey }[] = [
  { id: 'active', label: 'med.filter.active' },
  { id: 'inactive', label: 'med.filter.inactive' },
  { id: 'all', label: 'med.filter.all' },
]
const PAGE = 100

function SyncStatus() {
  const t = useT()
  const f = useFormat()
  const { syncing, lastSyncAt, syncFailed } = useCatalogStore()
  const text = syncing
    ? t('med.syncing')
    : syncFailed
      ? t('med.syncOffline')
      : lastSyncAt
        ? t('med.synced', { time: f.time(lastSyncAt) })
        : ''
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500">
      <span className="flex-1">{text}</span>
      <Button variant="ghost" className="min-h-10 text-sm" disabled={syncing} onClick={() => void syncMedicines()}>
        {t('med.sync')}
      </Button>
    </div>
  )
}

export function MedicinesPage() {
  const t = useT()
  const navigate = useNavigate()
  const all = useCatalogStore((s) => s.medicines)
  const status = useCatalogStore((s) => s.status)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('active')
  const [shown, setShown] = useState(PAGE)
  const [adding, setAdding] = useState<{ name?: string; reference?: RefMedicine } | null>(null)

  const searched = useMedicineSearch(query, { includeInactive: filter !== 'active', limit: 300 })
  const rows: Medicine[] = useMemo(() => {
    const base = query.trim() ? searched : all
    return filter === 'all' ? base : base.filter((m) => m.status === filter)
  }, [all, searched, query, filter])

  return (
    <section className="mx-auto max-w-4xl">
      <div className="flex items-center gap-3">
        <h1 className="flex-1 text-2xl font-bold">
          {t('nav.medicines')}{' '}
          <span className="text-base font-normal text-slate-500">{t('med.count', { count: rows.length })}</span>
        </h1>
        <Button onClick={() => setAdding({ name: query.trim() })}>
          <Icon name="plus" className="size-5" /> {t('med.new')}
        </Button>
      </div>
      <SyncStatus />

      <label className="relative mt-2 block">
        <Icon name="search" className="pointer-events-none absolute top-3.5 left-3 size-5 text-slate-400" />
        <TextInput
          type="search"
          placeholder={t('med.search')}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setShown(PAGE)
          }}
          className="pl-10"
        />
      </label>

      <div className="mt-3 flex gap-2">
        {FILTERS.map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setFilter(x.id)}
            className={`min-h-10 rounded-full border px-4 text-sm font-medium ${
              filter === x.id ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-700'
            }`}
          >
            {t(x.label)}
          </button>
        ))}
      </div>

      {status !== 'ready' && all.length === 0 ? (
        <p className="mt-6 text-center text-slate-500">{t('app.loading')}</p>
      ) : rows.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
          <p>{all.length === 0 ? t('med.empty') : t('med.noMatch')}</p>
          {query.trim() && (
            <Button variant="outline" className="mt-3" onClick={() => setAdding({ name: query.trim() })}>
              {t('med.addNamed', { name: query.trim() })}
            </Button>
          )}
        </div>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {rows.slice(0, shown).map((m) => (
              <li key={m.id}>
                <Link to={medicinePath(m.id)} className="flex min-h-14 items-center px-4 py-2 hover:bg-slate-50">
                  <MedicineLine medicine={m} />
                </Link>
              </li>
            ))}
          </ul>
          {rows.length > shown && (
            <Button variant="ghost" className="mt-2 w-full border border-slate-200" onClick={() => setShown((n) => n + PAGE)}>
              {t('med.showMore')}
            </Button>
          )}
        </>
      )}

      {query.trim() && (
        <div className="mt-3 overflow-hidden rounded-2xl border border-amber-200 bg-white empty:hidden">
          <RefResults query={query} limit={8} onPick={(reference) => setAdding({ reference })} />
        </div>
      )}

      {adding !== null && (
        <QuickAddMedicine
          initialName={adding.name}
          reference={adding.reference}
          onClose={() => setAdding(null)}
          onAdded={(m) => {
            setAdding(null)
            navigate(medicinePath(m.id))
          }}
        />
      )}
    </section>
  )
}
