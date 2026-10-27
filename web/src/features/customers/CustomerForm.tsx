import { useState, type FormEvent } from 'react'
import { Button, Field, TextInput } from '../../components/ui'
import { changeCustomerMobile, createCustomer, updateCustomerProfile } from '../../data/repos/customers'
import { DomainError } from '../../domain/errors'
import { formatMobile, normalizeMobile } from '../../domain/phone'
import type { Customer } from '../../domain/types'
import { useT, type MessageKey } from '../../i18n'
import { errorKey } from '../../i18n/format'
import { useDataStore } from '../../stores/data'

type Props =
  | { mode: 'create'; mobile: string; onSaved: (mobile: string) => void; onCancel?: () => void }
  | { mode: 'edit'; customer: Customer; onSaved: (mobile: string) => void; onCancel?: () => void }

/**
 * Name (required), address, note — and in edit mode the mobile number. Profile edits save offline-first and never
 * touch the due; a new mobile number runs the change-mobile move (online, every transaction and the due go along).
 */
export function CustomerForm(props: Props) {
  const t = useT()
  const initial = props.mode === 'edit' ? props.customer : null
  const [name, setName] = useState(initial?.name ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [mobile, setMobile] = useState(initial ? formatMobile(initial.mobile) : '')
  const [error, setError] = useState<MessageKey | null>(null)
  const [moving, setMoving] = useState<{ done: number; total: number } | null>(null)
  const mobileChanged = initial !== null && normalizeMobile(mobile) !== initial.mobile

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      if (props.mode === 'create') {
        props.onSaved(createCustomer({ mobile: props.mobile, name, address, note }))
        return
      }
      if (!mobileChanged) {
        updateCustomerProfile(props.customer, { name, address, note })
        props.onSaved(props.customer.mobile)
        return
      }
      if (!name.trim()) throw new DomainError('NAME_REQUIRED')
      if (!navigator.onLine) {
        setError('mob.offline')
        return
      }
      setMoving({ done: 0, total: 0 })
      const moved = await changeCustomerMobile(
        { ...props.customer, name: name.trim(), address: address.trim(), note: note.trim() },
        mobile,
        (m) => useDataStore.getState().byMobile.has(m),
        (done, total) => setMoving({ done, total }),
      )
      props.onSaved(moved)
    } catch (err) {
      setMoving(null)
      setError(err instanceof DomainError ? errorKey(err) : 'mob.offline')
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-3">
      <Field label={t('customer.name')} error={error ? t(error) : null}>
        <TextInput value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={100} autoComplete="off" />
      </Field>
      {props.mode === 'edit' && (
        <Field label={t('customer.mobile')} hint={mobileChanged ? t('mob.body') : undefined}>
          <TextInput
            type="tel"
            inputMode="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            maxLength={20}
            autoComplete="off"
            disabled={moving !== null}
          />
        </Field>
      )}
      <Field label={`${t('customer.address')} ${t('customer.optional')}`}>
        <TextInput value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} autoComplete="off" />
      </Field>
      <Field label={`${t('customer.note')} ${t('customer.optional')}`}>
        <TextInput value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} autoComplete="off" />
      </Field>
      {moving && <p className="text-slate-600">{t('mob.working', { done: moving.done, total: moving.total })}</p>}
      <div className="flex gap-2 pt-1">
        <Button type="submit" className="flex-1" disabled={moving !== null}>
          {mobileChanged ? t('mob.confirm') : t('customer.save')}
        </Button>
        {props.onCancel && (
          <Button variant="ghost" onClick={props.onCancel} disabled={moving !== null}>
            {t('customer.cancel')}
          </Button>
        )}
      </div>
    </form>
  )
}
