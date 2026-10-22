// Image templates for PNG export (SPEC §11). Drawn off-screen at 576 px and turned into a PNG by lib/png.
// Plain, high-contrast layout so it reads well on a phone and on a future 80 mm thermal printer.
import type { ReactNode } from 'react'
import { formatBp } from '../../domain/money'
import type { AgingBucket, ReportSummary } from '../../domain/reports'
import type { Statement } from '../../domain/statement'
import { PAYMENT_METHODS, type Customer, type Paisa, type Transaction, type TransactionDraft } from '../../domain/types'
import { useT, type MessageKey } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { unitText } from '../../i18n/units'
import { useDataStore } from '../../stores/data'
import { useUiStore } from '../../stores/ui'
import { PRINT_WIDTH } from '../../lib/printWidth'

function Frame({ children }: { children: ReactNode }) {
  const shop = useDataStore((s) => s.settings.shop)
  return (
    <div style={{ width: PRINT_WIDTH }} className="bg-white px-6 py-5 font-sans text-[17px] leading-snug text-black">
      <div className="text-center">
        <p className="text-[22px] font-bold tracking-wide">{shop.name}</p>
        <p className="text-[15px]">
          {shop.address} · {shop.phone}
        </p>
      </div>
      <div className="my-3 border-t-2 border-black" />
      {children}
    </div>
  )
}

