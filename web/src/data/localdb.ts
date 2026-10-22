// Device-local IndexedDB (Dexie), never synced (ARCHITECTURE §3.2).
// Firestore's own cache is separate; this one exists so medicine search works offline without re-reading Firestore.
import { Dexie, type Table } from 'dexie'
import type { RefMedicine } from '../catalog/import/medexRef'
import type { SaleDraft } from '../domain/saleDraft'
import type { Medicine, Millis } from '../domain/types'
import type { RefCatalogMeta } from './repos/refCatalog'

export type MetaRow =
  | { key: 'medicinesSyncCursor'; value: Millis | null }
  | { key: 'refCatalogMeta'; value: RefCatalogMeta | null }

/** Unsaved work kept on the device so nothing is lost if the app closes. */
export interface DraftRow {
  key: 'sale'
  draft: SaleDraft
  savedAt: Millis
}

export interface UsageRow {
  medicineId: string
  count: number
  lastUsedAt: Millis
}

class LocalDb extends Dexie {
  medicines!: Table<Medicine, string>
  meta!: Table<MetaRow, MetaRow['key']>
  medicineUsage!: Table<UsageRow, string>
  /** Reference list (MedEx file) — read-only lookup, no prices. */
  refCatalog!: Table<RefMedicine, string>
  drafts!: Table<DraftRow, DraftRow['key']>

  constructor(name: string) {
    super(name)
    this.version(1).stores({
      medicines: 'id, status, updatedAt',
      meta: 'key',
      medicineUsage: 'medicineId',
    })
    this.version(2).stores({ refCatalog: 'id' })
    this.version(3).stores({ drafts: 'key' })
  }
}

/** One local DB per Firebase project, so emulator test data never mixes with the real shop's. */
export const localDb = new LocalDb(`baki-local-${import.meta.env.VITE_FIREBASE_PROJECT_ID}`)
