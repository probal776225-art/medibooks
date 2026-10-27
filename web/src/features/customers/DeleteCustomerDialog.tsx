// কাস্টমার মুছুন (owner): a customer with no history is deleted after one confirm. With history, everything goes —
// bills, payments, the due and photos — after typing DELETE (the owner's choice, 2026-10-27); hiding (archive)
// stays offered as the safer way.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ROUTES } from '../../app/routes'
import { Button, Field, Modal, TextInput } from '../../components/ui'
import { customerHasHistory, deleteCustomer, setCustomerFlags } from '../../data/repos/customers'
import type { Customer } from '../../domain/types'
import { useT, type MessageKey } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { useOnline } from '../../stores/sync'
import { useToastStore } from '../../stores/toast'

const CONFIRM_WORD = 'DELETE'

export function DeleteCustomerDialog({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const t = useT()
  const f = useFormat()
  const navigate = useNavigate()
  const online = useOnline()
  const showToast = useToastStore((s) => s.show)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<MessageKey | null>(null)
  const [typed, setTyped] = useState('')
  const history = customerHasHistory(customer)
  const busy = progress !== null

  async function remove() {
    setProgress({ done: 0, total: 0 })
    setError(null)
    try {
      await deleteCustomer(customer, (done, total) => setProgress({ done, total }))
      showToast('success', 'delc.deleted')
      navigate(ROUTES.customers, { replace: true })
    } catch (e) {
      console.error('Delete failed', e)
      setError('delc.failed')
      setProgress(null)
    }
  }

  function hide() {
    setCustomerFlags(customer, { archived: true })
    showToast('success', 'delc.hidden')
    navigate(ROUTES.customers, { replace: true })
  }

  return (
    <Modal title={t('delc.title', { name: customer.name })} onClose={() => !busy && onClose()}>
      <div className="space-y-3">
        {history ? (
          <>
            <p className="rounded-lg bg-rose-50 px-3 py-2 font-medium text-rose-800">
              {t('delc.withHistory', { amount: f.money(customer.totalDuePaisa) })}
            </p>
            <p className="text-sm text-slate-600">
              {t('delc.backupFirst')}{' '}
              <Link to={`${ROUTES.settings}#backup`} className="font-medium text-teal-800 underline" onClick={onClose}>
                {t('nav.settings')}
              </Link>
            </p>
            <Field label={t('delc.typeDelete', { word: CONFIRM_WORD })}>
              <TextInput
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoCapitalize="characters"
                autoComplete="off"
                placeholder={CONFIRM_WORD}
                disabled={busy}
              />
            </Field>
          </>
        ) : (
          <p className="text-slate-700">{t('delc.canDelete')}</p>
        )}
        {!online && <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">{t('backup.needOnline')}</p>}
        {busy && history && <p className="text-slate-600">{t('delc.progress', { done: progress.done, total: progress.total })}</p>}
        <Button
          variant="danger"
          className="w-full"
          disabled={busy || !online || (history && typed.trim().toUpperCase() !== CONFIRM_WORD)}
          onClick={() => void remove()}
        >
          {busy ? t('delc.deleting') : t(history ? 'delc.confirmAll' : 'delc.confirm')}
        </Button>
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-rose-700">{t(error)}</p>}
        {history && !customer.archived && (
          <>
            <p className="pt-2 text-sm text-slate-600">{t('delc.orHide')}</p>
            <Button variant="ghost" className="w-full border border-slate-200" disabled={busy} onClick={hide}>
              {t('delc.hide')}
            </Button>
          </>
        )}
        <Button variant="ghost" className="w-full" disabled={busy} onClick={onClose}>
          {t('customer.cancel')}
        </Button>
      </div>
    </Modal>
  )
}
