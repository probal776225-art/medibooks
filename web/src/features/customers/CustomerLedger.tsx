// লেনদেনের হিসাব: newest first, 30 per page, running balance walked back from the current due.
// Voided rows stay visible (struck through). Tapping a row shows its detail and the void action.
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore'
import { useEffect, useMemo, useState } from 'react'
import { Button, Card, TextInput } from '../../components/ui'
import { fetchLedgerPage, subscribeLedger, voidTransaction, type LedgerRowData } from '../../data/repos/transactions'
import { useIsOwner } from '../../stores/role'
import { balancesFromNewest } from '../../domain/ledger'
import { formatBp } from '../../domain/money'
import type { Customer, Transaction } from '../../domain/types'
import { useT, type MessageKey } from '../../i18n'
import { errorKey, useFormat } from '../../i18n/format'
import { unitText } from '../../i18n/units'
import { MemoImage } from '../print/PrintTemplates'
import { PngPreviewDialog } from '../print/PngPreviewDialog'
import { useUiStore } from '../../stores/ui'
import { useToastStore } from '../../stores/toast'

const PAGE = 30

function Detail({ txn }: { txn: Transaction }) {
  const t = useT()
  const isOwner = useIsOwner()
  const f = useFormat()
  const digits = useUiStore((s) => s.digits)
  const showToast = useToastStore((s) => s.show)
  const [voiding, setVoiding] = useState(false)
  const [showImage, setShowImage] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<MessageKey | null>(null)

  function confirmVoid() {
    try {
      voidTransaction(txn, reason)
      showToast('success', 'ledger.voidDone')
      setVoiding(false)
    } catch (e) {
      setError(errorKey(e))
    }
  }

  return (
    <div className="mt-2 space-y-2 rounded-xl bg-slate-50 p-3 text-[15px]">
      {txn.lines.length > 0 && (
        <ul className="space-y-1">
          {txn.lines.map((l) => (
            <li key={l.lineNo} className="flex justify-between gap-3">
              <span className="min-w-0">
                {l.name}{' '}
                <span className="text-slate-500">
                  · {f.num(l.qty)} {unitText(t, l)} × {f.money(l.unitPricePaisa)}
                  {l.discountPaisa > 0 && ` − ${f.money(l.discountPaisa)}`}
                </span>
              </span>
              <span className="shrink-0 tabular-nums">{f.money(l.lineTotalPaisa)}</span>
            </li>
          ))}
        </ul>
      )}
      {txn.type === 'sale' && (
        <div className="space-y-0.5 border-t border-slate-200 pt-2 text-slate-600">
          <p>
            {t('sale.subtotal')} {f.money(txn.subtotalPaisa)}
            {txn.billDiscountPaisa > 0 &&
              ` · ${t('sale.discount')} ${txn.billDiscount.type === 'percent' ? `${formatBp(txn.billDiscount.value, digits)}% ` : ''}−${f.money(txn.billDiscountPaisa)}`}
            {txn.roundOffPaisa !== 0 && ` · ${t('sale.roundOff')} ${f.money(txn.roundOffPaisa)}`}
          </p>
          <p className="font-medium text-slate-800">
            {t('sale.net')} {f.money(txn.netPaisa)}
          </p>
        </div>
      )}
      {txn.paidNowPaisa > 0 && txn.type === 'sale' && (
        <p className="text-slate-600">
          {t('ledger.paidNow', { amount: f.money(txn.paidNowPaisa), method: txn.paymentMethod ? t(`method.${txn.paymentMethod}`) : '' })}
          {txn.trxId && ` · ${txn.trxId}`}
        </p>
      )}
      {txn.type === 'payment' && (
        <p className="text-slate-600">
          {txn.paymentMethod ? t(`method.${txn.paymentMethod}`) : ''}
          {txn.trxId && ` · ${txn.trxId}`}
        </p>
      )}
      {txn.note && <p className="text-slate-600 italic">{txn.note}</p>}
      <Button variant="ghost" className="min-h-10 border border-slate-200 text-sm" onClick={() => setShowImage(true)}>
        {t(txn.type === 'payment' ? 'print.receiptImage' : 'print.memoImage')}
      </Button>
      {showImage && (
        <PngPreviewDialog
          title={t(txn.type === 'payment' ? 'print.receiptImage' : 'print.memoImage')}
          fileName={`memo-${txn.memoNo}.png`}
          image={<MemoImage txn={txn} />}
          onClose={() => setShowImage(false)}
        />
      )}
      {txn.voided ? (
        <p className="text-rose-700">{t('ledger.voidReasonShown', { reason: txn.voidReason })}</p>
      ) : voiding ? (
        <div className="space-y-2">
          <TextInput autoFocus placeholder={t('ledger.voidReason')} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
          {error && <p className="text-sm text-rose-600">{t(error)}</p>}
          <div className="flex gap-2">
            <Button variant="danger" onClick={confirmVoid}>
              {t('ledger.voidConfirm')}
            </Button>
            <Button variant="ghost" onClick={() => setVoiding(false)}>
              {t('customer.cancel')}
            </Button>
          </div>
        </div>
      ) : isOwner ? (
        <Button variant="ghost" className="min-h-10 text-sm text-rose-700" onClick={() => setVoiding(true)}>
          {t('ledger.void')}
        </Button>
      ) : null}
    </div>
  )
}

