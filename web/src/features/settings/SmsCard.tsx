// Settings → SMS (SPEC §8): on/off, test mode, price per part, digits, the five texts, a test SMS and the balance.
import { useMemo, useState, type FormEvent } from 'react'
import { Button, Card, Field, Modal, TextInput, Toggle } from '../../components/ui'
import { fetchSmsBalance, sendTestSms, smsServerConfigured } from '../../data/repos/sms'
import { saveSettingsSection } from '../../data/repos/settings'
import { writeContext } from '../../data/writer'
import { formatMoney, parseMoney } from '../../domain/money'
import { normalizeMobile } from '../../domain/phone'
import type { ShopSettings } from '../../domain/settings'
import {
  DEFAULT_SMS_TEMPLATES,
  renderSms,
  SMS_KINDS,
  SMS_MAX_TEXT,
  SMS_VARIABLES,
  smsPlan,
  smsSegments,
  type SmsKind,
} from '../../domain/sms'
import type { DigitStyle } from '../../domain/types'
import { useT, type MessageKey } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { useDataStore } from '../../stores/data'
import { useOnline } from '../../stores/sync'

type SmsSettings = ShopSettings['sms']

/** Sample values for the preview (a payment of ৳500, ৳1,200 still due). */
function sampleText(kind: SmsKind, template: string, settings: ShopSettings): string {
  const s = { ...settings, sms: { ...settings.sms, templates: { ...settings.sms.templates, [kind]: template } } }
  return renderSms(kind, { name: 'রহিম', amountPaisa: 50_000, totalPaisa: kind === 'paymentClear' ? 0 : 120_000, method: 'bkash', at: Date.now() }, s)
}

function TemplateDialog({ kind, onClose }: { kind: SmsKind; onClose: () => void }) {
  const t = useT()
  const f = useFormat()
  const settings = useDataStore((s) => s.settings)
  const [text, setText] = useState(settings.sms.templates[kind])
  const [error, setError] = useState<MessageKey | null>(null)
  const preview = sampleText(kind, text, settings)
  const seg = smsSegments(preview)

  function insert(v: string) {
    const el = document.getElementById('tpl-text') as HTMLTextAreaElement | null
    const at = el?.selectionStart ?? text.length
    setText(text.slice(0, at) + `{${v}}` + text.slice(el?.selectionEnd ?? at))
  }

  function save() {
    if (!text.trim()) return setError('tpl.empty')
    if (preview.length > SMS_MAX_TEXT) return setError('tpl.tooLong')
    saveSettingsSection('sms', settings.sms, { templates: { ...settings.sms.templates, [kind]: text.trim() } })
    onClose()
  }

  return (
    <Modal title={`${t(`smsKind.${kind}`)} SMS`} onClose={onClose}>
      <textarea
        id="tpl-text"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setError(null)
        }}
        rows={4}
        className="w-full rounded-xl border border-slate-300 p-3 text-[17px] outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
      />
      <p className="mt-2 text-sm text-slate-600">{t('tpl.insert')}</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {SMS_VARIABLES.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => insert(v)}
            className="min-h-10 rounded-full border border-teal-700 px-3 text-sm text-teal-800 hover:bg-teal-50"
          >
            {t(`var.${v}`)}
          </button>
        ))}
      </div>
      <div className="mt-3 rounded-xl bg-slate-50 p-3">
        <p className="text-xs font-medium text-slate-500">{t('tpl.preview')}</p>
        <p className="mt-1 whitespace-pre-wrap">{preview}</p>
        <p className="mt-2 text-sm text-slate-600">
          {t('tpl.count', { chars: f.num(preview.length), parts: f.num(seg.segments) })}
          {settings.sms.ratePaisa > 0 && ` · ${t('tpl.costEach', { amount: f.money(seg.segments * settings.sms.ratePaisa) })}`}
        </p>
      </div>
      {error && <p className="mt-2 text-sm text-rose-600">{t(error, { max: f.num(SMS_MAX_TEXT) })}</p>}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button onClick={save}>{t('smsset.save')}</Button>
        <Button variant="ghost" className="border border-slate-200" onClick={() => setText(DEFAULT_SMS_TEMPLATES[kind])}>
          {t('tpl.reset')}
        </Button>
      </div>
    </Modal>
  )
}

function TestSmsDialog({ onClose }: { onClose: () => void }) {
  const t = useT()
  const settings = useDataStore((s) => s.settings)
  const online = useOnline()
  const [to, setTo] = useState(settings.shop.phone)
  const [text, setText] = useState(t('smstest.default', { shop: settings.shop.smsShortName }))
  const [state, setState] = useState<'idle' | 'sending' | MessageKey>('idle')

  async function submit(e: FormEvent) {
    e.preventDefault()
    const mobile = normalizeMobile(to)
    if (!mobile) return setState('error.INVALID_MOBILE')
    if (!online) return setState('smstest.needOnline')
    setState('sending')
    try {
      const status = await sendTestSms(smsPlan('test', mobile, text.trim()), writeContext())
      setState(
        status === 'sent'
          ? 'smstest.sent'
          : status === 'failed'
            ? 'smstest.failed'
            : status === 'pending'
              ? 'smstest.retrying'
              : 'smstest.later',
      )
    } catch (err) {
      console.error(err)
      setState('smstest.failed')
    }
  }

  return (
    <Modal title={t('smsset.test')} onClose={onClose}>
      <form onSubmit={(e) => void submit(e)} className="space-y-3">
        <Field label={t('smstest.to')}>
          <TextInput value={to} onChange={(e) => setTo(e.target.value)} inputMode="tel" maxLength={20} />
        </Field>
        <Field label={t('smstest.text')}>
          <TextInput value={text} onChange={(e) => setText(e.target.value)} maxLength={SMS_MAX_TEXT} />
        </Field>
        {state !== 'idle' && state !== 'sending' && (
          <p className={state === 'smstest.sent' ? 'font-medium text-emerald-700' : 'text-rose-700'}>{t(state)}</p>
        )}
        <Button type="submit" className="w-full" disabled={state === 'sending' || !text.trim()}>
          {state === 'sending' ? t('smstest.sending') : t('smstest.send')}
        </Button>
      </form>
    </Modal>
  )
}

