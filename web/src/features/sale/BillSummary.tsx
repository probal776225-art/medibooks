// Bill totals (SPEC §4): subtotal → bill discount → round-off → net → paid now → this bill's baki → total due.
import { TextInput } from '../../components/ui'
import { paisaToText, type DraftEvaluation, type SaleDraft } from '../../domain/saleDraft'
import { PAYMENT_METHODS, type BillDiscount, type Paisa } from '../../domain/types'
import { useT, type MessageKey } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { patchDraft } from './saleStore'

const DISCOUNT_TYPES: { id: BillDiscount['type']; label: MessageKey | null; text?: string }[] = [
  { id: 'none', label: 'sale.discNone' },
  { id: 'percent', label: null, text: '%' },
  { id: 'flat', label: null, text: '৳' },
]

function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: 'red' | 'green' }) {
  const color = tone === 'red' ? 'text-rose-700' : tone === 'green' ? 'text-emerald-700' : ''
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1 ${strong ? 'text-lg font-bold' : ''}`}>
      <span className={strong ? '' : 'text-slate-600'}>{label}</span>
      <span className={`tabular-nums ${color}`}>{value}</span>
    </div>
  )
}

export function BillSummary({ draft, ev, prevDuePaisa }: { draft: SaleDraft; ev: DraftEvaluation; prevDuePaisa: Paisa }) {
  const t = useT()
  const f = useFormat()
  const totals = ev.totals
  const dash = '—'
  const totalAfter = ev.effectPaisa === null ? null : prevDuePaisa + ev.effectPaisa

  return (
    <div className="space-y-2">
      <Row label={t('sale.subtotal')} value={totals ? f.money(totals.subtotalPaisa) : dash} />

      <div className="flex flex-wrap items-center gap-2 py-1">
        <span className="text-slate-600">{t('sale.discount')}</span>
        <div className="flex overflow-hidden rounded-lg border border-slate-300" role="radiogroup">
          {DISCOUNT_TYPES.map((d) => (
            <button
              key={d.id}
              type="button"
              role="radio"
              aria-checked={draft.discountType === d.id}
              onClick={() => patchDraft({ discountType: d.id, ...(d.id === 'none' ? { discountText: '' } : {}) })}
              className={`min-h-10 min-w-11 px-3 text-sm font-semibold ${
                draft.discountType === d.id ? 'bg-teal-700 text-white' : 'bg-white text-slate-700'
              }`}
            >
              {d.label ? t(d.label) : d.text}
            </button>
          ))}
        </div>
        {draft.discountType !== 'none' && (
          <input
            aria-label={t('sale.discount')}
            inputMode="decimal"
            value={draft.discountText}
            onChange={(e) => patchDraft({ discountText: e.target.value })}
            placeholder={draft.discountType === 'percent' ? '10' : '50'}
            className="h-10 w-20 rounded-lg border border-slate-300 px-2 text-right outline-none focus:border-teal-600"
          />
        )}
        <span className="ml-auto tabular-nums text-slate-600">
          {totals && totals.billDiscountPaisa > 0 ? `−${f.money(totals.billDiscountPaisa)}` : ''}
        </span>
      </div>

      {totals && totals.roundOffPaisa !== 0 && (
        <Row
          label={t('sale.roundOff')}
          value={`${totals.roundOffPaisa > 0 ? '+' : '−'}${f.money(Math.abs(totals.roundOffPaisa))}`}
        />
      )}
      <div className="border-t border-slate-200 pt-1">
        <Row label={t('sale.net')} value={totals ? f.money(totals.netPaisa) : dash} strong />
      </div>

      <div className="rounded-xl bg-slate-50 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{t('sale.paidNow')}</span>
          <label className="flex items-center gap-1">
            <span className="text-slate-500">৳</span>
            <input
              aria-label={t('sale.paidNow')}
              inputMode="decimal"
              value={draft.paidText}
              onChange={(e) => patchDraft({ paidText: e.target.value })}
              placeholder="0"
              className="h-11 w-28 rounded-xl border border-slate-300 bg-white px-2 text-right text-lg outline-none focus:border-teal-600"
            />
          </label>
          {totals && totals.netPaisa > 0 && (
            <button
              type="button"
              onClick={() => patchDraft({ paidText: paisaToText(totals.netPaisa), method: draft.method ?? 'cash' })}
              className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
            >
              {t('sale.payAll')}
            </button>
          )}
        </div>
        {ev.paidNowPaisa > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={draft.method === m}
                onClick={() => patchDraft({ method: m })}
                className={`min-h-10 rounded-lg border px-3 text-sm font-semibold ${
                  draft.method === m ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-700'
                }`}
              >
                {t(`method.${m}`)}
              </button>
            ))}
          </div>
        )}
        {ev.paidNowPaisa > 0 && (draft.method === 'bkash' || draft.method === 'nagad') && (
          <TextInput
            aria-label={t('sale.trxId')}
            placeholder={t('sale.trxId')}
            value={draft.trxId}
            onChange={(e) => patchDraft({ trxId: e.target.value })}
            className="mt-2 min-h-11"
          />
        )}
      </div>

      <Row label={t('sale.thisBill')} value={ev.effectPaisa === null ? dash : f.money(ev.effectPaisa)} />
      <Row label={t('sale.prevDue')} value={f.money(prevDuePaisa)} />
      <div className="border-t border-slate-200 pt-1">
        <Row
          label={t('sale.totalAfter')}
          value={totalAfter === null ? dash : f.money(totalAfter)}
          strong
          tone={totalAfter !== null && totalAfter > 0 ? 'red' : 'green'}
        />
      </div>

      <TextInput
        aria-label={t('sale.note')}
        placeholder={t('sale.note')}
        value={draft.note}
        onChange={(e) => patchDraft({ note: e.target.value })}
        maxLength={200}
      />
    </div>
  )
}
