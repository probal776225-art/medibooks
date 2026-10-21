// Small customer display pieces shared by list, lookup and detail.
import { customerAging } from '../../domain/customers'
import type { Customer, Paisa } from '../../domain/types'
import { useT } from '../../i18n'
import { useFormat } from '../../i18n/format'

export function DueText({ paisa, size = 'md' }: { paisa: Paisa; size?: 'md' | 'xl' }) {
  const t = useT()
  const f = useFormat()
  const big = size === 'xl' ? 'text-3xl' : 'text-lg'
  if (paisa > 0) return <span className={`${big} font-bold text-rose-700 tabular-nums`}>{f.money(paisa)}</span>
  if (paisa < 0)
    return (
      <span className={`${big} font-bold text-sky-700 tabular-nums`}>
        {t('customer.advance')} {f.money(-paisa)}
      </span>
    )
  return <span className={`${size === 'xl' ? 'text-2xl' : 'text-base'} font-semibold text-emerald-700`}>{t('customer.noDue')}</span>
}

const AGING_STYLE = {
  green: 'bg-emerald-100 text-emerald-800',
  yellow: 'bg-amber-100 text-amber-800',
  red: 'bg-rose-100 text-rose-800',
} as const

export function AgingBadge({ customer, now }: { customer: Customer; now: number }) {
  const t = useT()
  const { days, level } = customerAging(customer, now)
  if (level === 'none' || days === null) return null
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${AGING_STYLE[level]}`}>
      {t('customer.days', { days })}
    </span>
  )
}
