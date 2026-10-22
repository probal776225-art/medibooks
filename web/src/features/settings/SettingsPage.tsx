import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ROUTES } from '../../app/routes'
import { useCatalogStore } from '../../catalog/store'
import { Icon } from '../../components/Icon'
import { Button, Card, Field, Modal, TextInput, Toggle } from '../../components/ui'
import { saveSettingsSection } from '../../data/repos/settings'
import { hasPriceOverride } from '../../domain/medicines'
import type { ShopSettings } from '../../domain/settings'
import type { DigitStyle, Language } from '../../domain/types'
import { useT, type MessageKey } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { signOut, useAuthStore } from '../../stores/auth'
import { useDataStore } from '../../stores/data'
import { useUiStore } from '../../stores/ui'
import { BackupCard } from './BackupCard'
import { BalanceCheckCard } from './BalanceCheckCard'
import { SecurityCard } from './SecurityCard'

type Shop = ShopSettings['shop']

function ShopInfoDialog({ shop, onClose }: { shop: Shop; onClose: () => void }) {
  const t = useT()
  const [form, setForm] = useState<Shop>(shop)
  const [error, setError] = useState<MessageKey | null>(null)
  const set = (k: keyof Shop) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value })

  function submit(e: FormEvent) {
    e.preventDefault()
    const next: Shop = {
      name: form.name.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      smsShortName: form.smsShortName.trim(),
    }
    if (!next.name || !next.smsShortName) {
      setError('shop.required')
      return
    }
    saveSettingsSection('shop', shop, next)
    onClose()
  }

  return (
    <Modal title={t('settings.shop')} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label={t('shop.name')}>
          <TextInput value={form.name} onChange={set('name')} maxLength={100} />
        </Field>
        <Field label={t('shop.address')}>
          <TextInput value={form.address} onChange={set('address')} maxLength={200} />
        </Field>
        <Field label={t('shop.phone')}>
          <TextInput value={form.phone} onChange={set('phone')} inputMode="tel" maxLength={30} />
        </Field>
        <Field label={t('shop.smsName')} hint={t('shop.smsNameHint')} error={error ? t(error) : null}>
          <TextInput value={form.smsShortName} onChange={set('smsShortName')} maxLength={40} />
        </Field>
        <Button type="submit" className="w-full">
          {t('shop.save')}
        </Button>
      </form>
    </Modal>
  )
}

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { id: T; text: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="mt-3">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <div className="mt-1 flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            onClick={() => onChange(o.id)}
            className={`min-h-11 rounded-full border px-4 font-medium ${
              value === o.id ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-700'
            }`}
          >
            {o.text}
          </button>
        ))}
      </div>
    </div>
  )
}

function MedicinesCard() {
  const t = useT()
  const f = useFormat()
  const medicines = useCatalogStore((s) => s.medicines)
  const counts = useMemo(
    () => ({
      override: medicines.filter(hasPriceOverride).length,
      manual: medicines.filter((m) => m.sourceName === 'manual').length,
    }),
    [medicines],
  )
  const links: { show: 'override' | 'manual'; label: MessageKey; count: number }[] = [
    { show: 'override', label: 'settings.medOverrides', count: counts.override },
    { show: 'manual', label: 'settings.medOwn', count: counts.manual },
  ]
  return (
    <Card>
      <h2 className="font-semibold">{t('nav.medicines')}</h2>
      <ul className="mt-2 divide-y divide-slate-100">
        {links.map((l) => (
          <li key={l.show}>
            <Link to={`${ROUTES.medicines}?show=${l.show}`} className="flex min-h-12 items-center gap-3 hover:bg-slate-50">
              <span className="flex-1">{t(l.label)}</span>
              <span className="text-slate-500">{f.num(l.count)}</span>
              <Icon name="chevron" className="size-5 text-slate-400" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function SettingsPage() {
  const t = useT()
  const email = useAuthStore((s) => s.user?.email)
  const settings = useDataStore((s) => s.settings)
  const status = useDataStore((s) => s.settingsStatus)
  const { language, digits, setLanguage, setDigits } = useUiStore()
  const [editingShop, setEditingShop] = useState(false)
  const { hash } = useLocation()

  // Home's backup reminder links to #backup.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
  }, [hash])

  return (
    <section className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">{t('nav.settings')}</h1>

      <Card>
        <div className="flex items-start gap-3">
          <h2 className="flex-1 font-semibold">{t('settings.shop')}</h2>
          <Button variant="ghost" className="min-h-10 border border-slate-200 text-sm" onClick={() => setEditingShop(true)}>
            {t('customer.edit')}
          </Button>
        </div>
        {status === 'loading' && <p className="mt-1 text-sm text-slate-500">{t('settings.syncing')}</p>}
        <dl className="mt-2 space-y-1 text-[16px]">
          <dd className="font-semibold">{settings.shop.name}</dd>
          <dd>{settings.shop.address}</dd>
          <dd>{settings.shop.phone}</dd>
          <dd className="text-slate-500">SMS: {settings.shop.smsShortName}</dd>
        </dl>
      </Card>

      <Card>
        <h2 className="font-semibold">{t('settings.billing')}</h2>
        <Toggle
          label={t('settings.roundToTaka')}
          checked={settings.billing.roundToTaka}
          onChange={(v) => saveSettingsSection('billing', settings.billing, { ...settings.billing, roundToTaka: v })}
        />
        <p className="text-sm text-slate-500">{t('settings.roundHint')}</p>
      </Card>

      <Card>
        <h2 className="font-semibold">{t('settings.display')}</h2>
        <Choice<Language>
          label={t('settings.language')}
          value={language}
          options={[
            { id: 'bn', text: 'বাংলা' },
            { id: 'en', text: 'English' },
          ]}
          onChange={setLanguage}
        />
        <Choice<DigitStyle>
          label={t('settings.digits')}
          value={digits}
          options={[
            { id: 'bn', text: 'বাংলা ১২৩' },
            { id: 'en', text: 'English 123' },
          ]}
          onChange={setDigits}
        />
        <p className="mt-2 text-sm text-slate-500">{t('settings.thisDevice')}</p>
      </Card>

      <SecurityCard />
      <BackupCard />
      <MedicinesCard />
      <BalanceCheckCard />

      <Card>
        <h2 className="font-semibold">{t('settings.account')}</h2>
        <p className="mt-1 text-slate-600">
          {t('settings.signedInAs')}: <span className="font-medium">{email}</span>
        </p>
        <Button variant="danger" className="mt-3" onClick={() => void signOut()}>
          {t('settings.logout')}
        </Button>
      </Card>

      <p className="text-sm text-slate-500">{t('settings.more')}</p>
      {editingShop && <ShopInfoDialog shop={settings.shop} onClose={() => setEditingShop(false)} />}
    </section>
  )
}
