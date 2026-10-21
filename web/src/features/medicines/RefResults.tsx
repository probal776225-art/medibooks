// "MedEx তালিকা থেকে" — reference matches the shop does not stock yet. Tapping one starts the add form.
import { useMemo } from 'react'
import type { RefMedicine } from '../../catalog/import/medexRef'
import { refKey, useRefSearch, useRefStore } from '../../catalog/refStore'
import { useCatalogStore } from '../../catalog/store'
import { Icon } from '../../components/Icon'
import { medicineDisplayName } from '../../domain/pricing'
import { useT } from '../../i18n'

export function RefResults({ query, onPick, limit = 6 }: { query: string; onPick: (r: RefMedicine) => void; limit?: number }) {
  const t = useT()
  const medicines = useCatalogStore((s) => s.medicines)
  const hasList = useRefStore((s) => s.meta !== null)
  const indexing = useRefStore((s) => s.indexing || (s.meta !== null && s.index === null))
  // Medicines the shop already has (by MedEx id, or same name/strength/form) are not offered again.
  const owned = useMemo(
    () => ({
      ids: new Set(medicines.filter((m) => m.sourceName === 'medex' && m.sourceId).map((m) => m.sourceId!)),
      keys: new Set(medicines.map(refKey)),
    }),
    [medicines],
  )
  const results = useRefSearch(query, owned, limit)

  if (!hasList || query.trim().length < 2) return null
  if (indexing && results.length === 0) return <p className="px-3 py-2 text-sm text-slate-500">{t('ref.loading')}</p>
  if (results.length === 0) return null

  return (
    <div>
      <p className="px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">{t('ref.section')}</p>
      <ul className="divide-y divide-slate-100">
        {results.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onPick(r)}
              className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left hover:bg-amber-50"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  {medicineDisplayName(r)}
                  {r.herbal && (
                    <span className="ml-2 rounded bg-lime-100 px-1.5 py-0.5 text-xs text-lime-800">{t('ref.herbal')}</span>
                  )}
                </span>
                <span className="block truncate text-sm text-slate-500">
                  {[r.genericName, r.manufacturer].filter(Boolean).join(' · ')}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-teal-800">
                <Icon name="plus" className="size-4" /> {t('ref.add')}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
