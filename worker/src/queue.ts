// The SMS queue (SPEC §8): claim each item with an updateTime precondition (so two runs never send the same SMS),
// send it, record the result. Test mode marks items "test" without calling the provider.
import { SCHEMA_VERSION } from '../../web/src/domain/types'
import { withDefaults, type ShopSettings } from '../../web/src/domain/settings'
import { SMS_MAX_ATTEMPTS, SMS_MAX_TEXT, type SmsStatus } from '../../web/src/domain/sms'
import type { RunContext } from './context'
import { ts, update, type FsDoc, type Write } from './firestore'

export const SHOP = 'shops/main'
export const QUEUE = `${SHOP}/smsQueue`
export const SETTINGS = `${SHOP}/settings/general`

/** The app sends its own items right away; the sweep leaves them this long before stepping in. */
const PENDING_GRACE_MS = 2 * 60_000
/** A claimed item with no result after this long: the run died. Nobody knows if it went out, so no retry. */
const STUCK_MS = 15 * 60_000
/** A bill's "today" SMS or a reminder that reaches the server this late is not sent at all. */
const MAX_AGE_MS = 48 * 60 * 60_000
/** Wait before try 2 and 3 (× the number of tries so far). */
const RETRY_DELAY_MS = 5 * 60_000
const PARALLEL_SENDS = 4
const MOBILE = /^01[3-9]\d{8}$/

export type ItemOutcome = SmsStatus | 'missing' | 'busy' | 'later'
export interface ProcessResult {
  id: string
  status: ItemOutcome
}

export async function loadSettings(run: RunContext): Promise<{ settings: ShopSettings; doc: FsDoc | null }> {
  const doc = await run.fs.get(SETTINGS)
  return { settings: withDefaults(doc?.data), doc }
}

const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d)

/** Pending and due now (a retry waits for its retryAt). */
function readyNow(d: FsDoc, now: number): boolean {
  return d.data.status === 'pending' && num(d.data.retryAt, 0) <= now
}

interface Outcome {
  status: SmsStatus
  lastError: string
  providerRef: string
  retryAt: number | null
}

async function deliver(d: FsDoc, settings: ShopSettings, run: RunContext): Promise<Outcome> {
  const item = d.data
  const attempts = num(item.attempts) + 1
  const to = typeof item.to === 'string' ? item.to : ''
  const text = typeof item.text === 'string' ? item.text : ''
  const fail = (lastError: string): Outcome => ({ status: 'failed', lastError, providerRef: '', retryAt: null })
  if (!MOBILE.test(to) || !text || text.length > SMS_MAX_TEXT) return fail('invalid number or text')
  const isTest = item.kind === 'test'
  if (!isTest && !settings.sms.enabled) return fail('SMS is switched off in Settings')
  if (run.now - num(item.createdAt, run.now) > MAX_AGE_MS) return fail('too old (over 2 days), not sent')
  if (!isTest && settings.sms.testMode) return { status: 'test', lastError: '', providerRef: '', retryAt: null }
  run.sendsLeft -= 1
  const r = await run.provider().send(to, text, item.unicode === true)
  if (r.ok) return { status: 'sent', lastError: '', providerRef: r.ref, retryAt: null }
  // A failure the provider calls temporary goes back in the queue for a later try.
  if (r.retry && attempts < SMS_MAX_ATTEMPTS) {
    return { status: 'pending', lastError: r.error, providerRef: '', retryAt: run.now + RETRY_DELAY_MS * attempts }
  }
  return fail(r.error)
}

