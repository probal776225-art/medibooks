import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { customerPath } from '../../app/routes'
import type { Customer } from '../../domain/types'
import { useT } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { AgingBadge, DueText } from './parts'

/** Customer card: name, mobile, address, big due, aging, last payment. */
export function CustomerSummary({ customer, children }: { customer: Customer; children?: ReactNode }) {
  const t = useT()
  const f = useFormat()
  const now = Date.now()
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xl font-bold">{customer.name}</p>
          <p className="text-slate-600">{f.mobile(customer.mobile)}</p>
          {customer.address && <p className="text-sm text-slate-500">{customer.address}</p>}
          {customer.note && <p className="mt-1 text-sm text-slate-500 italic">{customer.note}</p>}
        </div>
        {customer.archived && (
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
            {t('customer.archived')}
          </span>
        )}
      </div>
      {customer.movedTo && (
        <Link to={customerPath(customer.movedTo)} className="mt-2 block text-sm font-medium text-teal-700 underline">
          {t('mob.movedTo', { mobile: f.mobile(customer.movedTo) })}
        </Link>
      )}
      <div className="mt-3 flex flex-wrap items-end justify-between gap-2 border-t border-slate-100 pt-3">
        <div>
          <p className="text-sm text-slate-500">{t('customer.due')}</p>
          <DueText paisa={customer.totalDuePaisa} size="xl" />
        </div>
        <div className="text-right text-sm text-slate-600">
          <AgingBadge customer={customer} now={now} />
          <p className="mt-1">
            {t('customer.lastPayment')}: {customer.lastPaymentAt ? f.date(customer.lastPaymentAt) : t('customer.never')}
          </p>
        </div>
      </div>
      {children}
    </div>
  )
}
