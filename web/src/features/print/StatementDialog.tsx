import { useState } from 'react'
import { Button, Modal } from '../../components/ui'
import { fetchCustomerSince } from '../../data/repos/transactions'
import { dhakaMonthRange, inDhaka } from '../../domain/dates'
import type { DateRange } from '../../domain/reports'
import { buildStatement, type Statement } from '../../domain/statement'
import type { Customer, Transaction } from '../../domain/types'
import { useT, type MessageKey } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { PngPreviewDialog } from './PngPreviewDialog'
import { StatementImage } from './PrintTemplates'

type Period = 'thisMonth' | 'lastMonth' | 'all'
const PERIODS: { id: Period; label: MessageKey }[] = [
  { id: 'thisMonth', label: 'stmt.thisMonth' },
  { id: 'lastMonth', label: 'stmt.lastMonth' },
  { id: 'all', label: 'stmt.all' },
]

function periodRange(p: Period, now: number): DateRange {
  if (p === 'thisMonth') return dhakaMonthRange(now)
  if (p === 'lastMonth') return dhakaMonthRange(dhakaMonthRange(now).start - 1)
  return { start: 0, end: now + 86_400_000 }
}

/** স্টেটমেন্ট: pick a period → the customer's transactions → statement image to share or save. */
export function StatementDialog({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const t = useT()
  const f = useFormat()
  const [period, setPeriod] = useState<Period>('thisMonth')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState<{ statement: Statement<Transaction>; periodText: string; fileName: string } | null>(null)

  async function make() {
    setLoading(true)
    const now = Date.now()
    const range = periodRange(period, now)
    const txns = await fetchCustomerSince(customer.mobile, range.start).catch(() => [])
    const periodText = period === 'all' ? t('stmt.all') : `${f.date(range.start)} – ${f.date(range.end - 1)}`
    const tag = period === 'all' ? 'all' : inDhaka(range.start).format('YYYY-MM')
    setReady({
      statement: buildStatement(customer.totalDuePaisa, txns, range),
      periodText,
      fileName: `statement-${customer.mobile}-${tag}.png`,
    })
    setLoading(false)
  }

  if (ready) {
    return (
      <PngPreviewDialog
        title={`${t('stmt.title')} · ${customer.name}`}
        fileName={ready.fileName}
        image={<StatementImage customer={customer} periodText={ready.periodText} statement={ready.statement} />}
        onClose={onClose}
      />
    )
  }

  return (
    <Modal title={`${t('stmt.title')} · ${customer.name}`} onClose={onClose}>
      <div className="flex flex-wrap gap-2" role="radiogroup">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={period === p.id}
            onClick={() => setPeriod(p.id)}
            className={`min-h-11 rounded-full border px-4 font-medium ${
              period === p.id ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-700'
            }`}
          >
            {t(p.label)}
          </button>
        ))}
      </div>
      <p className="mt-2 text-sm text-slate-500">
        {period === 'all'
          ? t('stmt.all')
          : (() => {
              const r = periodRange(period, Date.now())
              return `${f.date(r.start)} – ${f.date(r.end - 1)}`
            })()}
      </p>
      <Button className="mt-4 w-full text-lg" disabled={loading} onClick={() => void make()}>
        {loading ? t('stmt.loading') : t('stmt.make')}
      </Button>
    </Modal>
  )
}
