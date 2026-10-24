import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { medicinePath, ROUTES } from '../../app/routes'
import { refUrl, type RefMedicine } from '../../catalog/import/medexRef'
import { ensureIndex, useRefStore } from '../../catalog/refStore'
import { changeMedicineStatus, editMedicine, shopMedicineFor, useCatalogStore } from '../../catalog/store'
import { Icon } from '../../components/Icon'
import { Button, buttonClass, Card } from '../../components/ui'
import { fetchPriceHistory, type PriceHistoryRow } from '../../data/repos/medicines'
import { isRefMedicineId, REF_MEDICINE_PREFIX, refAsMedicine } from '../../domain/alternatives'
import { hasPriceOverride, withoutOverrides } from '../../domain/medicines'
import { medicineDisplayName, sellableUnits, type UnitOption } from '../../domain/pricing'
import type { Medicine } from '../../domain/types'
import { useT, type MessageKey } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { useIsOwner } from '../../stores/role'
import { useToastStore } from '../../stores/toast'
import { AlternativesList } from './Alternatives'
import { MedicineForm } from './MedicineForm'

function unitLabel(t: ReturnType<typeof useT>, u: UnitOption): string {
  if (u.unit === 'piece') return t('med.piece')
  return `${t(u.unit === 'strip' ? 'med.strip' : 'med.pack')} (${u.piecesPerUnit})`
}

/** Where the price for a unit comes from: owner override, the source file, or piece price × pieces. */
function priceOrigin(m: Medicine, u: UnitOption): 'shop' | 'source' | 'derived' | null {
  if (u.pricePaisa === null) return null
  const shop = { piece: m.shopUnitPricePaisa, strip: m.shopStripPricePaisa, pack: m.shopPackPricePaisa }[u.unit]
  const source = { piece: m.sourceUnitPricePaisa, strip: m.sourceStripPricePaisa, pack: m.sourcePackPricePaisa }[u.unit]
  if (shop !== null) return 'shop'
  if (source !== null) return 'source'
  return 'derived'
}

