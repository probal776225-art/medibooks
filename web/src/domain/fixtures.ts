// Test fixtures shared by domain tests.
import { SCHEMA_VERSION, type Customer, type Medicine } from './types'

export function makeMedicine(overrides: Partial<Medicine> = {}): Medicine {
  return {
    id: 'med-napa',
    brandName: 'Napa',
    genericName: 'Paracetamol',
    strength: '500 mg',
    dosageForm: 'Tablet',
    manufacturer: 'Beximco Pharmaceuticals Ltd.',
    dosageText: 'Tablet',
    packDescription: '50 x 10',
    piecesPerStrip: 10,
    piecesPerPack: 500,
    sourceUnitPricePaisa: 120,
    sourceStripPricePaisa: null,
    sourcePackPricePaisa: null,
    shopUnitPricePaisa: null,
    shopStripPricePaisa: null,
    shopPackPricePaisa: null,
    sourceName: 'manual',
    sourceId: null,
    sourceUrl: null,
    sourceUpdatedAt: null,
    sourceFetchedAt: null,
    lastImportId: null,
    sourceStatus: 'listed',
    status: 'active',
    createdAt: 0,
    createdBy: 'owner',
    updatedAt: null,
    schemaVersion: SCHEMA_VERSION,
    ...overrides,
  }
}

export function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    mobile: '01711000000',
    name: 'Name',
    address: '',
    note: '',
    totalDuePaisa: 0,
    smsEnabled: true,
    reminderEnabled: true,
    archived: false,
    lastTxnAt: null,
    lastPaymentAt: null,
    lastReminderAt: null,
    reminderMonth: null,
    reminderCountThisMonth: 0,
    movedTo: null,
    createdAt: Date.UTC(2026, 9, 1),
    createdBy: 'owner',
    updatedAt: null,
    schemaVersion: SCHEMA_VERSION,
    ...overrides,
  }
}
