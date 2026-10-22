// Reusable offline medicine search: keyboard (↑ ↓ Enter) and touch. Used here and by the sale screen (Phase 4).
import { useState, type KeyboardEvent } from 'react'
import type { RefMedicine } from '../../catalog/import/medexRef'
import { useMedicineSearch } from '../../catalog/store'
import { Icon } from '../../components/Icon'
import { TextInput } from '../../components/ui'
import type { Medicine } from '../../domain/types'
import { useT } from '../../i18n'
import { MedicineLine } from './parts'
import { RefResults } from './RefResults'

interface Props {
  onSelect: (m: Medicine) => void
  /** Offer "add as new medicine" when nothing matches. */
  onAddNew?: (name: string) => void
  /** Also show matches from the MedEx reference list; picking one starts the add form from it. */
  onPickReference?: (r: RefMedicine) => void
  autoFocus?: boolean
  includeInactive?: boolean
  /** id for the input, so a keyboard shortcut can focus it. */
  inputId?: string
}

export function MedicineSearch({ onSelect, onAddNew, onPickReference, autoFocus, includeInactive, inputId }: Props) {
  const t = useT()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const results = useMedicineSearch(query, { includeInactive, limit: 12 })

  function choose(m: Medicine) {
    onSelect(m)
    setQuery('')
    setActive(0)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const m = results[active]
      if (m) choose(m)
      else if (query.trim() && onAddNew) onAddNew(query.trim())
    } else if (e.key === 'Escape') {
      setQuery('')
    }
  }

  return (
    <div>
      <label className="relative block">
        <Icon name="search" className="pointer-events-none absolute top-3.5 left-3 size-5 text-slate-400" />
        <TextInput
          id={inputId}
          type="search"
          role="combobox"
          aria-expanded={results.length > 0}
          aria-autocomplete="list"
          autoFocus={autoFocus}
          autoComplete="off"
          placeholder={t('med.search')}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          onKeyDown={onKeyDown}
          className="pl-10"
        />
      </label>
      {query.trim() && (
        <ul role="listbox" className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {results.map((m, i) => (
            <li key={m.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onClick={() => choose(m)}
                onMouseEnter={() => setActive(i)}
                className={`flex min-h-14 w-full items-center px-3 py-2 text-left ${i === active ? 'bg-teal-50' : 'hover:bg-slate-50'}`}
              >
                <MedicineLine medicine={m} />
              </button>
            </li>
          ))}
          {results.length === 0 && <li className="px-3 py-3 text-slate-500">{t('med.noMatch')}</li>}
          {onPickReference && (
            <li>
              <RefResults query={query} onPick={onPickReference} />
            </li>
          )}
          {onAddNew && (
            <li>
              <button
                type="button"
                onClick={() => onAddNew(query.trim())}
                className="flex min-h-12 w-full items-center gap-2 px-3 text-left font-medium text-teal-800 hover:bg-teal-50"
              >
                <Icon name="plus" className="size-5" /> {t('med.addNamed', { name: query.trim() })}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
