// Due reminders sent from the app (তাগাদা page, customer page). The daily automatic run is the Worker's.
import { serverTimestamp, Timestamp } from 'firebase/firestore'
import { afterReminder } from '../../domain/reminders'
import type { ShopSettings } from '../../domain/settings'
import { planReminderSms } from '../../domain/sms'
import type { Customer } from '../../domain/types'
import { paths } from '../paths'
import { auditInBatch, commitInBackground, newBatch, writeContext } from '../writer'
import { queueSmsInBatch, sendSoon } from './sms'

/** One batch per 150 customers: the SMS, the customer's reminder count, an audit entry. Works offline. */
export function sendReminders(customers: readonly Customer[], settings: ShopSettings): number {
  const ctx = writeContext()
  for (let i = 0; i < customers.length; i += 150) {
    const group = customers.slice(i, i + 150)
    const batch = newBatch()
    const ids = group.map((c) => {
      const id = queueSmsInBatch(batch, planReminderSms(c, settings, ctx.now), { customerId: c.mobile, customerName: c.name, txnId: null }, ctx)
      const after = afterReminder(c, ctx.now)
      batch.update(paths.customer(c.mobile), {
        ...after,
        lastReminderAt: Timestamp.fromMillis(after.lastReminderAt),
        updatedAt: serverTimestamp(),
      })
      return id
    })
    auditInBatch(
      batch,
      { action: 'reminder.send', entity: 'customer', entityId: group.length === 1 ? group[0]!.mobile : 'many', before: null, after: { count: group.length } },
      ctx,
    )
    commitInBackground(batch, () => sendSoon(ids))
  }
  return customers.length
}
