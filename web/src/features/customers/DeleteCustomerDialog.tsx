// কাস্টমার মুছুন: a customer added by mistake (no transaction, no due) is deleted for good; anyone with history
// is hidden (archived) instead, because transactions are never deleted — the history and totals stay correct.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../../app/routes'
import { Button, Modal } from '../../components/ui'
import { canDeleteCustomer, deleteCustomer, setCustomerFlags } from '../../data/repos/customers'
import { DomainError } from '../../domain/errors'
import type { Customer } from '../../domain/types'
import { useT, type MessageKey } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { useOnline } from '../../stores/sync'
import { useToastStore } from '../../stores/toast'

export function DeleteCustomerDialog({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const t = useT()
  const f = useFormat()
  const navigate = useNavigate()
  const online = useOnline()
  const showToast = useToastStore((s) => s.show)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<MessageKey | null>(null)
  const deletable = canDeleteCustomer(customer)

  async function remove() {
    setBusy(true)
    setError(null)
    try {
      await deleteCustomer(customer)
      showToast('success', 'delc.deleted')
      navigate(ROUTES.customers, { replace: true })
    } catch (e) {
      setError(e instanceof DomainError ? `error.${e.code}` : 'delc.failed')
      setBusy(false)
    }
  }

  function hide() {
    setCustomerFlags(customer, { archived: true })
    showToast('success', 'delc.hidden')
    navigate(ROUTES.customers, { replace: true })
  }

  return (
    <Modal title={t('delc.title', { name: customer.name })} onClose={onClose}>
      <div className="space-y-3">
        {deletable ? (
          <>
            <p className="text-slate-700">{t('delc.canDelete')}</p>
            {!online && <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">{t('backup.needOnline')}</p>}
            <Button variant="danger" className="w-full" disabled={busy || !online} onClick={() => void remove()}>
              {busy ? t('delc.deleting') : t('delc.confirm')}
            </Button>
          </>
        ) : (
          <>
            <p className="text-slate-700">{t('delc.hasHistory')}</p>
            {customer.totalDuePaisa > 0 && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">
                {t('delc.dueWarn', { amount: f.money(customer.totalDuePaisa) })}
              </p>
            )}
            {customer.archived ? (
              <p className="text-slate-500">{t('delc.alreadyHidden')}</p>
            ) : (
              <Button variant="danger" className="w-full" onClick={hide}>
                {t('delc.hide')}
              </Button>
            )}
          </>
        )}
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-rose-700">{t(error)}</p>}
        <Button variant="ghost" className="w-full" onClick={onClose}>
          {t('customer.cancel')}
        </Button>
      </div>
    </Modal>
  )
}
