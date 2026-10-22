// Apply a reviewed medicine-file plan (ARCHITECTURE §6): new rows become shop medicines with source prices,
// changed rows get their source fields updated + price history. Shop prices, status and bills are never touched.
import { doc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { newMedicineFields, type ImportField, type PlanItem } from '../../domain/medicineCsv'
import { SCHEMA_VERSION, type Medicine } from '../../domain/types'
import { paths } from '../paths'
import { auditInBatch, commitInBackground, newBatch, writeContext } from '../writer'

const PRICE_FIELDS = new Set<ImportField>(['sourceUnitPricePaisa', 'sourceStripPricePaisa', 'sourcePackPricePaisa'])
const TIME_FIELDS = new Set<ImportField>(['sourceUpdatedAt'])
const MAX_OPS = 400

export interface ImportFileInfo {
  fileName: string
  fileSha256: string
  counts: { new: number; changed: number; unchanged: number; errors: number }
}

/** Returns the local versions of every written medicine, so search updates at once (offline too). */
export function applyMedicineImport(items: readonly PlanItem[], file: ImportFileInfo): Medicine[] {
  const ctx = writeContext()
  const importRef = doc(paths.medicineImports())
  const importId = importRef.id
  const fetchedAt = Timestamp.fromMillis(ctx.now)
  const local: Medicine[] = []
  let batch = newBatch()
  let ops = 0
  const flush = () => {
    if (ops) commitInBackground(batch)
    batch = newBatch()
    ops = 0
  }
  const room = (n: number) => {
    if (ops + n > MAX_OPS) flush()
    ops += n
  }

  for (const item of items) {
    if (item.kind === 'new') {
      room(1)
      const ref = doc(paths.medicines())
      const fields = newMedicineFields(item.record)
      const m: Medicine = {
        id: ref.id,
        ...fields,
        shopUnitPricePaisa: null,
        shopStripPricePaisa: null,
        shopPackPricePaisa: null,
        sourceName: 'csv',
        sourceId: null,
        sourceFetchedAt: ctx.now,
        lastImportId: importId,
        sourceStatus: 'listed',
        status: 'active',
        createdAt: ctx.now,
        createdBy: ctx.uid,
        updatedAt: ctx.now,
        schemaVersion: SCHEMA_VERSION,
      }
      const { id: _id, ...data } = m
      batch.set(ref, {
        ...data,
        sourceUpdatedAt: m.sourceUpdatedAt === null ? null : Timestamp.fromMillis(m.sourceUpdatedAt),
        sourceFetchedAt: fetchedAt,
        createdAt: fetchedAt,
        updatedAt: serverTimestamp(),
      })
      local.push(m)
    } else if (item.kind === 'changed' && item.medicine) {
      const priceChanges = item.changes.filter((c) => PRICE_FIELDS.has(c.field))
      room(1 + priceChanges.length)
      const patch: Record<string, unknown> = {}
      for (const c of item.changes) {
        patch[c.field] = TIME_FIELDS.has(c.field) && typeof c.after === 'number' ? Timestamp.fromMillis(c.after) : c.after
      }
      batch.update(paths.medicine(item.medicine.id), {
        ...patch,
        sourceName: 'csv',
        sourceFetchedAt: fetchedAt,
        lastImportId: importId,
        sourceStatus: 'listed',
        updatedAt: serverTimestamp(),
      })
      for (const c of priceChanges) {
        batch.set(doc(paths.medicinePriceHistory()), {
          medicineId: item.medicine.id,
          field: c.field,
          oldPaisa: c.before,
          newPaisa: c.after,
          reason: 'import',
          importId,
          at: fetchedAt,
          serverAt: serverTimestamp(),
          by: ctx.uid,
          deviceId: ctx.deviceId,
          schemaVersion: SCHEMA_VERSION,
        })
      }
      local.push({
        ...item.medicine,
        ...(Object.fromEntries(item.changes.map((c) => [c.field, c.after])) as Partial<Medicine>),
        sourceName: 'csv',
        sourceFetchedAt: ctx.now,
        lastImportId: importId,
        sourceStatus: 'listed',
        updatedAt: ctx.now,
      })
    }
  }

  room(2)
  batch.set(importRef, {
    sourceName: 'csv',
    fileName: file.fileName,
    fileSha256: file.fileSha256,
    counts: file.counts,
    status: 'applied',
    startedAt: fetchedAt,
    appliedAt: serverTimestamp(),
    by: ctx.uid,
    schemaVersion: SCHEMA_VERSION,
  })
  auditInBatch(
    batch,
    { action: 'medicine.import', entity: 'medicineImport', entityId: importId, before: null, after: { fileName: file.fileName, ...file.counts } },
    ctx,
  )
  flush()
  return local
}
