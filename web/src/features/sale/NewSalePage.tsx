// নতুন বাকি — the most-used screen (SPEC §4). Everything is local first; save is one offline-safe batch.
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { recordMedicineUsage, shopMedicineFor, useCatalogStore } from '../../catalog/store'
import { Icon } from '../../components/Icon'
import { Button, Card, TextInput } from '../../components/ui'
import { saveTransaction } from '../../data/repos/transactions'
import { writeContext } from '../../data/writer'
import { makeMemoNo } from '../../domain/ids'
import { draftToSale, evaluateDraft } from '../../domain/saleDraft'
import type { TransactionDraft } from '../../domain/types'
import { useT, type MessageKey } from '../../i18n'
import { errorKey, useFormat } from '../../i18n/format'
import { useDataStore } from '../../stores/data'
import { CustomerSummary } from '../customers/CustomerSummary'
import { MobileLookup } from '../customers/MobileLookup'
import { DueText } from '../customers/parts'
import { MedicineSearch } from '../medicines/MedicineSearch'
import { QuickAddMedicine } from '../medicines/QuickAddMedicine'
import { BillSummary } from './BillSummary'
import { SaleLineRow } from './SaleLineRow'
import { SavedSheet } from './SavedSheet'
import { addFreeTextLine, addMedicineLine, loadSaleDraft, patchDraft, resetDraft, useSaleStore } from './saleStore'

const SEARCH_ID = 'sale-medicine-search'

