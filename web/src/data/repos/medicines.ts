// Shop medicine master in Firestore (only medicines the shop sells). Never deleted — deactivate instead.
// Every write also returns the local version so the Dexie mirror and search update immediately, offline too.
import {
  doc,
  getDocs,
  getDocsFromServer,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  Timestamp,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type WriteBatch,
} from 'firebase/firestore'
import { cleanMedicineInput, shopPriceChanges, type MedicineInput, type ShopPriceField } from '../../domain/medicines'
import {
  SCHEMA_VERSION,
  type Medicine,
  type MedicineStatus,
  type Millis,
  type Paisa,
  type SourceName,
} from '../../domain/types'
import { medicineFromDoc, toMillis } from '../convert'
import { paths } from '../paths'
import { auditInBatch, commitInBackground, newBatch, writeContext, type WriteContext } from '../writer'

function logPriceChanges(
  batch: WriteBatch,
  medicineId: string,
  before: Pick<Medicine, ShopPriceField> | null,
  after: MedicineInput,
  ctx: WriteContext,
): void {
  for (const change of shopPriceChanges(before, after)) {
    batch.set(doc(paths.medicinePriceHistory()), {
      medicineId,
      ...change,
      reason: 'manual',
      importId: null,
      at: Timestamp.fromMillis(ctx.now),
      serverAt: serverTimestamp(),
      by: ctx.uid,
      deviceId: ctx.deviceId,
      schemaVersion: SCHEMA_VERSION,
    })
  }
}

/** Where a new medicine came from, when it was picked from a reference list (e.g. the MedEx file). */
export interface MedicineSourceInfo {
  sourceName: SourceName
  sourceId: string
  dosageText: string
  sourceUpdatedAt: Millis | null
  sourceFetchedAt: Millis | null
  lastImportId: string | null
}

const ts = (ms: Millis | null) => (ms === null ? null : Timestamp.fromMillis(ms))

export function createMedicine(raw: MedicineInput, source?: MedicineSourceInfo): Medicine {
  const input = cleanMedicineInput(raw)
  const ctx = writeContext()
  const ref = doc(paths.medicines())
  const local: Medicine = {
    id: ref.id,
    ...input,
    dosageText: source?.dosageText ?? input.dosageForm,
    sourceUnitPricePaisa: null,
    sourceStripPricePaisa: null,
    sourcePackPricePaisa: null,
    sourceName: source?.sourceName ?? 'manual',
    sourceId: source?.sourceId ?? null,
    sourceUpdatedAt: source?.sourceUpdatedAt ?? null,
    sourceFetchedAt: source?.sourceFetchedAt ?? null,
    lastImportId: source?.lastImportId ?? null,
    sourceStatus: 'listed',
    status: 'active',
    createdAt: ctx.now,
    createdBy: ctx.uid,
    updatedAt: ctx.now,
    schemaVersion: SCHEMA_VERSION,
  }
  const { id: _id, ...data } = local
  const batch = newBatch()
  batch.set(ref, {
    ...data,
    sourceUpdatedAt: ts(local.sourceUpdatedAt),
    sourceFetchedAt: ts(local.sourceFetchedAt),
    createdAt: Timestamp.fromMillis(ctx.now),
    updatedAt: serverTimestamp(),
  })
  logPriceChanges(batch, ref.id, null, input, ctx)
  auditInBatch(
    batch,
    { action: 'medicine.create', entity: 'medicine', entityId: ref.id, before: null, after: { ...input, sourceName: local.sourceName, sourceId: local.sourceId } },
    ctx,
  )
  commitInBackground(batch)
  return local
}

/** Owner edit. Source fields are left alone; shop price changes are logged. */
export function updateMedicine(before: Medicine, raw: MedicineInput): Medicine {
  const input = cleanMedicineInput(raw)
  const ctx = writeContext()
  const batch = newBatch()
  batch.update(paths.medicine(before.id), { ...input, updatedAt: serverTimestamp() })
  logPriceChanges(batch, before.id, before, input, ctx)
  auditInBatch(batch, { action: 'medicine.update', entity: 'medicine', entityId: before.id, before, after: input }, ctx)
  commitInBackground(batch)
  return { ...before, ...input, updatedAt: ctx.now }
}

export function setMedicineStatus(before: Medicine, status: MedicineStatus): Medicine {
  const ctx = writeContext()
  const batch = newBatch()
  batch.update(paths.medicine(before.id), { status, updatedAt: serverTimestamp() })
  auditInBatch(
    batch,
    { action: 'medicine.status', entity: 'medicine', entityId: before.id, before: { status: before.status }, after: { status } },
    ctx,
  )
  commitInBackground(batch)
  return { ...before, status, updatedAt: ctx.now }
}

export interface MedicinePage {
  medicines: Medicine[]
  last: QueryDocumentSnapshot<DocumentData> | null
}

/** One page of medicines changed since `start` (server only — throws when offline). */
export async function fetchChangedMedicines(
  start: Millis,
  after: QueryDocumentSnapshot<DocumentData> | null,
  pageSize: number,
): Promise<MedicinePage> {
  const q = query(
    paths.medicines(),
    where('updatedAt', '>=', Timestamp.fromMillis(start)),
    orderBy('updatedAt'),
    ...(after ? [startAfter(after)] : []),
    limit(pageSize),
  )
  const snap = await getDocsFromServer(q)
  return {
    medicines: snap.docs.map((d) => medicineFromDoc(d.id, d.data())),
    last: snap.docs.at(-1) ?? null,
  }
}

export interface PriceHistoryRow {
  id: string
  field: ShopPriceField | string
  oldPaisa: Paisa | null
  newPaisa: Paisa | null
  reason: string
  at: Millis | null
}

export async function fetchPriceHistory(medicineId: string): Promise<PriceHistoryRow[]> {
  const snap = await getDocs(
    query(paths.medicinePriceHistory(), where('medicineId', '==', medicineId), orderBy('at', 'desc'), limit(30)),
  )
  return snap.docs.map((d) => {
    const x = d.data()
    return {
      id: d.id,
      field: String(x.field),
      oldPaisa: typeof x.oldPaisa === 'number' ? x.oldPaisa : null,
      newPaisa: typeof x.newPaisa === 'number' ? x.newPaisa : null,
      reason: String(x.reason ?? ''),
      at: toMillis(x.at),
    }
  })
}
