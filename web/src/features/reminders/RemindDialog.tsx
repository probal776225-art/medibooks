// Confirm before reminders go out: how many customers, SMS parts and the cost; one customer also sees the text.
import { useMemo } from 'react'
import { Button, Modal } from '../../components/ui'
import { sendReminders } from '../../data/repos/reminders'
import { planReminderSms } from '../../domain/sms'
import type { Customer } from '../../domain/types'
import { useT } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { useDataStore } from '../../stores/data'
import { useToastStore } from '../../stores/toast'

export function RemindDialog({ customers, onClose }: { customers: Customer[]; onClose: () => void }) {
  const t = useT()
  const f = useFormat()
  const settings = useDataStore((s) => s.settings)
  const plans = useMemo(() => customers.map((c) => planReminderSms(c, settings, Date.now())), [customers, settings])
  const parts = plans.reduce((n, p) => n + p.segments, 0)

  function send() {
    sendReminders(customers, settings)
    useToastStore.getState().show('success', 'rem.queued')
    onClose()
  }

  return (
    <Modal title={t('rem.confirmTitle')} onClose={onClose}>
      <p className="text-lg">{t('rem.confirmBody', { count: f.num(customers.length), parts: f.num(parts) })}</p>
      {settings.sms.ratePaisa > 0 && <p className="text-slate-600">{t('rem.confirmCost', { amount: f.money(parts * settings.sms.ratePaisa) })}</p>}
      {plans.length === 1 && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-500">{t('rem.preview')}</p>
          <p className="mt-1">{plans[0]!.text}</p>
        </div>
      )}
      {settings.sms.testMode && <p className="mt-3 text-sm text-amber-800">{t('rem.testMode')}</p>}
      <Button className="mt-4 w-full text-lg" onClick={send}>
        {t('rem.confirm')}
      </Button>
      <Button variant="ghost" className="mt-2 w-full" onClick={onClose}>
        {t('customer.cancel')}
      </Button>
    </Modal>
  )
}
