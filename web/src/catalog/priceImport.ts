// MedEx price file → (1) prices on the reference list (a new version, uploaded like the brand list) and
// (2) source prices on the shop medicines that are the same brand. Shop prices, status and bills never change.
import { applyMedicineImport } from '../data/repos/medicineImport'
import { fetchRefMeta, uploadRefCatalog, type RefCatalogMeta } from '../data/repos/refCatalog'
import { localDb } from '../data/localdb'
import type { PlanItem } from '../domain/medicineCsv'
import { readCsv } from '../lib/files'
import {
  isMedexPriceCsv,
  mergeRefPrices,
  parseMedexPriceCsv,
  planMedexShopUpdates,
  type MedexPriceParse,
  type RefMerge,
} from './import/medexPrices'
import { refUrl } from './import/medexRef'
import { packRefCatalog, sha256Hex } from './import/refPack'
import { refreshRefCatalog, saveLocal, useRefStore } from './refStore'
import { upsertLocalMany, useCatalogStore } from './store'

export class PriceFileError extends Error {
  readonly reason: 'notMedex' | 'empty'
  constructor(reason: PriceFileError['reason']) {
    super(`Price file: ${reason}`)
    this.reason = reason
  }
}

export interface PriceImportPreview {
  file: File
  sha256: string
  parsed: MedexPriceParse
  merge: RefMerge
  /** Shop medicines the file prices ('changed' ones get written). */
  shop: PlanItem[]
  /** The reference list already has this exact file. */
  sameAsCurrent: boolean
  /** Brands in the whole reference list (after the merge). */
  listCount: number
}

/** Read the CSV in the browser (nothing is written yet) and show what it would change. */
export async function previewPriceFile(file: File): Promise<PriceImportPreview> {
  const [records, buf] = await Promise.all([readCsv(file), file.arrayBuffer()])
  if (!isMedexPriceCsv(records)) throw new PriceFileError('notMedex')
  const parsed = parseMedexPriceCsv(records)
  if (parsed.rows.length === 0) throw new PriceFileError('empty')
  // Merge onto the newest list (another device may have uploaded one); offline, this device's copy is used.
  await refreshRefCatalog().catch(() => undefined)
  const sha256 = await sha256Hex(buf)
  const merge = mergeRefPrices(await localDb.refCatalog.toArray(), parsed.rows)
  return {
    file,
    sha256,
    parsed,
    merge,
    shop: planMedexShopUpdates(parsed.rows, useCatalogStore.getState().medicines, refUrl),
    sameAsCurrent: useRefStore.getState().meta?.priceFile?.fileSha256 === sha256,
    listCount: merge.items.length,
  }
}

export async function confirmPriceImport(
  preview: PriceImportPreview,
  permissionConfirmed: boolean,
): Promise<{ meta: RefCatalogMeta; shopUpdated: number }> {
  const previous = await fetchRefMeta().catch(() => useRefStore.getState().meta)
  const { items, priced } = preview.merge
  const version = (await sha256Hex(new TextEncoder().encode(`${previous?.version ?? ''}:${preview.sha256}`).buffer)).slice(0, 16)
  const meta = uploadRefCatalog(
    packRefCatalog(items),
    {
      version,
      // The brand list file stays the same; the price file is recorded next to it.
      fileName: previous?.fileName ?? preview.file.name,
      fileSha256: previous?.fileSha256 ?? '',
      fileDate: previous?.fileDate ?? null,
      count: items.length,
      herbalCount: items.filter((r) => r.herbal).length,
      permissionConfirmed,
      priceFile: { fileName: preview.file.name, fileSha256: preview.sha256, rows: preview.parsed.rows.length, importedAt: Date.now() },
      pricedCount: priced,
    },
    previous,
  )
  await saveLocal(items, meta)

  const changed = preview.shop.filter((i) => i.kind === 'changed')
  if (changed.length) {
    upsertLocalMany(
      applyMedicineImport(changed, {
        sourceName: 'medex',
        fileName: preview.file.name,
        fileSha256: preview.sha256,
        counts: {
          new: 0,
          changed: changed.length,
          unchanged: preview.shop.length - changed.length,
          errors: preview.parsed.skipped,
        },
      }),
    )
  }
  return { meta, shopUpdated: changed.length }
}
