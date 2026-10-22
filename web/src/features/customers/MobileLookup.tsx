// Core flow (SPEC §3): type a mobile → existing customer card, or an inline new-customer form.
// Reused by New Baki (Phase 4) and Payment (Phase 5).
import { useMemo, useState, type ReactNode } from 'react'
import { Field, TextInput } from '../../components/ui'
import { queryCustomers } from '../../domain/customers'
import { toEnglishDigits } from '../../domain/digits'
import { normalizeMobile } from '../../domain/phone'
import type { Customer } from '../../domain/types'
import { useT } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { useDataStore } from '../../stores/data'
import { CustomerForm } from './CustomerForm'
import { DueText } from './parts'

interface Props {
  initialMobile?: string
  /** What to show once an existing customer is found. */
  renderFound: (c: Customer) => ReactNode
  onCreated: (mobile: string) => void
  /** false = only existing customers (e.g. taking a payment). */
  allowCreate?: boolean
}

export function MobileLookup({ initialMobile = '', renderFound, onCreated, allowCreate = true }: Props) {
  const t = useT()
  const f = useFormat()
  const [raw, setRaw] = useState(initialMobile)
  const customers = useDataStore((s) => s.customers)
  const byMobile = useDataStore((s) => s.byMobile)
  const ready = useDataStore((s) => s.customersStatus === 'ready')

  const mobile = normalizeMobile(raw)
  const digitCount = toEnglishDigits(raw).replace(/\D/g, '').length
  const invalid = !mobile && digitCount >= 11
  const found = mobile ? byMobile.get(mobile) : undefined

  // While typing, suggest customers by partial number or name.
  const suggestions = useMemo(() => {
    if (mobile || raw.trim().length < 3) return []
    return queryCustomers(customers, { query: raw, now: Date.now() }).slice(0, 5)
  }, [customers, mobile, raw])

  return (
    <div className="space-y-3">
      <Field
        label={t('customer.mobile')}
        hint={t('customer.mobileHint')}
        error={invalid ? t('customer.mobileInvalid') : null}
      >
        <TextInput
          type="tel"
          inputMode="tel"
          autoFocus
          autoComplete="off"
          placeholder="01XXXXXXXXX"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          className="text-xl tracking-wide"
        />
      </Field>

      {suggestions.length > 0 && (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {suggestions.map((c) => (
            <li key={c.mobile}>
              <button
                type="button"
                onClick={() => setRaw(c.mobile)}
                className="flex min-h-12 w-full items-center gap-3 px-3 text-left hover:bg-slate-50"
              >
                <span className="flex-1">
                  <span className="block font-medium">{c.name}</span>
                  <span className="block text-sm text-slate-500">{f.mobile(c.mobile)}</span>
                </span>
                <DueText paisa={c.totalDuePaisa} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {mobile && found && renderFound(found)}

      {mobile && !found && ready && !allowCreate && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">{t('pay.noCustomer')}</p>
      )}

      {mobile && !found && ready && allowCreate && (
        <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4">
          <p className="mb-3 font-semibold text-teal-800">{t('customer.notFound')}</p>
          <CustomerForm key={mobile} mode="create" mobile={mobile} onSaved={onCreated} />
        </div>
      )}
    </div>
  )
}