/** Claim, send and record queue documents that were just read and are ready. */
async function processDocs(docs: FsDoc[], run: RunContext): Promise<ProcessResult[]> {
  if (docs.length === 0) return []
  const { settings } = await loadSettings(run)
  const sends = (d: FsDoc) => d.data.kind === 'test' || (settings.sms.enabled && !settings.sms.testMode)
  const chosen: FsDoc[] = []
  const results: ProcessResult[] = []
  let budget = run.sendsLeft
  for (const d of docs.slice(0, 200)) {
    if (!sends(d)) chosen.push(d)
    else if (budget > 0) {
      budget -= 1
      chosen.push(d)
    } else results.push({ id: d.id, status: 'later' })
  }

  const claims = await run.fs.batchWrite(
    chosen.map((d) =>
      update(d.path, { status: 'sending' }, { updateTime: d.updateTime, serverTime: ['claimedAt'], increment: { attempts: 1 } }),
    ),
  )
  const claimed = chosen.filter((d, i) => {
    if (claims[i]?.ok) return true
    results.push({ id: d.id, status: 'busy' }) // another run got it first
    return false
  })

  const finishes: Write[] = []
  for (let i = 0; i < claimed.length; i += PARALLEL_SENDS) {
    const group = claimed.slice(i, i + PARALLEL_SENDS)
    const outcomes = await Promise.all(group.map((d) => deliver(d, settings, run)))
    group.forEach((d, j) => {
      const o = outcomes[j]!
      finishes.push(
        update(
          d.path,
          { status: o.status, lastError: o.lastError, providerRef: o.providerRef, retryAt: o.retryAt === null ? null : ts(o.retryAt) },
          { serverTime: o.status === 'sent' ? ['sentAt', 'finishedAt'] : ['finishedAt'] },
        ),
      )
      results.push({ id: d.id, status: o.status })
    })
  }
  await run.fs.batchWrite(finishes)
  return results
}

/** The app's "send these now" (its own new items). Items that are not ready just report their status. */
export async function processIds(ids: string[], run: RunContext): Promise<ProcessResult[]> {
  const docs = await run.fs.getMany(ids.map((id) => `${QUEUE}/${id}`))
  const results: ProcessResult[] = []
  const ready: FsDoc[] = []
  docs.forEach((d, i) => {
    if (!d) results.push({ id: ids[i]!, status: 'missing' }) // not synced yet
    else if (readyNow(d, run.now)) ready.push(d)
    else results.push({ id: d.id, status: d.data.status === 'pending' ? 'later' : (d.data.status as SmsStatus) })
  })
  return [...results, ...(await processDocs(ready, run))]
}

function byStatus(status: SmsStatus, extra: Record<string, unknown>[] = []) {
  return {
    from: [{ collectionId: 'smsQueue' }],
    where: {
      compositeFilter: {
        op: 'AND',
        filters: [{ fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: status } } }, ...extra],
      },
    },
    orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'ASCENDING' }],
    limit: 60,
  }
}

/** Cron: items the app could not send (offline saves, closed tabs), due retries, and runs that died half-way. */
export async function sweep(run: RunContext): Promise<{ processed: number; stuck: number }> {
  const before = {
    fieldFilter: {
      field: { fieldPath: 'createdAt' },
      op: 'LESS_THAN',
      value: { timestampValue: new Date(run.now - PENDING_GRACE_MS).toISOString() },
    },
  }
  const [pending, sending] = await Promise.all([
    run.fs.query(SHOP, byStatus('pending', [before])),
    run.fs.query(SHOP, byStatus('sending')),
  ])
  const stuck = sending.filter((d) => num(d.data.claimedAt, run.now) < run.now - STUCK_MS)
  if (stuck.length) {
    await run.fs.batchWrite(
      stuck.map((d) =>
        update(
          d.path,
          { status: 'failed', lastError: 'stopped half-way: check before sending again', retryAt: null },
          { updateTime: d.updateTime, serverTime: ['finishedAt'] },
        ),
      ),
    )
  }
  const results = await processDocs(
    pending.filter((d) => readyNow(d, run.now)),
    run,
  )
  return { processed: results.length, stuck: stuck.length }
}

export const queueItemBase = { attempts: 0, lastError: '', providerRef: '', retryAt: null, sentAt: null, schemaVersion: SCHEMA_VERSION }
