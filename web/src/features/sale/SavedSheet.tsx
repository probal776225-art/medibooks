import { useState } from 'react'
import { Link } from 'react-router-dom'
import { customerPath } from '../../app/routes'
import { Button, buttonClass, Modal } from '../../components/ui'
import type { TransactionDraft } from '../../domain/types'
import { useT } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { useOnline } from '../../stores/sync'
import { MemoImage } from '../print/PrintTemplates'
import { PngPreviewDialog } from '../print/PngPreviewDialog'

/** After saving a bill or a payment: what was recorded, and the next step. */
export function SavedSheet({ txn, onAnother, onClose }: { txn: TransactionDraft; onAnother: () => void; onClose: () => void }) {
  const t = useT()
  const f = useFormat()
  const online = useOnline()
  const totalAfter = (txn.memoPrevDuePaisa ?? 0) + txn.effectPaisa
  const [showImage, setShowImage] = useState(false)
  const isPayment = txn.type === 'payment'
  const rows: [string, string][] = isPayment
    ? [
        [t('pay.paid'), `${f.money(txn.paidNowPaisa)} (${txn.paymentMethod ? t(`method.${txn.paymentMethod}`) : ''})`],
        [t('sale.prevDue'), f.money(txn.memoPrevDuePaisa ?? 0)],
      ]
    : [
        [t('sale.net'), f.money(txn.netPaisa)],
        ...(txn.paidNowPaisa > 0 ? ([[t('sale.paidNow'), f.money(txn.paidNowPaisa)]] as [string, string][]) : []),
        [t('sale.thisBill'), f.money(txn.effectPaisa)],
        [t('sale.prevDue'), f.money(txn.memoPrevDuePaisa ?? 0)],
      ]
  return (
    <Modal title={`✓ ${t(isPayment ? 'pay.saved' : 'sale.saved')}`} onClose={onClose}>
      <p className="text-slate-600">
        {t('sale.memo')} <span className="font-mono">{txn.memoNo}</span> · {f.dateTime(txn.createdAt)}
      </p>
      <p className="mt-1 text-lg font-semibold">
        {txn.customerName} · <span className="font-normal text-slate-600">{f.mobile(txn.customerId)}</span>
      </p>
      <dl className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 px-3">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between py-2">
            <dt className="text-slate-600">{k}</dt>
            <dd className="tabular-nums">{v}</dd>
          </div>
        ))}
        <div className="flex justify-between py-2 text-lg font-bold">
          <dt>{t('sale.totalAfter')}</dt>
          <dd className={`tabular-nums ${totalAfter > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{f.money(totalAfter)}</dd>
        </div>
      </dl>
      <p className="mt-2 text-sm text-slate-500">
        {t('sale.smsLater')}
        {!online && ` · ${t('sale.offlineSaved')}`}
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button onClick={onAnother} className="text-lg sm:col-span-2">
          {t(isPayment ? 'pay.another' : 'sale.another')}
        </Button>
        <Link to={customerPath(txn.customerId)} onClick={onClose} className={buttonClass('outline')}>
          {t('sale.openCustomer')}
        </Link>
        <Button variant="ghost" className="border border-slate-200" onClick={() => setShowImage(true)}>
          {t(isPayment ? 'print.receiptImage' : 'print.memoImage')}
        </Button>
      </div>
      {showImage && (
        <PngPreviewDialog
          title={t(isPayment ? 'print.receiptImage' : 'print.memoImage')}
          fileName={`memo-${txn.memoNo}.png`}
          image={<MemoImage txn={txn} />}
          onClose={() => setShowImage(false)}
        />
      )}
    </Modal>
  )
}
