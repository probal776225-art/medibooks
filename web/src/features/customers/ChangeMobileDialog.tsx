import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { customerPath } from '../../app/routes'
import { Button, Field, Modal, TextInput } from '../../components/ui'
import { changeCustomerMobile } from '../../data/repos/customers'
import { DomainError } from '../../domain/errors'
import type { Customer } from '../../domain/types'
import { useT, type MessageKey } from '../../i18n'
import { errorKey, useFormat } from '../../i18n/format'
import { useDataStore } from '../../stores/data'
import { useToastStore } from '../../stores/toast'

/** মোবাইল নম্বর বদল (SPEC §3): online only; moves every transaction and the due, archives the old number. */
export function ChangeMobileDialog({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const t = useT()
  const f = useFormat()
  const navigate = useNavigate()
  const showToast = useToastStore((s) => s.show)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<MessageKey | null>(null)

  async function run() {
    setError(null)
    if (!navigator.onLine) {
      setError('mob.offline')
      return
    }
    setBusy({ done: 0, total: 0 })
    try {
      const mobile = await changeCustomerMobile(
        customer,
        value,
        (m) => useDataStore.getState().byMobile.has(m),
        (done, total) => setBusy({ done, total }),
      )
      showToast('success', 'mob.done')
      onClose()
      navigate(customerPath(mobile), { replace: true })
    } catch (e) {
      setError(e instanceof DomainError ? errorKey(e) : 'mob.offline')
      setBusy(null)
    }
  }

  return (
    <Modal title={t('mob.title')} onClose={() => !busy && onClose()}>
      <p className="text-[15px] text-slate-600">{t('mob.body')}</p>
      <p className="mt-2 text-sm">
        {customer.name} · <span className="font-mono">{f.mobile(customer.mobile)}</span>
      </p>
      <div className="mt-3">
        <Field label={t('mob.title')} error={error ? t(error) : null}>
          <TextInput type="tel" inputMode="tel" autoFocus placeholder="01XXXXXXXXX" value={value} onChange={(e) => setValue(e.target.value)} disabled={busy !== null} />
        </Field>
      </div>
      {busy && <p className="mt-2 text-slate-600">{t('mob.working', { done: busy.done, total: busy.total })}</p>}
      <div className="mt-4 flex gap-2">
        <Button variant="danger" disabled={busy !== null || !value.trim()} onClick={() => void run()}>
          {t('mob.confirm')}
        </Button>
        <Button variant="ghost" disabled={busy !== null} onClick={onClose}>
          {t('customer.cancel')}
        </Button>
      </div>
    </Modal>
  )
}
