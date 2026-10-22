// জমা নিন (SPEC §5): existing customer → amount → method → save. Paying more than the due is allowed (অগ্রিম).
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, Card, TextInput } from '../../components/ui'
import { saveTransaction } from '../../data/repos/transactions'
import { writeContext } from '../../data/writer'
import { buildPayment } from '../../domain/billing'
import { makeMemoNo } from '../../domain/ids'
import { parseMoney } from '../../domain/money'
import { paisaToText } from '../../domain/saleDraft'
import { PAYMENT_METHODS, type PaymentMethod, type TransactionDraft } from '../../domain/types'
import { useT, type MessageKey } from '../../i18n'
import { errorKey, useFormat } from '../../i18n/format'
import { useDataStore } from '../../stores/data'
import { CustomerSummary } from '../customers/CustomerSummary'
import { MobileLookup } from '../customers/MobileLookup'
import { DueText } from '../customers/parts'
import { SavedSheet } from '../sale/SavedSheet'

const QUICK = [10_000, 50_000, 100_000] // ৳100, ৳500, ৳1,000

export function PaymentPage() {
  const t = useT()
  const f = useFormat()
  const [params] = useSearchParams()
  const byMobile = useDataStore((s) => s.byMobile)
  const [mobile, setMobile] = useState<string | null>(params.get('mobile'))
  const [amountText, setAmountText] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [trxId, setTrxId] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<MessageKey | null>(null)
  const [saved, setSaved] = useState<TransactionDraft | null>(null)

  const customer = mobile ? byMobile.get(mobile) : undefined
  const amount = amountText.trim() ? parseMoney(amountText) : null
  const after = customer && amount !== null ? customer.totalDuePaisa - amount : null

  function save() {
    setError(null)
    if (!customer) return
    if (amount === null || amount <= 0) {
      setError('error.INVALID_AMOUNT')
      return
    }
    const extra = amount - Math.max(customer.totalDuePaisa, 0)
    if (extra > 0 && !window.confirm(t('pay.advanceConfirm', { extra: f.money(extra) }))) return
    try {
      const ctx = writeContext()
      const txn = buildPayment({
        customer: { mobile: customer.mobile, name: customer.name },
        prevDuePaisa: customer.totalDuePaisa,
        amountPaisa: amount,
        method,
        trxId: method === 'bkash' || method === 'nagad' ? trxId : '',
        note,
        meta: { memoNo: makeMemoNo('payment', ctx.now), deviceId: ctx.deviceId, createdAt: ctx.now, createdBy: ctx.uid },
      })
      saveTransaction(txn)
      setSaved(txn)
      setAmountText('')
      setTrxId('')
      setNote('')
    } catch (e) {
      setError(errorKey(e))
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <section className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">{t('pay.title')}</h1>

      {customer ? (
        <Card className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold">{customer.name}</p>
            <p className="text-sm text-slate-500">{f.mobile(customer.mobile)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">{t('customer.due')}</p>
            <DueText paisa={customer.totalDuePaisa} />
          </div>
          <Button variant="ghost" className="min-h-11 text-sm" onClick={() => setMobile(null)}>
            {t('sale.change')}
          </Button>
        </Card>
      ) : (
        <Card>
          <MobileLookup
            initialMobile={mobile ?? ''}
            allowCreate={false}
            renderFound={(c) => (
              <CustomerSummary customer={c}>
                <Button className="mt-3 w-full text-lg" onClick={() => setMobile(c.mobile)}>
                  {t('pay.pickCustomer')}
                </Button>
              </CustomerSummary>
            )}
            onCreated={setMobile}
          />
        </Card>
      )}

      {customer && (
        <Card className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{t('pay.amount')}</span>
            <span className="flex items-center gap-2">
              <span className="text-2xl text-slate-500">৳</span>
              <TextInput
                inputMode="decimal"
                autoFocus
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                className="text-2xl font-semibold"
              />
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            {customer.totalDuePaisa > 0 && (
              <button
                type="button"
                onClick={() => setAmountText(paisaToText(customer.totalDuePaisa))}
                className="min-h-10 rounded-lg border border-teal-700 px-3 text-sm font-semibold text-teal-800"
              >
                {t('pay.fullDue')} {f.money(customer.totalDuePaisa)}
              </button>
            )}
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setAmountText(paisaToText(q))}
                className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm"
              >
                {f.money(q)}
              </button>
            ))}
          </div>

          <div>
            <p className="mb-1 text-sm font-medium text-slate-700">{t('pay.method')}</p>
            <div className="flex flex-wrap gap-1.5" role="radiogroup">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={method === m}
                  onClick={() => setMethod(m)}
                  className={`min-h-11 rounded-lg border px-4 font-semibold ${
                    method === m ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  {t(`method.${m}`)}
                </button>
              ))}
            </div>
          </div>
          {(method === 'bkash' || method === 'nagad') && (
            <TextInput aria-label={t('sale.trxId')} placeholder={t('sale.trxId')} value={trxId} onChange={(e) => setTrxId(e.target.value)} />
          )}
          <TextInput aria-label={t('sale.note')} placeholder={t('sale.note')} value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />

          <div className="rounded-xl bg-slate-50 p-3">
            <div className="flex justify-between py-1">
              <span className="text-slate-600">{t('sale.prevDue')}</span>
              <span className="tabular-nums">{f.money(customer.totalDuePaisa)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-600">{t('pay.paid')}</span>
              <span className="tabular-nums">{amount === null ? '—' : f.money(amount)}</span>
            </div>
            <div className="flex items-baseline justify-between border-t border-slate-200 pt-2 text-lg font-bold">
              <span>{t('pay.after')}</span>
              {after === null ? <span>—</span> : <DueText paisa={after} />}
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {t(error)}
            </p>
          )}
          <Button className="w-full text-lg" onClick={save}>
            {t('pay.save')} <span className="text-sm font-normal opacity-75">({t('sale.saveHint')})</span>
          </Button>
        </Card>
      )}

      {saved && (
        <SavedSheet
          txn={saved}
          onAnother={() => {
            setSaved(null)
            setMobile(null)
          }}
          onClose={() => setSaved(null)}
        />
      )}
    </section>
  )
}
