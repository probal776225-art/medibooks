// তাগাদা (SPEC §9): today's list from the customers already in memory (the same rule the Worker's daily run uses),
// send one or all, or call. Customers with a big due who are skipped today are listed with the reason.
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { customerPath, ROUTES } from '../../app/routes'
import { Button, buttonClass, Card } from '../../components/ui'
import { smsServerConfigured } from '../../data/repos/sms'
import { reminderBlock, type ReminderBlock } from '../../domain/reminders'
import type { Customer } from '../../domain/types'
import { useT, type MessageKey } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { useDataStore } from '../../stores/data'
import { AgingBadge, DueText } from '../customers/parts'
import { hourLabel } from './hourLabel'
import { RemindDialog } from './RemindDialog'

const SHOWN_BLOCKS: readonly ReminderBlock[] = ['tooSoon', 'recentlyPaid', 'monthlyLimit', 'smsOff', 'reminderOff']

function Row({ c, now, children }: { c: Customer; now: number; children?: ReactNode }) {
  const t = useT()
  const f = useFormat()
  return (
    <li className="py-3">
      <div className="flex items-start gap-3">
        <Link to={customerPath(c.mobile)} className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{c.name}</span>
          <span className="block text-sm text-slate-500">
            {f.mobile(c.mobile)} · {c.lastReminderAt ? t('rem.lastSent', { date: f.date(c.lastReminderAt) }) : t('rem.neverSent')}
          </span>
        </Link>
        <div className="text-right">
          <DueText paisa={c.totalDuePaisa} />
          <AgingBadge customer={c} now={now} />
        </div>
      </div>
      {children}
    </li>
  )
}

export function RemindersPage() {
  const t = useT()
  const f = useFormat()
  const customers = useDataStore((s) => s.customers)
  const settings = useDataStore((s) => s.settings)
  const rules = settings.reminder
  const [sending, setSending] = useState<Customer[] | null>(null)
  const [now] = useState(() => Date.now())

  const { due, skipped } = useMemo(() => {
    const due: Customer[] = []
    const skipped: { c: Customer; why: ReminderBlock }[] = []
    for (const c of customers) {
      const why = reminderBlock(c, rules, now)
      if (why === null) due.push(c)
      else if (SHOWN_BLOCKS.includes(why) && c.totalDuePaisa >= rules.thresholdPaisa && !c.archived) skipped.push({ c, why })
    }
    due.sort((a, b) => b.totalDuePaisa - a.totalDuePaisa)
    skipped.sort((a, b) => b.c.totalDuePaisa - a.c.totalDuePaisa)
    return { due, skipped }
  }, [customers, rules, now])

  const hour = hourLabel(rules.sendHour)
  const canSend = settings.sms.enabled && smsServerConfigured

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">{t('nav.reminders')}</h1>

      <Card>
        <p className="text-[16px]">
          {t('rem.rules', {
            amount: f.money(rules.thresholdPaisa),
            days: f.num(rules.intervalDays),
            hour: t(hour.key, { h: f.num(hour.h) }),
          })}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {rules.lastRunDate ? t('remset.lastRun', { date: f.date(Date.parse(`${rules.lastRunDate}T12:00:00+06:00`)) }) : t('remset.never')}
        </p>
        {!smsServerConfigured && <p className="mt-2 text-amber-800">{t('sms.noServer')}</p>}
        {!settings.sms.enabled && <p className="mt-2 text-rose-700">{t('rem.smsOff')}</p>}
        {settings.sms.enabled && !rules.enabled && <p className="mt-2 text-amber-800">{t('rem.autoOff')}</p>}
        {settings.sms.testMode && <p className="mt-2 text-amber-800">{t('rem.testMode')}</p>}
        <Link to={`${ROUTES.settings}#reminder`} className={buttonClass('ghost', 'mt-2 min-h-10 border border-slate-200 text-sm')}>
          {t('rem.settings')}
        </Link>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="flex-1 font-semibold">{t('rem.today', { count: f.num(due.length) })}</h2>
          {due.length > 1 && canSend && (
            <Button onClick={() => setSending(due)}>{t('rem.sendAll', { count: f.num(due.length) })}</Button>
          )}
        </div>
        {due.length === 0 ? (
          <p className="mt-3 text-slate-500">{t('rem.none')}</p>
        ) : (
          <ul className="mt-1 divide-y divide-slate-100">
            {due.map((c) => (
              <Row key={c.mobile} c={c} now={now}>
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" className="min-h-11 flex-1 text-sm" disabled={!canSend} onClick={() => setSending([c])}>
                    {t('rem.send')}
                  </Button>
                  <a href={`tel:${c.mobile}`} className={buttonClass('ghost', 'min-h-11 flex-1 border border-slate-200 text-sm')}>
                    {t('rem.call')}
                  </a>
                </div>
              </Row>
            ))}
          </ul>
        )}
      </Card>

      {skipped.length > 0 && (
        <Card>
          <details>
            <summary className="min-h-11 cursor-pointer py-2 font-semibold">{t('rem.skipped', { count: f.num(skipped.length) })}</summary>
            <ul className="divide-y divide-slate-100">
              {skipped.map(({ c, why }) => (
                <Row key={c.mobile} c={c} now={now}>
                  <p className="mt-1 text-sm text-slate-600">{t(`remBlock.${why}` as MessageKey)}</p>
                </Row>
              ))}
            </ul>
          </details>
        </Card>
      )}

      {sending && <RemindDialog customers={sending} onClose={() => setSending(null)} />}
    </section>
  )
}