function Line({ label, value, strong, big }: { label: ReactNode; value: string; strong?: boolean; big?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 py-0.5 ${strong ? 'font-bold' : ''} ${big ? 'text-[21px]' : ''}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

const Rule = () => <div className="my-2 border-t border-dashed border-black" />

/** Baki memo (sale) or payment receipt; opening/adjustment get the same simple layout. */
export function MemoImage({ txn }: { txn: TransactionDraft | Transaction }) {
  const t = useT()
  const f = useFormat()
  const digits = useUiStore((s) => s.digits)
  const prev = txn.memoPrevDuePaisa ?? 0
  const after = prev + txn.effectPaisa
  const title = txn.type === 'sale' ? t('print.memo') : txn.type === 'payment' ? t('print.receipt') : t(`ledger.type.${txn.type}` as MessageKey)
  const method = txn.paymentMethod ? t(`method.${txn.paymentMethod}`) : ''

  return (
    <Frame>
      <div className="relative">
        {txn.voided && (
          <p className="pointer-events-none absolute inset-x-0 top-24 rotate-[-18deg] text-center text-[64px] font-bold text-rose-600/30">
            {t('print.voided')}
          </p>
        )}
        <div className="flex items-baseline justify-between">
          <p className="text-[19px] font-bold">
            {title} <span className="font-mono text-[16px] font-normal">#{txn.memoNo}</span>
          </p>
          <p className="text-[15px]">{f.dateTime(txn.createdAt)}</p>
        </div>
        <p className="mt-1">
          {t('print.customer')}: <span className="font-semibold">{txn.customerName}</span> ·{' '}
          <span className="font-mono">{f.mobile(txn.customerId)}</span>
        </p>
        <Rule />

        {txn.type === 'sale' && txn.lines.length > 0 && (
          <table className="w-full text-[16px]">
            <thead>
              <tr className="border-b border-black text-left">
                <th className="py-1 font-semibold">{t('print.colItem')}</th>
                <th className="py-1 text-right font-semibold">{t('print.colQty')}</th>
                <th className="py-1 text-right font-semibold">{t('print.colPrice')}</th>
                <th className="py-1 text-right font-semibold">{t('print.colTotal')}</th>
              </tr>
            </thead>
            <tbody>
              {txn.lines.map((l) => (
                <tr key={l.lineNo} className="align-top">
                  <td className="py-1 pr-2">
                    {l.name}
                    {l.discountPaisa > 0 && (
                      <span className="block text-[14px]">
                        {t('sale.lineDiscount')} −{f.money(l.discountPaisa)}
                      </span>
                    )}
                  </td>
                  <td className="py-1 text-right whitespace-nowrap">
                    {f.num(l.qty)} {unitText(t, l)}
                  </td>
                  <td className="py-1 text-right tabular-nums">{f.money(l.unitPricePaisa)}</td>
                  <td className="py-1 text-right tabular-nums">{f.money(l.lineTotalPaisa)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {txn.type === 'sale' && (
          <>
            {txn.lines.length > 0 ? <Rule /> : null}
            <Line label={txn.mode === 'amount' ? t('print.amountBill') : t('sale.subtotal')} value={f.money(txn.subtotalPaisa)} />
            {txn.billDiscountPaisa > 0 && (
              <Line
                label={`${t('sale.discount')}${txn.billDiscount.type === 'percent' ? ` (${formatBp(txn.billDiscount.value, digits)}%)` : ''}`}
                value={`−${f.money(txn.billDiscountPaisa)}`}
              />
            )}
            {txn.roundOffPaisa !== 0 && (
              <Line label={t('sale.roundOff')} value={`${txn.roundOffPaisa > 0 ? '+' : '−'}${f.money(Math.abs(txn.roundOffPaisa))}`} />
            )}
            <Line label={t('sale.net')} value={f.money(txn.netPaisa)} strong />
            {txn.paidNowPaisa > 0 && <Line label={`${t('sale.paidNow')} (${method})`} value={f.money(txn.paidNowPaisa)} />}
            <Line label={t('sale.thisBill')} value={f.money(txn.effectPaisa)} />
          </>
        )}

        {txn.type === 'payment' && (
          <Line label={`${t('pay.paid')} (${method}${txn.trxId ? ` · ${txn.trxId}` : ''})`} value={f.money(txn.paidNowPaisa)} strong big />
        )}

        {(txn.type === 'opening' || txn.type === 'adjustment') && (
          <Line label={title} value={f.money(txn.effectPaisa)} strong />
        )}

        <Rule />
        <Line label={t('sale.prevDue')} value={f.money(prev)} />
        <Line label={t(txn.type === 'payment' ? 'pay.after' : 'sale.totalAfter')} value={f.money(after)} strong big />
        {txn.note && <p className="mt-2 text-[15px] italic">{txn.note}</p>}
        <p className="mt-4 text-center text-[16px]">{t('print.thanks')}</p>
      </div>
    </Frame>
  )
}

export function StatementImage({
  customer,
  periodText,
  statement,
}: {
  customer: Customer
  periodText: string
  statement: Statement<Transaction>
}) {
  const t = useT()
  const f = useFormat()
  return (
    <Frame>
      <p className="text-[19px] font-bold">{t('print.statement')}</p>
      <p className="mt-1">
        {t('print.customer')}: <span className="font-semibold">{customer.name}</span> ·{' '}
        <span className="font-mono">{f.mobile(customer.mobile)}</span>
      </p>
      <p>
        {t('print.period')}: {periodText}
      </p>
      <Rule />
      <Line label={t('print.opening')} value={f.money(statement.openingPaisa)} />
      <table className="mt-1 w-full text-[15px]">
        <thead>
          <tr className="border-y border-black text-left">
            <th className="py-1 font-semibold">{t('print.colDate')}</th>
            <th className="py-1 font-semibold">{t('print.colDetail')}</th>
            <th className="py-1 text-right font-semibold">{t('print.colDebit')}</th>
            <th className="py-1 text-right font-semibold">{t('print.colCredit')}</th>
            <th className="py-1 text-right font-semibold">{t('print.colBalance')}</th>
          </tr>
        </thead>
        <tbody>
          {statement.rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-3 text-center">
                {t('print.noRows')}
              </td>
            </tr>
          ) : (
            statement.rows.map((r) => (
              <tr key={r.txn.id} className="align-top">
                <td className="py-1 pr-1 whitespace-nowrap">{f.date(r.txn.createdAt)}</td>
                <td className="py-1 pr-1">
                  {t(`ledger.type.${r.txn.type}` as MessageKey)}
                  <span className="block font-mono text-[12px]">{r.txn.memoNo}</span>
                </td>
                <td className="py-1 text-right tabular-nums">{r.debitPaisa ? f.money(r.debitPaisa) : ''}</td>
                <td className="py-1 text-right tabular-nums">{r.creditPaisa ? f.money(r.creditPaisa) : ''}</td>
                <td className="py-1 text-right tabular-nums">{f.money(r.balancePaisa)}</td>
              </tr>
            ))
          )}
          <tr className="border-t border-black font-semibold">
            <td className="py-1" colSpan={2} />
            <td className="py-1 text-right tabular-nums">{f.money(statement.totalDebitPaisa)}</td>
            <td className="py-1 text-right tabular-nums">{f.money(statement.totalCreditPaisa)}</td>
            <td />
          </tr>
        </tbody>
      </table>
      <Rule />
      <Line label={t('print.closing')} value={f.money(statement.closingPaisa)} strong />
      <Line label={t('print.dueNow')} value={f.money(customer.totalDuePaisa)} strong big />
      <p className="mt-3 text-right text-[13px]">{t('print.made', { time: f.dateTime(Date.now()) })}</p>
    </Frame>
  )
}

export function ReportImage({
  rangeText,
  sum,
  newCount,
  market,
  buckets,
  top,
}: {
  rangeText: string
  sum: ReportSummary
  newCount: number
  market: Paisa
  buckets: AgingBucket[]
  top: Customer[]
}) {
  const t = useT()
  const f = useFormat()
  return (
    <Frame>
      <p className="text-[19px] font-bold">
        {t('print.report')} · {rangeText}
      </p>
      <Rule />
      <Line label={t('rep.bakiGiven')} value={f.money(sum.bakiGivenPaisa)} strong />
      <Line label={`${t('rep.salesNet')} (${t('rep.saleCount', { count: sum.saleCount })})`} value={f.money(sum.salesNetPaisa)} />
      <Line label={t('rep.collected')} value={f.money(sum.collectedPaisa)} strong />
      {PAYMENT_METHODS.map((m) => (
        <Line key={m} label={<span className="pl-4">{t(`method.${m}`)}</span>} value={f.money(sum.collectedByMethod[m])} />
      ))}
      <Line label={t('rep.discount')} value={f.money(sum.discountPaisa)} />
      <Line label={t('rep.newCustomers')} value={f.num(newCount)} />
      {sum.openingCount > 0 && <Line label={t('rep.opening')} value={f.money(sum.openingPaisa)} />}
      {sum.voidedCount > 0 && <Line label={t('rep.voided')} value={f.num(sum.voidedCount)} />}
      <Line label={t('rep.netChange')} value={f.money(sum.netChangePaisa)} />
      <Rule />
      <Line label={t('rep.marketNow')} value={f.money(market)} strong big />
      <p className="mt-1 font-semibold">{t('rep.aging')}</p>
      {buckets.map((b) => (
        <Line key={b.key} label={`${t('rep.days', { range: b.key })} · ${t('rep.count', { count: b.count })}`} value={f.money(b.paisa)} />
      ))}
      <Rule />
      <p className="font-semibold">{t('rep.top')}</p>
      {top.map((c, i) => (
        <Line key={c.mobile} label={`${f.num(i + 1)}. ${c.name}`} value={f.money(c.totalDuePaisa)} />
      ))}
      <p className="mt-3 text-right text-[13px]">{t('print.made', { time: f.dateTime(Date.now()) })}</p>
    </Frame>
  )
}
