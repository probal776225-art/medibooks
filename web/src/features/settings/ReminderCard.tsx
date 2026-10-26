// Settings → তাগাদা (SPEC §9): every rule of the automatic reminder. The Worker reads them at each daily run.
import { useState, type FormEvent } from 'react'
import { Button, Card, Field, TextInput, Toggle } from '../../components/ui'
import { saveSettingsSection } from '../../data/repos/settings'
import { formatMoney, parseMoney } from '../../domain/money'
import type { ReminderRules } from '../../domain/reminders'
import { REMINDER_LAST_HOUR } from '../../domain/reminders'
import { useT } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { useDataStore } from '../../stores/data'
import { useToastStore } from '../../stores/toast'
import { hourLabel } from '../reminders/hourLabel'

const HOURS = Array.from({ length: REMINDER_LAST_HOUR - 7 }, (_, i) => i + 7) // 7 am … 8 pm

function intIn(text: string, min: number, max: number): number | null {
  const n = Number(text.trim())
  return Number.isInteger(n) && n >= min && n <= max ? n : null
}

export function ReminderCard() {
  const t = useT()
  const f = useFormat()
  const rules = useDataStore((s) => s.settings.reminder)
  const [form, setForm] = useState({
    threshold: formatMoney(rules.thresholdPaisa, { symbol: false }).replace(/,/g, ''),
    interval: String(rules.intervalDays),
    max: String(rules.maxPerMonth),
    skip: String(rules.skipIfPaidWithinDays),
    hour: rules.sendHour,
  })
  const [error, setError] = useState(false)
  const set = (k: 'threshold' | 'interval' | 'max' | 'skip') => (e: { target: { value: string } }) =>
    setForm({ ...form, [k]: e.target.value })

  function submit(e: FormEvent) {
    e.preventDefault()
    const threshold = parseMoney(form.threshold)
    const interval = intIn(form.interval, 1, 30)
    const max = intIn(form.max, 1, 31)
    const skip = intIn(form.skip, 0, 30)
    if (threshold === null || threshold < 100 || interval === null || max === null || skip === null) return setError(true)
    setError(false)
    const after: Partial<ReminderRules> = {
      thresholdPaisa: threshold,
      intervalDays: interval,
      maxPerMonth: max,
      skipIfPaidWithinDays: skip,
      sendHour: form.hour,
    }
    saveSettingsSection('reminder', rules, after)
    useToastStore.getState().show('success', 'smsset.saved')
  }

  return (
    <Card>
      <h2 id="reminder" className="scroll-mt-20 font-semibold">
        {t('remset.title')}
      </h2>
      <Toggle label={t('remset.enabled')} checked={rules.enabled} onChange={(v) => saveSettingsSection('reminder', rules, { enabled: v })} />
      <p className="text-sm text-slate-500">
        {rules.lastRunDate ? t('remset.lastRun', { date: f.date(Date.parse(`${rules.lastRunDate}T12:00:00+06:00`)) }) : t('remset.never')}
      </p>
      <form onSubmit={submit} className="mt-3 grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field label={t('remset.threshold')}>
            <TextInput value={form.threshold} onChange={set('threshold')} inputMode="decimal" />
          </Field>
        </div>
        <Field label={`${t('remset.interval')} (${t('remset.days')})`}>
          <TextInput value={form.interval} onChange={set('interval')} inputMode="numeric" />
        </Field>
        <Field label={t('remset.max')}>
          <TextInput value={form.max} onChange={set('max')} inputMode="numeric" />
        </Field>
        <Field label={`${t('remset.skipPaid')} (${t('remset.days')})`}>
          <TextInput value={form.skip} onChange={set('skip')} inputMode="numeric" />
        </Field>
        <Field label={t('remset.hour')}>
          <select
            value={form.hour}
            onChange={(e) => setForm({ ...form, hour: Number(e.target.value) })}
            className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-[17px]"
          >
            {HOURS.map((h) => {
              const l = hourLabel(h)
              return (
                <option key={h} value={h}>
                  {t(l.key, { h: f.num(l.h) })}
                </option>
              )
            })}
          </select>
        </Field>
        {error && <p className="col-span-2 text-sm text-rose-600">{t('remset.invalid')}</p>}
        <Button type="submit" className="col-span-2">
          {t('smsset.save')}
        </Button>
      </form>
    </Card>
  )
}
