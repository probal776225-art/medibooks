// Every Firestore path in one place (ARCHITECTURE §3). v1 has one shop: "main".
import { collection, doc } from 'firebase/firestore'
import { db } from './firebase'

export const SHOP_ID = 'main'
const SHOP = `shops/${SHOP_ID}`

export const paths = {
  settings: () => doc(db, SHOP, 'settings', 'general'),
  customers: () => collection(db, SHOP, 'customers'),
  customer: (mobile: string) => doc(db, SHOP, 'customers', mobile),
  transactions: () => collection(db, SHOP, 'transactions'),
  medicines: () => collection(db, SHOP, 'medicines'),
  medicine: (id: string) => doc(db, SHOP, 'medicines', id),
  medicinePriceHistory: () => collection(db, SHOP, 'medicinePriceHistory'),
  medicineImports: () => collection(db, SHOP, 'medicineImports'),
  refMeta: (source: string) => doc(db, SHOP, 'refCatalog', source),
  refChunk: (source: string, chunkId: string) => doc(db, SHOP, 'refCatalog', source, 'chunks', chunkId),
  auditLog: () => collection(db, SHOP, 'auditLog'),
  smsQueue: () => collection(db, SHOP, 'smsQueue'),
  smsItem: (id: string) => doc(db, SHOP, 'smsQueue', id),
  prescriptions: () => collection(db, SHOP, 'prescriptions'),
  prescription: (id: string) => doc(db, SHOP, 'prescriptions', id),
  prescriptionImage: (id: string) => doc(db, SHOP, 'prescriptionImages', id),
  usageStats: () => doc(db, SHOP, 'stats', 'usage'),
  /** Any top-level shop collection by name (backup export / restore). */
  shopCollection: (name: string) => collection(db, SHOP, name),
  /** Progress of a restore, so one that stopped half-way can continue. */
  restoreMarker: () => doc(db, SHOP, 'settings', 'restore'),
}
