import { medicineDisplayName, sellableUnits } from '../../domain/pricing'
import type { Medicine } from '../../domain/types'
import { useT } from '../../i18n'
import { useFormat } from '../../i18n/format'

/** SPEC 4A result line: name · generic · company · ৳1.20/পিস · ১০ পিস/স্ট্রিপ */
export function MedicineLine({ medicine: m }: { medicine: Medicine }) {
  const t = useT()
  const f = useFormat()
  const piece = sellableUnits(m)[0]
  return (
    <span className="flex min-w-0 flex-1 items-center gap-3">
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">
          {medicineDisplayName(m)}
          {m.status === 'inactive' && (
            <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-xs font-medium text-slate-600">
              {t('med.inactiveLabel')}
            </span>
          )}
        </span>
        <span className="block truncate text-sm text-slate-500">
          {[m.genericName, m.manufacturer].filter(Boolean).join(' · ')}
        </span>
      </span>
      <span className="shrink-0 text-right text-sm">
        <span className="block font-semibold tabular-nums">
          {piece?.pricePaisa != null ? `${f.money(piece.pricePaisa)}/${t('med.piece')}` : t('med.noPrice')}
        </span>
        {m.piecesPerStrip && <span className="block text-slate-500">{t('med.perStrip', { n: m.piecesPerStrip })}</span>}
      </span>
    </span>
  )
}