export function SmsCard() {
  const t = useT()
  const f = useFormat()
  const sms = useDataStore((s) => s.settings.sms)
  const settings = useDataStore((s) => s.settings)
  const [editing, setEditing] = useState<SmsKind | null>(null)
  const [testing, setTesting] = useState(false)
  const [rateText, setRateText] = useState(sms.ratePaisa ? formatMoney(sms.ratePaisa, { symbol: false }) : '')
  const [rateError, setRateError] = useState(false)
  const [balance, setBalance] = useState<string | null>(null)
  const previews = useMemo(
    () => Object.fromEntries(SMS_KINDS.map((k) => [k, sampleText(k, settings.sms.templates[k], settings)])) as Record<SmsKind, string>,
    [settings],
  )

  const save = (after: Partial<SmsSettings>) => saveSettingsSection('sms', sms, after)

  function saveRate() {
    const paisa = rateText.trim() ? parseMoney(rateText) : 0
    if (paisa === null || paisa < 0 || paisa > 10_000) return setRateError(true)
    setRateError(false)
    save({ ratePaisa: paisa })
  }

  async function checkBalance() {
    setBalance('…')
    try {
      const taka = await fetchSmsBalance()
      setBalance(t('smsset.balanceIs', { amount: f.num(Math.round(taka * 100) / 100) }))
    } catch (e) {
      console.error(e)
      setBalance(t('smsset.balanceFailed'))
    }
  }

  return (
    <Card>
      <h2 id="sms" className="scroll-mt-20 font-semibold">
        {t('smsset.title')}
      </h2>
      <Toggle label={t('smsset.enabled')} checked={sms.enabled} onChange={(v) => save({ enabled: v })} />
      <Toggle label={t('smsset.testMode')} checked={sms.testMode} onChange={(v) => save({ testMode: v })} />
      <p className="text-sm text-slate-500">{t('smsset.testModeHint')}</p>

      <p className="mt-3 text-[16px]">
        {t('smsset.server')}:{' '}
        <span className={smsServerConfigured ? 'font-medium text-emerald-700' : 'font-medium text-amber-700'}>
          {t(smsServerConfigured ? 'smsset.serverOk' : 'smsset.serverMissing')}
        </span>
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button variant="outline" className="min-h-11 text-sm" onClick={() => setTesting(true)} disabled={!smsServerConfigured}>
          {t('smsset.test')}
        </Button>
        <Button variant="ghost" className="min-h-11 border border-slate-200 text-sm" onClick={() => void checkBalance()} disabled={!smsServerConfigured}>
          {t('smsset.balance')}
        </Button>
        {balance && <span className="text-sm text-slate-700">{balance}</span>}
      </div>

      <div className="mt-4">
        <Field label={t('smsset.rate')} hint={t('smsset.rateHint')} error={rateError ? t('smsset.badRate') : null}>
          <div className="flex gap-2">
            <TextInput value={rateText} onChange={(e) => setRateText(e.target.value)} inputMode="decimal" placeholder="0.35" />
            <Button variant="outline" onClick={saveRate}>
              {t('smsset.save')}
            </Button>
          </div>
        </Field>
      </div>

      <p className="mt-4 text-sm font-medium text-slate-700">{t('smsset.digits')}</p>
      <div className="mt-1 flex gap-2" role="radiogroup" aria-label={t('smsset.digits')}>
        {(['bn', 'en'] as DigitStyle[]).map((d) => (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={sms.digits === d}
            onClick={() => save({ digits: d })}
            className={`min-h-11 rounded-full border px-4 font-medium ${
              sms.digits === d ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-700'
            }`}
          >
            {d === 'bn' ? 'বাংলা ১২৩' : 'English 123'}
          </button>
        ))}
      </div>

      <h3 className="mt-4 text-sm font-medium text-slate-700">{t('smsset.templates')}</h3>
      <ul className="mt-1 divide-y divide-slate-100">
        {SMS_KINDS.map((k) => (
          <li key={k} className="flex items-start gap-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{t(`smsKind.${k}`)}</p>
              <p className="text-sm text-slate-600">{previews[k]}</p>
            </div>
            <Button variant="ghost" className="min-h-10 border border-slate-200 text-sm" onClick={() => setEditing(k)}>
              {t('customer.edit')}
            </Button>
          </li>
        ))}
      </ul>

      {editing && <TemplateDialog kind={editing} onClose={() => setEditing(null)} />}
      {testing && <TestSmsDialog onClose={() => setTesting(false)} />}
    </Card>
  )
}