function PriceHistory({ medicineId, version }: { medicineId: string; version: number | null }) {
  const t = useT()
  const f = useFormat()
  const [rows, setRows] = useState<PriceHistoryRow[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    fetchPriceHistory(medicineId)
      .then((r) => alive && setRows(r))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [medicineId, version])

  return (
    <Card>
      <h2 className="font-semibold">{t('med.history')}</h2>
      {failed ? (
        <p className="mt-1 text-slate-500">{t('med.historyFailed')}</p>
      ) : rows === null ? (
        <p className="mt-1 text-slate-500">{t('app.loading')}</p>
      ) : rows.length === 0 ? (
        <p className="mt-1 text-slate-500">{t('med.historyEmpty')}</p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100 text-[15px]">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap gap-x-3 py-2">
              <span className="text-slate-500">{r.at ? f.dateTime(r.at) : ''}</span>
              <span className="font-medium">{t(`med.field.${r.field}` as MessageKey)}</span>
              <span className="tabular-nums">
                {r.oldPaisa === null ? '—' : f.money(r.oldPaisa)} → {r.newPaisa === null ? '—' : f.money(r.newPaisa)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export function MedicineDetailPage() {
  const { id = '' } = useParams()
  return isRefMedicineId(id) ? <RefMedicinePage medexId={id.slice(REF_MEDICINE_PREFIX.length)} /> : <ShopMedicinePage id={id} />
}

function NotFound({ loading }: { loading: boolean }) {
  const t = useT()
  return (
    <section className="mx-auto max-w-xl">
      <p className="mt-6 text-center text-slate-500">{loading ? t('app.loading') : t('med.notExist')}</p>
      <Link to={ROUTES.medicines} className={buttonClass('ghost', 'mt-4 w-full')}>
        {t('med.back')}
      </Link>
    </section>
  )
}

function ShopMedicinePage({ id }: { id: string }) {
  const m = useCatalogStore((s) => s.byId.get(id))
  const status = useCatalogStore((s) => s.status)
  return m ? <MedicineView m={m} /> : <NotFound loading={status !== 'ready'} />
}

/** A MedEx list row the shop has not used yet: shown like a shop medicine; selling or editing it adds it. */
function RefMedicinePage({ medexId }: { medexId: string }) {
  const shop = useCatalogStore((s) => s.medicines.find((x) => x.sourceName === 'medex' && x.sourceId === medexId))
  const { byId, meta, index } = useRefStore()
  useEffect(() => {
    if (meta && !index) void ensureIndex()
  }, [meta, index])
  const r = byId.get(medexId)
  const v = useMemo(() => (r ? refAsMedicine(r, refUrl(r), Date.now()) : null), [r])
  if (shop) return <Navigate to={medicinePath(shop.id)} replace />
  return v && r ? <MedicineView m={v} refRow={r} /> : <NotFound loading={meta !== null && index === null} />
}

function MedicineView({ m, refRow }: { m: Medicine; refRow?: RefMedicine }) {
  const t = useT()
  const f = useFormat()
  const navigate = useNavigate()
  const showToast = useToastStore((s) => s.show)
  const [editing, setEditing] = useState(false)
  const isOwner = useIsOwner()
  const target = useMemo(
    () => ({ id: m.id, medexId: m.sourceName === 'medex' ? m.sourceId : null, genericName: m.genericName, strength: m.strength, dosageForm: m.dosageForm }),
    [m],
  )

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <Link to={ROUTES.medicines} className="inline-flex min-h-11 items-center gap-1 text-slate-600">
        <Icon name="chevron" className="size-4 rotate-180" /> {t('med.back')}
      </Link>

      {editing ? (
        <Card>
          <h1 className="mb-3 text-lg font-semibold">{medicineDisplayName(m)}</h1>
          <MedicineForm
            initial={m}
            submitLabel={t('customer.save')}
            onSubmit={(input) => {
              if (refRow) {
                // Editing a MedEx row saves it as a shop medicine with the owner's changes.
                const saved = shopMedicineFor(refRow, input)
                showToast('success', 'med.saved')
                navigate(medicinePath(saved.id), { replace: true })
                return
              }
              editMedicine(m, input)
              setEditing(false)
              showToast('success', 'med.saved')
            }}
            onCancel={() => setEditing(false)}
          />
        </Card>
      ) : (
        <Card>
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold">{medicineDisplayName(m)}</h1>
              {m.genericName && <p className="text-slate-700">{m.genericName}</p>}
              {m.manufacturer && <p className="text-slate-500">{m.manufacturer}</p>}
              {m.packDescription && <p className="text-sm text-slate-500">{m.packDescription}</p>}
            </div>
            {refRow ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">{t('alt.medexList')}</span>
            ) : (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  m.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {m.status === 'active' ? t('med.activeLabel') : t('med.inactiveLabel')}
              </span>
            )}
          </div>

          <h2 className="mt-4 text-sm font-semibold text-slate-500">{t('med.prices')}</h2>
          <ul className="mt-1 divide-y divide-slate-100">
            {sellableUnits(m).map((u) => {
              const origin = priceOrigin(m, u)
              return (
                <li key={u.unit} className="flex min-h-11 items-center gap-3">
                  <span className="flex-1">{unitLabel(t, u)}</span>
                  {origin === 'shop' && <span className="text-xs text-teal-700">{t('med.shopPrice')}</span>}
                  {origin === 'derived' && <span className="text-xs text-slate-400">{t('med.derived')}</span>}
                  <span className="text-lg font-semibold tabular-nums">
                    {u.pricePaisa === null ? t('med.noPrice') : f.money(u.pricePaisa)}
                  </span>
                </li>
              )
            })}
          </ul>

          <p className="mt-3 text-sm text-slate-500">
            {refRow ? t('alt.medexNote') : t('med.source')}
            {!refRow && `: ${t(`med.source.${m.sourceName}` as MessageKey)}`}
            {m.sourceFetchedAt ? ` · ${f.date(m.sourceFetchedAt)}` : ''}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {isOwner && (
              <Button variant="outline" onClick={() => setEditing(true)}>
                {t('customer.edit')}
              </Button>
            )}
            {isOwner && !refRow && hasPriceOverride(m) && (
              <Button
                variant="ghost"
                className="border border-slate-200"
                onClick={() => {
                  editMedicine(m, withoutOverrides(m))
                  showToast('info', 'med.overrideCleared')
                }}
              >
                {t('med.clearOverride')}
              </Button>
            )}
            {m.sourceUrl && (
              <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className={buttonClass('ghost', 'border border-slate-200')}>
                {t('med.openLink')} ↗
              </a>
            )}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="mb-2 font-semibold">{t('alt.title')}</h2>
        <AlternativesList
          target={target}
          onPick={(x) => navigate(medicinePath(x.kind === 'shop' ? x.id : `${REF_MEDICINE_PREFIX}${x.id}`))}
        />
      </Card>

      {!refRow && <PriceHistory medicineId={m.id} version={m.updatedAt} />}

      {isOwner && !refRow && (
        <Button
          variant="ghost"
          className="w-full border border-slate-200"
          onClick={() => changeMedicineStatus(m, m.status === 'active' ? 'inactive' : 'active')}
        >
          {m.status === 'active' ? t('med.deactivate') : t('med.activate')}
        </Button>
      )}
    </section>
  )
}
