// SMS লগ (SPEC §8): every queued SMS with its status, a filter, retry for failures, and this month's count + cost.
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore'
import { customerPath, ROUTES } from '../../app/routes'
import { Button, Card } from '../../components/ui'
import {
  fetchSmsLogPage,
  fetchSmsStats,
  retrySms,
  sendQueued,
  smsServerConfigured,
  subscribeSmsLog,
  type SmsFilter,
} from '../../data/repos/sms'
import { dhakaMonthRange } from '../../domain/dates'
import type { SmsQueueItem, SmsStatus } from '../../domain/sms'
import { useT, type MessageKey } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { useDataStore } from '../../stores/data'
import { useOnline } from '../../stores/sync'
import { useToastStore } from '../../stores/toast'

const PAGE = 30
const FILTERS: { id: SmsFilter; label: MessageKey }[] = [
  { id: 'all', label: 'smslog.all' },
  { id: 'pending', label: 'smsStatus.pending' },
  { id: 'sent', label: 'smsStatus.sent' },
  { id: 'failed', label: 'smsStatus.failed' },
  { id: 'test', label: 'smsStatus.test' },
]

const STATUS_STYLE: Record<SmsStatus, string> = {
  pending: 'bg-amber-100 text-amber-900',
  sending: 'bg-amber-100 text-amber-900',
  sent: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-rose-100 text-rose-800',
  test: 'bg-slate-200 text-slate-700',
}

function MonthCard() {
  const t = useT()
  const f = useFormat()
  const online = useOnline()
  const rate = useDataStore((s) => s.settings.sms.ratePaisa)
  const [stats, setStats] = useState<{ sent: number; segments: number } | null | 'error'>(null)

  useEffect(() => {
    if (!online) return
    const { start, end } = dhakaMonthRange(Date.now())
    fetchSmsStats(start, end).then(setStats, (e: unknown) => {
      console.error(e)
      setStats('error')
    })
  }, [online])

  return (
    <Card>
      <h2 className="font-semibold">{t('smslog.month')}</h2>
      {!online || stats === 'error' ? (
        <p className="mt-1 text-slate-500">{t('smslog.offline')}</p>
      ) : stats === null ? (
        <p className="mt-1 text-slate-500">{t('app.loading')}</p>
      ) : (
        <>
          <p className="mt-1 text-lg">{t('smslog.monthSummary', { count: f.num(stats.sent), parts: f.num(stats.segments) })}</p>
          <p className="text-slate-600">
            {rate > 0 ? t('smslog.cost', { amount: f.money(stats.segments * rate) }) : t('smslog.noRate')}
          </p>
        </>
      )}
    </Card>
  )
}

function SmsRow({ item }: { item: SmsQueueItem }) {
  const t = useT()
  const f = useFormat()
  const waitingRetry = item.status === 'pending' && item.lastError
  return (
    <li className="py-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {t(`smsKind.${item.kind}`)} ·{' '}
            {item.customerId ? (
              <Link to={customerPath(item.customerId)} className="text-teal-800 underline-offset-2 hover:underline">
                {item.customerName || f.mobile(item.customerId)}
              </Link>
            ) : (
              f.mobile(item.to)
            )}
          </p>
          <p className="text-sm text-slate-500">
            {f.dateTime(item.createdAt)} · {t('smslog.parts', { count: f.num(item.segments) })}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-sm font-medium ${STATUS_STYLE[item.status]}`}>
          {t(`smsStatus.${item.status}`)}
        </span>
      </div>
      <p className="mt-1 line-clamp-3 text-[15px] text-slate-700">{item.text}</p>
      {(item.status === 'failed' || waitingRetry) && (
        <p className="mt-1 text-sm text-rose-700">
          {item.lastError}
          {waitingRetry && ` · ${t('smslog.willRetry')}`}
        </p>
      )}
      {item.status === 'failed' && (
        <Button variant="outline" className="mt-2 min-h-10 text-sm" onClick={() => retrySms(item)}>
          {t('smslog.retry')}
        </Button>
      )}
    </li>
  )
}

export function SmsLogPage() {
  const t = useT()
  const online = useOnline()
  const testMode = useDataStore((s) => s.settings.sms.testMode)
  const [filter, setFilter] = useState<SmsFilter>('all')
  const [first, setFirst] = useState<SmsQueueItem[] | null>(null)
  const [firstLast, setFirstLast] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [older, setOlder] = useState<SmsQueueItem[]>([])
  const [olderLast, setOlderLast] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFirst(null)
    setOlder([])
    setOlderLast(null)
    setFailed(false)
    return subscribeSmsLog(
      filter,
      PAGE,
      (page) => {
        setFirst(page.items)
        setFirstLast(page.last)
        setHasMore(page.items.length === PAGE)
      },
      (e) => {
        console.error(e)
        setFailed(true)
      },
    )
  }, [filter])

  async function loadMore() {
    const after = olderLast ?? firstLast
    if (!after) return
    const page = await fetchSmsLogPage(filter, after, PAGE)
    setOlder((o) => [...o, ...page.items])
    setOlderLast(page.last)
    setHasMore(page.items.length === PAGE)
  }

  const items = useMemo(() => [...(first ?? []), ...older], [first, older])
  const waiting = items.filter((i) => i.status === 'pending').map((i) => i.id)

  function sendWaiting() {
    sendQueued(waiting).catch((e: unknown) => console.error(e))
    useToastStore.getState().show('info', 'smslog.asked')
  }

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">{t('nav.smsLog')}</h1>
      {testMode && (
        <p className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-amber-900">
          {t('smslog.testModeOn')}{' '}
          <Link to={`${ROUTES.settings}#sms`} className="font-medium underline">
            {t('nav.settings')}
          </Link>
        </p>
      )}
      {!smsServerConfigured && <p className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-amber-900">{t('sms.noServer')}</p>}
      <MonthCard />

      <Card>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">
          {FILTERS.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setFilter(x.id)}
              className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-medium ${
                filter === x.id ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-700'
              }`}
            >
              {t(x.label)}
            </button>
          ))}
        </div>
        {waiting.length > 0 && online && smsServerConfigured && (
          <Button variant="outline" className="mt-3 w-full" onClick={sendWaiting}>
            {t('smslog.sendPending')}
          </Button>
        )}
        {failed ? (
          <p className="mt-4 text-rose-700">{t('smslog.loadFailed')}</p>
        ) : first === null ? (
          <p className="mt-4 text-slate-500">{t('app.loading')}</p>
        ) : items.length === 0 ? (
          <p className="mt-4 text-slate-500">{t('smslog.empty')}</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {items.map((i) => (
              <SmsRow key={i.id} item={i} />
            ))}
          </ul>
        )}
        {hasMore && (
          <Button variant="ghost" className="mt-2 w-full border border-slate-200" onClick={() => void loadMore()}>
            {t('smslog.more')}
          </Button>
        )}
      </Card>
    </section>
  )
}
