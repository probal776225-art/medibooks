import { useState, type FormEvent } from 'react'
import { Button, Field, TextInput } from '../../components/ui'
import { createCustomer, updateCustomerProfile } from '../../data/repos/customers'
import type { Customer } from '../../domain/types'
import { useT, type MessageKey } from '../../i18n'
import { errorKey } from '../../i18n/format'

type Props =
  | { mode: 'create'; mobile: string; onSaved: (mobile: string) => void; onCancel?: () => void }
  | { mode: 'edit'; customer: Customer; onSaved: (mobile: string) => void; onCancel?: () => void }

/** Name (required), address, note. Saves offline-first; never touches the due. */
export function CustomerForm(props: Props) {
  const t = useT()
  const initial = props.mode === 'edit' ? props.customer : null
  const [name, setName] = useState(initial?.name ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [error, setError] = useState<MessageKey | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    try {
      if (props.mode === 'create') {
        props.onSaved(createCustomer({ mobile: props.mobile, name, address, note }))
      } else {
        updateCustomerProfile(props.customer, { name, address, note })
        props.onSaved(props.customer.mobile)
      }
    } catch (err) {
      setError(errorKey(err))
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label={t('customer.name')} error={error ? t(error) : null}>
        <TextInput value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={100} autoComplete="off" />
      </Field>
      <Field label={`${t('customer.address')} ${t('customer.optional')}`}>
        <TextInput value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} autoComplete="off" />
      </Field>
      <Field label={`${t('customer.note')} ${t('customer.optional')}`}>
        <TextInput value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} autoComplete="off" />
      </Field>
      <div className="flex gap-2 pt-1">
        <Button type="submit" className="flex-1">
          {t('customer.save')}
        </Button>
        {props.onCancel && (
          <Button variant="ghost" onClick={props.onCancel}>
            {t('customer.cancel')}
          </Button>
        )}
      </div>
    </form>
  )
}