export function NewSalePage() {
  const t = useT()
  const f = useFormat()
  const [params] = useSearchParams()
  const { draft, loaded } = useSaleStore()
  const byMobile = useDataStore((s) => s.byMobile)
  const roundToTaka = useDataStore((s) => s.settings.billing.roundToTaka)
  const medicines = useCatalogStore((s) => s.byId)
  const [adding, setAdding] = useState<{ name?: string } | null>(null)
  const [tried, setTried] = useState(false)
  const [saveError, setSaveError] = useState<MessageKey | null>(null)
  const [saved, setSaved] = useState<TransactionDraft | null>(null)

  const customer = draft.customerMobile ? byMobile.get(draft.customerMobile) : undefined
  const ev = useMemo(() => evaluateDraft(draft, medicines, roundToTaka), [draft, medicines, roundToTaka])

  useEffect(() => {
    void loadSaleDraft()
  }, [])

  // A save error belongs to the bill as it was; any edit clears it (live problems still show after a save attempt).
  useEffect(() => setSaveError(null), [draft])

  // Coming from a customer's page (?mobile=…) picks that customer unless a bill is already in progress.
  const paramMobile = params.get('mobile')
  useEffect(() => {
    if (!loaded || !paramMobile) return
    const d = useSaleStore.getState().draft
    if (d.customerMobile !== paramMobile && d.lines.length === 0 && !d.amountText) patchDraft({ customerMobile: paramMobile })
  }, [loaded, paramMobile])

  function save() {
    setTried(true)
    setSaveError(null)
    if (!customer) return
    try {
      const ctx = writeContext()
      const txn = draftToSale(draft, {
        customer: { mobile: customer.mobile, name: customer.name },
        prevDuePaisa: customer.totalDuePaisa,
        medicines,
        roundToTaka,
        meta: { memoNo: makeMemoNo('sale', ctx.now), deviceId: ctx.deviceId, createdAt: ctx.now, createdBy: ctx.uid },
      })
      saveTransaction(txn)
      for (const l of txn.lines) if (l.medicineId) void recordMedicineUsage(l.medicineId)
      setSaved(txn)
      resetDraft()
      setTried(false)
    } catch (e) {
      setSaveError(errorKey(e))
    }
  }

  // PC shortcuts: Ctrl+Enter saves, "/" or Ctrl+K jumps to medicine search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        save()
      } else if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !typing)) {
        e.preventDefault()
        document.getElementById(SEARCH_ID)?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!loaded) return <p className="mt-6 text-center text-slate-500">{t('app.loading')}</p>

  const shownError: MessageKey | null = saveError ?? (tried && ev.error ? (`error.${ev.error}` as MessageKey) : null)

  return (
    <section className="mx-auto max-w-5xl pb-20 md:pb-0">
      <div className="flex items-center gap-3">
        <h1 className="flex-1 text-2xl font-bold">{t('sale.title')}</h1>
        {(draft.lines.length > 0 || draft.amountText || draft.customerMobile) && (
          <Button
            variant="ghost"
            className="text-sm"
            onClick={() => window.confirm(t('sale.confirmStartOver')) && resetDraft()}
          >
            {t('sale.startOver')}
          </Button>
        )}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_360px] md:items-start">
        <div className="space-y-4">
          {/* Step 1: customer */}
          {customer ? (
            <Card className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold">{customer.name}</p>
                <p className="text-sm text-slate-500">{f.mobile(customer.mobile)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">{t('sale.prevDue')}</p>
                <DueText paisa={customer.totalDuePaisa} />
              </div>
              <Button variant="ghost" className="min-h-11 text-sm" onClick={() => patchDraft({ customerMobile: null })}>
                {t('sale.change')}
              </Button>
            </Card>
          ) : (
            <Card>
              <MobileLookup
                key={draft.customerMobile ?? 'none'}
                initialMobile={draft.customerMobile ?? paramMobile ?? ''}
                renderFound={(c) => (
                  <CustomerSummary customer={c}>
                    <Button className="mt-3 w-full text-lg" onClick={() => patchDraft({ customerMobile: c.mobile })}>
                      {t('sale.pickCustomer')}
                    </Button>
                  </CustomerSummary>
                )}
                onCreated={(mobile) => patchDraft({ customerMobile: mobile })}
              />
              {tried && !customer && <p className="mt-2 text-sm text-rose-600">{t('customer.mobileHint')}</p>}
            </Card>
          )}

          {/* Step 2: what was given */}
          <div className="flex overflow-hidden rounded-xl border border-slate-300 bg-white" role="radiogroup">
            {(['items', 'amount'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={draft.mode === mode}
                onClick={() => patchDraft({ mode })}
                className={`min-h-12 flex-1 font-semibold ${draft.mode === mode ? 'bg-teal-700 text-white' : 'text-slate-700'}`}
              >
                {t(mode === 'items' ? 'sale.modeItems' : 'sale.modeAmount')}
              </button>
            ))}
          </div>

          {draft.mode === 'items' ? (
            <Card>
              <MedicineSearch
                inputId={SEARCH_ID}
                autoFocus={Boolean(customer)}
                onSelect={(m) => addMedicineLine(m)}
                onAddNew={(name) => setAdding({ name })}
                onPickReference={(reference) => addMedicineLine(shopMedicineFor(reference))}
              />
              <button
                type="button"
                onClick={() => addFreeTextLine()}
                className="mt-2 flex min-h-11 items-center gap-1 text-sm font-medium text-teal-700"
              >
                <Icon name="plus" className="size-4" /> {t('sale.freeItem')}
              </button>
              {draft.lines.length === 0 ? (
                <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-4 text-center text-slate-500">
                  {t('sale.noLines')}
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-slate-100">
                  {draft.lines.map((line, i) => (
                    <SaleLineRow key={line.key} line={line} snapshot={ev.lines[i] ?? null} error={tried ? (ev.lineErrors[i] ?? null) : null} />
                  ))}
                </ul>
              )}
            </Card>
          ) : (
            <Card>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">{t('sale.amount')}</span>
                <span className="flex items-center gap-2">
                  <span className="text-2xl text-slate-500">৳</span>
                  <TextInput
                    inputMode="decimal"
                    autoFocus
                    value={draft.amountText}
                    onChange={(e) => patchDraft({ amountText: e.target.value })}
                    className="text-2xl font-semibold"
                  />
                </span>
              </label>
            </Card>
          )}
        </div>

        {/* Summary + save (sticky on PC) */}
        <Card className="md:sticky md:top-20">
          <BillSummary draft={draft} ev={ev} prevDuePaisa={customer?.totalDuePaisa ?? 0} />
          {shownError && (
            <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {t(shownError)}
            </p>
          )}
          <Button className="mt-3 hidden w-full text-lg md:flex" onClick={save}>
            {t('sale.save')} <span className="text-sm font-normal opacity-75">({t('sale.saveHint')})</span>
          </Button>
        </Card>
      </div>

      {/* Phone: total + save always in reach, above the bottom menu */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 flex items-center gap-3 border-t border-slate-200 bg-white px-4 py-2 md:hidden">
        <div className="flex-1">
          <p className="text-xs text-slate-500">{t('sale.net')}</p>
          <p className="text-xl font-bold tabular-nums">{ev.totals ? f.money(ev.totals.netPaisa) : '—'}</p>
        </div>
        <Button className="min-w-32 text-lg" onClick={save}>
          {t('sale.save')}
        </Button>
      </div>

      {adding && (
        <QuickAddMedicine
          initialName={adding.name}
          onClose={() => setAdding(null)}
          onAdded={(m) => {
            setAdding(null)
            addMedicineLine(m)
          }}
        />
      )}
      {saved && (
        <SavedSheet
          txn={saved}
          onAnother={() => {
            setSaved(null)
            document.getElementById(SEARCH_ID)?.focus()
          }}
          onClose={() => setSaved(null)}
        />
      )}
    </section>
  )
}
