// One line under a saved bill or payment: what happens with the customer's SMS.
import { smsServerConfigured } from '../../data/repos/sms'
import { planTxnSms } from '../../domain/sms'
import type { TransactionDraft } from '../../domain/types'
import { useT, type MessageKey } from '../../i18n'
import { useDataStore } from '../../stores/data'
import { useOnline } from '../../stores/sync'

export function SmsNote({ txn }: { txn: TransactionDraft }) {
  const t = useT()
  const online = useOnline()
  const settings = useDataStore((s) => s.settings)
  const customer = useDataStore((s) => s.byMobile.get(txn.customerId))
  const plan = planTxnSms(txn, customer, settings)
  let key: MessageKey | null
  if (!settings.sms.enabled) key = 'sms.offShop'
  else if (customer && !customer.smsEnabled) key = 'sms.offCustomer'
  else if (!plan) key = null
  else if (!smsServerConfigured) key = 'sms.noServer'
  else if (settings.sms.testMode) key = 'sms.testModeNote'
  else key = online ? 'sms.sending' : 'sms.whenOnline'
  return key ? <>{t(key)}</> : null
}
