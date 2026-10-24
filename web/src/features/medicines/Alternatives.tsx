// "একই জেনেরিক" — other brands of the same generic (shop list + MedEx list), all on this device, so offline too.
import { useEffect, useMemo } from 'react'
import { ensureIndex, useRefStore } from '../../catalog/refStore'
import { useCatalogStore } from '../../catalog/store'
import { findAlternatives, genericKey, type AltItem, type AltTarget } from '../../domain/alternatives'
import { medicineDisplayName } from '../../domain/pricing'
import { useT } from '../../i18n'
import { useFormat } from '../../i18n/format'

export function useAlternatives(target: AltTarget | null) {
  const medicines = useCatalogStore((s) => s.medicines)
  const { byGeneric, meta, index } = useRefStore()
  useEffect(() => {
    if (meta && !index) void ensureIndex()
  }, [meta, index])
  const loading = meta !== null && index === null
  const result = useMemo(
    () => (target ? findAlternatives(target, medicines, byGeneric.get(genericKey(target.genericName)) ?? []) : { same: [], other: [] }),
    [target, medicines, byGeneric],
  )
  return { ...result, loading }
}

function Row({ item, onPick }: { item: AltItem; onPick: (x: AltItem) => void }) {
  const t = useT()
  const f = useFormat()
  return (
    <li>
      <button type="button" onClick={() => onPick(item)} className="flex min-h-14 w-full items-center gap-3 px-1 py-2 text-left hover:bg-slate-50">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">
            {medicineDisplayName(item)}
            {item.kind === 'ref' && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">MedEx</span>}
          </span>
          <span className="block truncate text-sm text-slate-500">{item.manufacturer}</span>
        </span>
        <span className="shrink-0 text-sm font-semibold tabular-nums">
          {item.piecePricePaisa !== null ? `${f.money(item.piecePricePaisa)}/${t('med.piece')}` : t('med.noPrice')}
        </span>
      </button>
    </li>
  )
}

/** The two groups (direct swaps, other strengths/forms); `onPick` opens or swaps in the chosen one. */
export function AlternativesList({ target, onPick }: { target: AltTarget; onPick: (x: AltItem) => void }) {
  const t = useT()
  const { same, other, loading } = useAlternatives(target)
  if (!target.genericName.trim()) return <p className="text-sm text-slate-500">{t('alt.noGeneric')}</p>
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-slate-700">{t('alt.same', { generic: target.genericName, strength: target.strength })}</p>
        {same.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {same.map((x) => (
              <Row key={`${x.kind}-${x.id}`} item={x} onPick={onPick} />
            ))}
          </ul>
        ) : (
          <p className="py-2 text-sm text-slate-500">{loading ? t('ref.loading') : t('alt.none')}</p>
        )}
      </div>
      {other.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-slate-700">{t('alt.other')}</p>
          <ul className="divide-y divide-slate-100">
            {other.map((x) => (
              <Row key={`${x.kind}-${x.id}`} item={x} onPick={onPick} />
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-slate-500">{t('alt.note')}</p>
    </div>
  )
}
