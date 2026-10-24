import { useState } from 'react'
import { editMedicine, useCatalogStore } from '../../catalog/store'
import { useIsOwner } from '../../stores/role'
import { Icon } from '../../components/Icon'
import { TextInput } from '../../components/ui'
import { medicineToInput, type ShopPriceField } from '../../domain/medicines'
import { parseMoney } from '../../domain/money'
import { medicineDisplayName, sellableUnits } from '../../domain/pricing'
import { defaultPriceText, type DraftLine } from '../../domain/saleDraft'
import type { DomainErrorCode } from '../../domain/errors'
import type { SaleLine, SaleUnit } from '../../domain/types'
import { useT, type MessageKey } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { useToastStore } from '../../stores/toast'
import { patchLine, removeLine } from './saleStore'

const PRICE_FIELD: Record<Exclude<SaleUnit, 'custom'>, ShopPriceField> = {
  piece: 'shopUnitPricePaisa',
  strip: 'shopStripPricePaisa',
  pack: 'shopPackPricePaisa',
}

export function SaleLineRow({
  line,
  snapshot,
  error,
}: {
  line: DraftLine
  snapshot: SaleLine | null
  error: DomainErrorCode | null
}) {
  const t = useT()
  const f = useFormat()
  const m = useCatalogStore((s) => (line.medicineId ? s.byId.get(line.medicineId) : undefined))
  const showToast = useToastStore((s) => s.show)
  const [showDiscount, setShowDiscount] = useState(line.discountText !== '')

  const units: { unit: SaleUnit; label: string }[] = m
    ? [
        ...sellableUnits(m).map((u) => ({
          unit: u.unit as SaleUnit,
          label:
            u.unit === 'piece'
              ? t('sale.unitPiece')
              : t(u.unit === 'strip' ? 'sale.unitStrip' : 'sale.unitPack', { n: u.piecesPerUnit }),
        })),
        { unit: 'custom', label: t('sale.unitCustom') },
      ]
    : []

  function setUnit(unit: SaleUnit) {
    patchLine(line.key, { unit, priceText: defaultPriceText(m ?? null, unit) })
  }

  function setQty(qty: number) {
    if (Number.isInteger(qty) && qty >= 1 && qty <= 100_000) patchLine(line.key, { qty })
  }

  // Offer to keep an edited price as the shop's own price for this unit (logged in price history).
  const isOwner = useIsOwner()
  const canSavePrice = isOwner && m && snapshot?.priceOverridden && line.unit !== 'custom'
  function savePrice() {
    if (!m || line.unit === 'custom') return
    const price = parseMoney(line.priceText)
    if (price === null) return
    editMedicine(m, { ...medicineToInput(m), [PRICE_FIELD[line.unit]]: price })
    showToast('success', 'sale.priceSaved')
  }

  return (
    <li className="py-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {m ? (
            <p className="font-semibold">{medicineDisplayName(m)}</p>
          ) : (
            <TextInput
              aria-label={t('sale.itemName')}
              placeholder={t('sale.itemName')}
              value={line.name}
              onChange={(e) => patchLine(line.key, { name: e.target.value })}
              className="min-h-11 font-semibold"
            />
          )}
          {m && <p className="truncate text-sm text-slate-500">{[m.genericName, m.manufacturer].filter(Boolean).join(' · ')}</p>}
        </div>
        <button
          type="button"
          aria-label={t('sale.remove')}
          onClick={() => removeLine(line.key)}
          className="flex size-11 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
        >
          <Icon name="plus" className="size-5 rotate-45" />
        </button>
      </div>

      {units.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup">
          {units.map((u) => (
            <button
              key={u.unit}
              type="button"
              role="radio"
              aria-checked={line.unit === u.unit}
              onClick={() => setUnit(u.unit)}
              className={`min-h-10 rounded-lg border px-3 text-sm font-medium ${
                line.unit === u.unit ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-700'
              }`}
            >
              {u.label}
            </button>
          ))}
        </div>
      )}

      {line.unit === 'custom' && (
        <TextInput
          aria-label={t('sale.customLabel')}
          placeholder={t('sale.customLabel')}
          value={line.customLabel}
          onChange={(e) => patchLine(line.key, { customLabel: e.target.value })}
          className="mt-2 min-h-11"
        />
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-xl border border-slate-300 bg-white">
          <button type="button" aria-label="−" onClick={() => setQty(line.qty - 1)} className="size-11 text-xl text-slate-600">
            −
          </button>
          <input
            aria-label={t('sale.qty')}
            inputMode="numeric"
            value={line.qty}
            onChange={(e) => setQty(Number(e.target.value.replace(/\D/g, '') || '0'))}
            className="h-11 w-12 bg-transparent text-center text-lg font-semibold outline-none"
          />
          <button type="button" aria-label="+" onClick={() => setQty(line.qty + 1)} className="size-11 text-xl text-slate-600">
            +
          </button>
        </div>
        <span className="text-slate-400">×</span>
        <label className="flex items-center gap-1">
          <span className="text-slate-500">৳</span>
          <input
            aria-label={t('sale.price')}
            inputMode="decimal"
            value={line.priceText}
            onChange={(e) => patchLine(line.key, { priceText: e.target.value })}
            className="h-11 w-24 rounded-xl border border-slate-300 bg-white px-2 text-right text-lg outline-none focus:border-teal-600"
          />
        </label>
        <span className="ml-auto text-lg font-bold tabular-nums">
          {snapshot ? f.money(snapshot.lineTotalPaisa) : '—'}
        </span>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {showDiscount ? (
          <label className="flex items-center gap-1">
            <span className="text-slate-500">{t('sale.lineDiscount')} ৳</span>
            <input
              aria-label={t('sale.lineDiscount')}
              inputMode="decimal"
              value={line.discountText}
              onChange={(e) => patchLine(line.key, { discountText: e.target.value })}
              className="h-9 w-20 rounded-lg border border-slate-300 px-2 text-right outline-none focus:border-teal-600"
            />
          </label>
        ) : (
          <button type="button" onClick={() => setShowDiscount(true)} className="min-h-9 text-teal-700">
            {t('sale.addDiscount')}
          </button>
        )}
        {snapshot?.priceOverridden && snapshot.listUnitPricePaisa !== null && (
          <span className="text-slate-500">{t('sale.listPrice', { price: f.money(snapshot.listUnitPricePaisa) })}</span>
        )}
        {canSavePrice && (
          <button type="button" onClick={savePrice} className="min-h-9 font-medium text-teal-700 underline">
            {t('sale.savePrice')}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-rose-600">{t(`error.${error}` as MessageKey)}</p>}
    </li>
  )
}