export function CustomerLedger({ customer }: { customer: Customer }) {
  const t = useT()
  const isOwner = useIsOwner()
  const f = useFormat()
  const [first, setFirst] = useState<LedgerRowData[] | null>(null)
  const [firstLast, setFirstLast] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [older, setOlder] = useState<LedgerRowData[]>([])
  const [olderLast, setOlderLast] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    setOlder([])
    setOlderLast(null)
    return subscribeLedger(
      customer.mobile,
      PAGE,
      (page) => {
        setFirst(page.rows)
        setFirstLast(page.last)
        setHasMore(page.rows.length === PAGE)
      },
      () => setFailed(true),
    )
  }, [customer.mobile])

  async function loadMore() {
    const after = olderLast ?? firstLast
    if (!after) return
    const page = await fetchLedgerPage(customer.mobile, after, PAGE)
    setOlder((o) => [...o, ...page.rows])
    setOlderLast(page.last)
    setHasMore(page.rows.length === PAGE)
  }

  const rows = useMemo(() => {
    const all = [...(first ?? []), ...older]
    const balances = balancesFromNewest(customer.totalDuePaisa, all.map((r) => r.txn))
    return all.map((r, i) => ({ ...r, balanceAfterPaisa: balances[i]!.balanceAfterPaisa }))
  }, [first, older, customer.totalDuePaisa])

  return (
    <Card>
      <h2 className="font-semibold">{t('ledger.title')}</h2>
      {!isOwner && <p className="text-sm text-slate-500">{t('staff.ownOnly')}</p>}
      {failed ? (
        <p className="mt-1 text-slate-500">{t('ledger.loadFailed')}</p>
      ) : first === null ? (
        <p className="mt-1 text-slate-500">{t('app.loading')}</p>
      ) : rows.length === 0 ? (
        <p className="mt-1 text-slate-500">{t('ledger.empty')}</p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100">
          {rows.map(({ txn, pending, balanceAfterPaisa }) => {
            const plus = txn.effectPaisa > 0
            return (
              <li key={txn.id} className="py-2">
                <button
                  type="button"
                  onClick={() => setOpen((o) => (o === txn.id ? null : txn.id))}
                  className="flex min-h-12 w-full items-center gap-3 text-left"
                  aria-expanded={open === txn.id}
                >
                  <span className="min-w-0 flex-1">
                    <span className={`block font-medium ${txn.voided ? 'text-slate-400 line-through' : ''}`}>
                      {t(`ledger.type.${txn.type}` as MessageKey)}{' '}
                      <span className="font-mono text-xs text-slate-500">{txn.memoNo}</span>
                    </span>
                    <span className="block text-sm text-slate-500">
                      {f.dateTime(txn.createdAt)}
                      {pending && <span className="ml-2 rounded bg-amber-100 px-1.5 text-xs text-amber-800">{t('ledger.pending')}</span>}
                      {txn.voided && <span className="ml-2 rounded bg-rose-100 px-1.5 text-xs text-rose-800">{t('ledger.voided')}</span>}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span
                      className={`block font-semibold tabular-nums ${
                        txn.voided ? 'text-slate-400 line-through' : plus ? 'text-rose-700' : 'text-emerald-700'
                      }`}
                    >
                      {txn.effectPaisa > 0 ? '+' : txn.effectPaisa < 0 ? '−' : ''}
                      {f.money(Math.abs(txn.effectPaisa))}
                    </span>
                    {/* A running balance needs every transaction; staff see only their own. */}
                    {isOwner && (
                      <span className="block text-xs text-slate-500">
                        {t('ledger.balance', { amount: f.money(balanceAfterPaisa) })}
                      </span>
                    )}
                  </span>
                </button>
                {open === txn.id && <Detail txn={txn} />}
              </li>
            )
          })}
        </ul>
      )}
      {hasMore && (
        <Button variant="ghost" className="mt-2 w-full border border-slate-200" onClick={() => void loadMore()}>
          {t('ledger.more')}
        </Button>
      )}
    </Card>
  )
}
