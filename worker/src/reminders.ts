// Daily due reminders (SPEC §9): once a day from sendHour (Dhaka), queue a reminder for every customer the shared
// rules allow, and count it on the customer — all in one commit per 200 customers.
import { afterReminder, dueForReminder, reminderJobDue, type ReminderCustomer } from '../../web/src/domain/reminders'
import { planReminderSms } from '../../web/src/domain/sms'
import type { RunContext } from './context'
import { autoId, create, toValue, ts, update, type FsDoc, type Write } from './firestore'
import { loadSettings, QUEUE, queueItemBase, SHOP } from './queue'

const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d)
const numOrNull = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** Same defaults as the app's customer reader (a missing switch means on). */
export function toReminderCustomer(d: FsDoc): ReminderCustomer {
  const x = d.data
  return {
    mobile: d.id,
    name: typeof x.name === 'string' ? x.name : '',
    totalDuePaisa: num(x.totalDuePaisa),
    smsEnabled: x.smsEnabled !== false,
    reminderEnabled: x.reminderEnabled !== false,
    archived: x.archived === true,
    lastPaymentAt: numOrNull(x.lastPaymentAt),
    lastReminderAt: numOrNull(x.lastReminderAt),
    reminderMonth: typeof x.reminderMonth === 'string' ? x.reminderMonth : null,
    reminderCountThisMonth: num(x.reminderCountThisMonth),
  }
}

/** Returns the new queue item ids (empty when it is not time, or another run already did today). */
export async function runReminderJob(run: RunContext): Promise<string[]> {
  const { settings, doc } = await loadSettings(run)
  const { due, today } = reminderJobDue(settings, run.now)
  if (!due || !doc) return []
  // Mark today as done first, only if nobody changed the settings since we read them: two overlapping runs
  // cannot both pass this.
  const [claim] = await run.fs.batchWrite([
    update(doc.path, { reminder: { lastRunDate: today } }, { mask: ['reminder.lastRunDate'], updateTime: doc.updateTime }),
  ])
  if (!claim?.ok) return []

  const docs = await run.fs.query(SHOP, {
    from: [{ collectionId: 'customers' }],
    where: {
      fieldFilter: {
        field: { fieldPath: 'totalDuePaisa' },
        op: 'GREATER_THAN_OR_EQUAL',
        value: toValue(Math.max(settings.reminder.thresholdPaisa, 1)),
      },
    },
    limit: 2000,
  })
  const list = dueForReminder(docs.map(toReminderCustomer), settings.reminder, run.now)

  const ids: string[] = []
  const writes: Write[] = []
  for (const c of list) {
    const id = autoId()
    ids.push(id)
    writes.push(
      create(
        `${QUEUE}/${id}`,
        {
          ...planReminderSms(c, settings, run.now),
          ...queueItemBase,
          customerId: c.mobile,
          customerName: c.name,
          txnId: null,
          status: 'pending',
          auto: true,
          createdAt: ts(run.now),
          createdBy: 'worker',
        },
        { serverTime: ['serverAt'] },
      ),
    )
    const after = afterReminder(c, run.now)
    writes.push(
      update(
        `${SHOP}/customers/${c.mobile}`,
        { ...after, lastReminderAt: ts(after.lastReminderAt) },
        { mustExist: true, serverTime: ['updatedAt'] },
      ),
    )
  }
  writes.push(
    create(
      `${SHOP}/auditLog/${autoId()}`,
      {
        action: 'reminder.auto',
        entity: 'settings',
        entityId: 'general',
        before: null,
        after: { date: today, count: list.length },
        at: ts(run.now),
        by: 'worker',
        deviceId: 'worker',
        schemaVersion: queueItemBase.schemaVersion,
      },
      { serverTime: ['serverAt'] },
    ),
  )
  for (let i = 0; i < writes.length; i += 400) await run.fs.commit(writes.slice(i, i + 400))
  return ids
}
