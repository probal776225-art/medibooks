// Security rules tests. Run from the project root: `npm run test:rules` (starts the Firestore emulator).
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  Bytes,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

const OWNER = 'REPLACE_WITH_OWNER_UID'
const SHOP = 'shops/main'
const MOBILE = '01711460114'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-baki',
    firestore: { rules: readFileSync(new URL('../../../firestore.rules', import.meta.url), 'utf8') },
  })
})

afterAll(async () => {
  await env.cleanup()
})

beforeEach(async () => {
  await env.clearFirestore()
})

const owner = () => env.authenticatedContext(OWNER).firestore()
const stranger = () => env.authenticatedContext('someone-else').firestore()
const anon = () => env.unauthenticatedContext().firestore()

function customer(mobile = MOBILE) {
  return { mobile, name: 'Rahim', address: 'Sreemangal', note: '', totalDuePaisa: 0, smsEnabled: true }
}

function sale(effectPaisa = 5000) {
  return { customerId: MOBILE, type: 'sale', effectPaisa, netPaisa: effectPaisa, voided: false, voidReason: '' }
}

function sms(overrides: Record<string, unknown> = {}) {
  return { kind: 'bakiAdd', customerId: MOBILE, to: MOBILE, text: 'রহিম, আজ ৳৫০ বাকি যোগ হলো।', segments: 1, status: 'pending', attempts: 0, ...overrides }
}

async function seed(path: string, data: Record<string, unknown>) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), path), data)
  })
}

describe('access', () => {
  it('only the owner can read or write shop data', async () => {
    await seed(`${SHOP}/customers/${MOBILE}`, customer())
    await assertSucceeds(getDoc(doc(owner(), `${SHOP}/customers/${MOBILE}`)))
    await assertFails(getDoc(doc(stranger(), `${SHOP}/customers/${MOBILE}`)))
    await assertFails(getDoc(doc(anon(), `${SHOP}/customers/${MOBILE}`)))
    await assertFails(setDoc(doc(stranger(), `${SHOP}/settings/general`), { a: 1 }))
    await assertSucceeds(setDoc(doc(owner(), `${SHOP}/settings/general`), { a: 1 }))
  })

  it('closes reserved collections', async () => {
    await assertFails(setDoc(doc(owner(), `${SHOP}/members/${OWNER}`), { role: 'owner' }))
    await assertFails(getDoc(doc(owner(), 'other/doc')))
  })
})

describe('customers', () => {
  it('create needs a valid mobile id that matches the data', async () => {
    await assertSucceeds(setDoc(doc(owner(), `${SHOP}/customers/${MOBILE}`), customer()))
    await assertFails(setDoc(doc(owner(), `${SHOP}/customers/1234`), customer('1234')))
    await assertFails(setDoc(doc(owner(), `${SHOP}/customers/01811111111`), customer(MOBILE)))
    await assertFails(setDoc(doc(owner(), `${SHOP}/customers/01811111111`), { ...customer('01811111111'), name: '' }))
  })

  it('merge-set with increment(0) creates the due field without overwriting it', async () => {
    const db = owner()
    const ref = doc(db, `${SHOP}/customers/${MOBILE}`)
    const { totalDuePaisa: _ignored, ...profile } = customer()
    await assertSucceeds(setDoc(ref, { ...profile, totalDuePaisa: increment(0) }, { merge: true }))
    await assertSucceeds(updateDoc(ref, { totalDuePaisa: increment(2500) }))
    await assertSucceeds(setDoc(ref, { ...profile, name: 'Rahim Uddin', totalDuePaisa: increment(0) }, { merge: true }))
  })

  it('only a customer without any history can be deleted; mobile cannot change in place', async () => {
    await seed(`${SHOP}/customers/${MOBILE}`, { ...customer(), lastTxnAt: 1 })
    await assertFails(deleteDoc(doc(owner(), `${SHOP}/customers/${MOBILE}`)))
    await seed(`${SHOP}/customers/01811111111`, { ...customer('01811111111'), totalDuePaisa: 500 })
    await assertFails(deleteDoc(doc(owner(), `${SHOP}/customers/01811111111`)))
    await seed(`${SHOP}/customers/01911111111`, customer('01911111111'))
    await assertFails(deleteDoc(doc(stranger(), `${SHOP}/customers/01911111111`)))
    await assertSucceeds(deleteDoc(doc(owner(), `${SHOP}/customers/01911111111`)))
    await assertFails(updateDoc(doc(owner(), `${SHOP}/customers/${MOBILE}`), { mobile: '01811111111' }))
    await assertFails(updateDoc(doc(owner(), `${SHOP}/customers/${MOBILE}`), { totalDuePaisa: 12.5 }))
  })
})

describe('transactions', () => {
  it('owner can create a sale and its due increment in one batch', async () => {
    await seed(`${SHOP}/customers/${MOBILE}`, customer())
    const db = owner()
    const batch = writeBatch(db)
    batch.set(doc(db, `${SHOP}/transactions/t1`), sale())
    batch.update(doc(db, `${SHOP}/customers/${MOBILE}`), { totalDuePaisa: increment(5000) })
    await assertSucceeds(batch.commit())
  })

  it('is append-only: no delete, no amount change, no pre-voided create', async () => {
    await seed(`${SHOP}/transactions/t1`, sale())
    await assertFails(deleteDoc(doc(owner(), `${SHOP}/transactions/t1`)))
    await assertFails(updateDoc(doc(owner(), `${SHOP}/transactions/t1`), { netPaisa: 1 }))
    await assertFails(
      updateDoc(doc(owner(), `${SHOP}/transactions/t1`), { voided: true, voidReason: 'x', effectPaisa: 0 }),
    )
    await assertFails(setDoc(doc(owner(), `${SHOP}/transactions/t2`), { ...sale(), voided: true }))
  })

  it('may move to a new mobile number, but only that field and only to a valid number', async () => {
    await seed(`${SHOP}/transactions/t1`, sale())
    const ref = doc(owner(), `${SHOP}/transactions/t1`)
    await assertSucceeds(updateDoc(ref, { customerId: '01811111111' }))
    await assertFails(updateDoc(ref, { customerId: '01911111111', netPaisa: 1 }))
    await assertFails(updateDoc(ref, { customerId: 'not-a-mobile' }))
    await assertFails(updateDoc(doc(stranger(), `${SHOP}/transactions/t1`), { customerId: '01911111111' }))
  })

  it('allows one void with a reason', async () => {
    await seed(`${SHOP}/transactions/t1`, sale())
    const ref = doc(owner(), `${SHOP}/transactions/t1`)
    await assertFails(updateDoc(ref, { voided: true, voidReason: '', voidedAt: 1, voidedBy: OWNER }))
    await assertSucceeds(updateDoc(ref, { voided: true, voidReason: 'ভুল', voidedAt: 1, voidedBy: OWNER }))
    await assertFails(updateDoc(ref, { voidReason: 'again' }))
  })
})

describe('logs and medicines', () => {
  it('audit log and price history are create-only', async () => {
    for (const col of ['auditLog', 'medicinePriceHistory']) {
      await assertSucceeds(setDoc(doc(owner(), `${SHOP}/${col}/e1`), { action: 'x' }))
      await assertFails(updateDoc(doc(owner(), `${SHOP}/${col}/e1`), { action: 'y' }))
      await assertFails(deleteDoc(doc(owner(), `${SHOP}/${col}/e1`)))
    }
  })

  it('medicines can be edited but never deleted', async () => {
    await assertSucceeds(setDoc(doc(owner(), `${SHOP}/medicines/m1`), { brandName: 'Napa', status: 'active' }))
    await assertSucceeds(updateDoc(doc(owner(), `${SHOP}/medicines/m1`), { status: 'inactive' }))
    await assertFails(deleteDoc(doc(owner(), `${SHOP}/medicines/m1`)))
  })

  it('reference catalog: owner only; chunks replaceable, meta never deleted', async () => {
    await assertSucceeds(setDoc(doc(owner(), `${SHOP}/refCatalog/medex`), { version: 'v1' }))
    await assertSucceeds(setDoc(doc(owner(), `${SHOP}/refCatalog/medex/chunks/v1-0`), { data: '[]' }))
    await assertSucceeds(getDoc(doc(owner(), `${SHOP}/refCatalog/medex/chunks/v1-0`)))
    await assertSucceeds(deleteDoc(doc(owner(), `${SHOP}/refCatalog/medex/chunks/v1-0`)))
    await assertFails(deleteDoc(doc(owner(), `${SHOP}/refCatalog/medex`)))
    await assertFails(getDoc(doc(stranger(), `${SHOP}/refCatalog/medex`)))
    await assertFails(setDoc(doc(stranger(), `${SHOP}/refCatalog/medex/chunks/x`), { data: '[]' }))
  })

  it('sms queue: owner adds pending items to the customer; only a failed item can go back to pending', async () => {
    const q = (id: string) => doc(owner(), `${SHOP}/smsQueue/${id}`)
    await assertSucceeds(setDoc(q('s1'), sms()))
    await assertSucceeds(setDoc(q('t1'), sms({ kind: 'test', customerId: null, to: '01811111111' })))
    await assertFails(setDoc(q('s2'), sms({ status: 'sent' })))
    await assertFails(setDoc(q('s3'), sms({ to: '01811111111' })))
    await assertFails(setDoc(q('s4'), sms({ kind: 'test', to: '01811111111' })))
    await assertFails(setDoc(q('s5'), sms({ text: 'ক'.repeat(641) })))
    await assertFails(setDoc(q('s6'), sms({ kind: 'promo' })))
    await assertFails(updateDoc(q('s1'), { status: 'sent' }))
    await assertFails(deleteDoc(q('s1')))
    await seed(`${SHOP}/smsQueue/f1`, { ...sms(), status: 'failed', attempts: 3, lastError: 'x' })
    await assertFails(updateDoc(q('f1'), { status: 'pending', attempts: 0, text: 'other' }))
    await assertSucceeds(updateDoc(q('f1'), { status: 'pending', attempts: 0, lastError: '' }))
    await assertFails(getDoc(doc(stranger(), `${SHOP}/smsQueue/s1`)))
  })
})

describe('prescription photos', () => {
  const bytes = (n: number) => Bytes.fromUint8Array(new Uint8Array(n))
  const meta = (over: Record<string, unknown> = {}) => ({
    customerId: MOBILE,
    note: 'ডা. করিম',
    thumb: bytes(20_000),
    width: 1400,
    height: 1000,
    imageBytes: 300_000,
    ...over,
  })

  it('owner adds a photo with its thumbnail; strangers cannot see it', async () => {
    const db = owner()
    const batch = writeBatch(db)
    batch.set(doc(db, `${SHOP}/prescriptions/p1`), meta())
    batch.set(doc(db, `${SHOP}/prescriptionImages/p1`), { image: bytes(300_000) })
    batch.set(doc(db, `${SHOP}/stats/usage`), { prescriptionCount: increment(1), prescriptionBytes: increment(320_000) }, { merge: true })
    await assertSucceeds(batch.commit())
    await assertSucceeds(getDoc(doc(owner(), `${SHOP}/prescriptionImages/p1`)))
    await assertFails(getDoc(doc(stranger(), `${SHOP}/prescriptions/p1`)))
    await assertFails(getDoc(doc(stranger(), `${SHOP}/prescriptionImages/p1`)))
    await assertFails(setDoc(doc(stranger(), `${SHOP}/prescriptionImages/p2`), { image: bytes(10) }))
  })

  it('checks sizes, the mobile number and the note', async () => {
    await assertFails(setDoc(doc(owner(), `${SHOP}/prescriptions/p2`), meta({ thumb: bytes(70_000) })))
    await assertFails(setDoc(doc(owner(), `${SHOP}/prescriptions/p2`), meta({ customerId: '1234' })))
    await assertFails(setDoc(doc(owner(), `${SHOP}/prescriptions/p2`), meta({ note: 'x'.repeat(201) })))
    await assertFails(setDoc(doc(owner(), `${SHOP}/prescriptionImages/p2`), { image: bytes(950_000) }))
    await assertFails(setDoc(doc(owner(), `${SHOP}/prescriptionImages/p2`), { image: 'not bytes' }))
  })

  it('only the note or the customer mobile can change; the photo never; owner may delete', async () => {
    await assertSucceeds(setDoc(doc(owner(), `${SHOP}/prescriptions/p3`), meta()))
    await assertSucceeds(setDoc(doc(owner(), `${SHOP}/prescriptionImages/p3`), { image: bytes(1000) }))
    await assertSucceeds(updateDoc(doc(owner(), `${SHOP}/prescriptions/p3`), { note: 'নতুন নোট' }))
    await assertSucceeds(updateDoc(doc(owner(), `${SHOP}/prescriptions/p3`), { customerId: '01811111111' }))
    await assertFails(updateDoc(doc(owner(), `${SHOP}/prescriptions/p3`), { customerId: 'bad' }))
    await assertFails(updateDoc(doc(owner(), `${SHOP}/prescriptions/p3`), { width: 10 }))
    await assertFails(updateDoc(doc(owner(), `${SHOP}/prescriptionImages/p3`), { image: bytes(10) }))
    await assertSucceeds(setDoc(doc(owner(), `${SHOP}/prescriptionImages/p3`), { image: bytes(1000) }))
    await assertSucceeds(deleteDoc(doc(owner(), `${SHOP}/prescriptionImages/p3`)))
    await assertSucceeds(deleteDoc(doc(owner(), `${SHOP}/prescriptions/p3`)))
    await assertFails(deleteDoc(doc(owner(), `${SHOP}/stats/usage`)))
  })
})

describe('staff (Phase 14)', () => {
  const STAFF = 'staff-1'
  const staff = () => env.authenticatedContext(STAFF).firestore()
  const tiny = Bytes.fromUint8Array(new Uint8Array(100))

  beforeEach(async () => {
    await seed(`${SHOP}/members/${STAFF}`, { role: 'staff', name: 'Rana', active: true })
    await seed(`${SHOP}/members/staff-2`, { role: 'staff', name: 'Mitu', active: true })
    await seed(`${SHOP}/customers/${MOBILE}`, customer())
  })

  it('reads what the counter needs, not the audit log, the usage counter or other staff', async () => {
    await seed(`${SHOP}/settings/general`, { a: 1 })
    await seed(`${SHOP}/medicines/m1`, { brandName: 'Napa' })
    await seed(`${SHOP}/refCatalog/medex`, { version: 'v1' })
    await seed(`${SHOP}/auditLog/a1`, { action: 'x' })
    await seed(`${SHOP}/stats/usage`, { prescriptionCount: 1 })
    for (const path of ['customers/' + MOBILE, 'settings/general', 'medicines/m1', 'refCatalog/medex', `members/${STAFF}`]) {
      await assertSucceeds(getDoc(doc(staff(), `${SHOP}/${path}`)))
    }
    for (const path of ['auditLog/a1', 'stats/usage', 'members/staff-2']) {
      await assertFails(getDoc(doc(staff(), `${SHOP}/${path}`)))
    }
  })

  it('makes a sale with its due increment, stamped with their own uid only', async () => {
    const db = staff()
    const ok = writeBatch(db)
    ok.set(doc(db, `${SHOP}/transactions/t1`), { ...sale(), createdBy: STAFF })
    ok.update(doc(db, `${SHOP}/customers/${MOBILE}`), { totalDuePaisa: increment(5000), lastTxnAt: 1 })
    await assertSucceeds(ok.commit())
    const bad = writeBatch(db)
    bad.set(doc(db, `${SHOP}/transactions/t2`), { ...sale(), createdBy: OWNER })
    bad.update(doc(db, `${SHOP}/customers/${MOBILE}`), { totalDuePaisa: increment(5000) })
    await assertFails(bad.commit())
    await assertSucceeds(setDoc(doc(db, `${SHOP}/customers/01811111111`), customer('01811111111')))
  })

  it('queues the SMS of their own bill or payment, nothing else, and cannot read the SMS log', async () => {
    const q = (id: string) => doc(staff(), `${SHOP}/smsQueue/${id}`)
    await assertSucceeds(setDoc(q('s1'), sms({ createdBy: STAFF })))
    await assertSucceeds(setDoc(q('s2'), sms({ kind: 'paymentClear', createdBy: STAFF })))
    await assertFails(setDoc(q('s3'), sms({ createdBy: OWNER })))
    await assertFails(setDoc(q('s4'), sms({ kind: 'reminder', createdBy: STAFF })))
    await assertFails(setDoc(q('s5'), sms({ kind: 'test', customerId: null, to: '01811111111', createdBy: STAFF })))
    await assertFails(getDoc(q('s1')))
  })

  it('sees only their own transactions', async () => {
    await seed(`${SHOP}/transactions/mine`, { ...sale(), createdBy: STAFF })
    await seed(`${SHOP}/transactions/theirs`, { ...sale(), createdBy: OWNER })
    await assertSucceeds(getDoc(doc(staff(), `${SHOP}/transactions/mine`)))
    await assertFails(getDoc(doc(staff(), `${SHOP}/transactions/theirs`)))
    const txns = collection(staff(), `${SHOP}/transactions`)
    await assertSucceeds(getDocs(query(txns, where('createdBy', '==', STAFF))))
    await assertFails(getDocs(query(txns, where('customerId', '==', MOBILE))))
  })

  it('cannot void, edit customers, change settings or prices, or manage staff', async () => {
    await seed(`${SHOP}/transactions/mine`, { ...sale(), createdBy: STAFF })
    await seed(`${SHOP}/medicines/m1`, { brandName: 'Napa', shopUnitPricePaisa: null })
    const db = staff()
    await assertFails(updateDoc(doc(db, `${SHOP}/transactions/mine`), { voided: true, voidReason: 'x', voidedAt: 1, voidedBy: STAFF }))
    await assertFails(updateDoc(doc(db, `${SHOP}/customers/${MOBILE}`), { name: 'Other' }))
    await assertFails(updateDoc(doc(db, `${SHOP}/customers/${MOBILE}`), { smsEnabled: false }))
    await assertFails(setDoc(doc(db, `${SHOP}/settings/general`), { a: 2 }))
    await assertFails(updateDoc(doc(db, `${SHOP}/medicines/m1`), { shopUnitPricePaisa: 100 }))
    await assertFails(setDoc(doc(db, `${SHOP}/medicines/m2`), { brandName: 'X', shopUnitPricePaisa: 100, shopStripPricePaisa: null, shopPackPricePaisa: null }))
    await assertSucceeds(setDoc(doc(db, `${SHOP}/medicines/m3`), { brandName: 'X', shopUnitPricePaisa: null, shopStripPricePaisa: null, shopPackPricePaisa: null }))
    await assertFails(setDoc(doc(db, `${SHOP}/members/staff-3`), { role: 'staff', name: 'New', active: true }))
    await seed(`${SHOP}/customers/01911111111`, customer('01911111111'))
    await assertFails(deleteDoc(doc(db, `${SHOP}/customers/01911111111`)))
    await assertFails(updateDoc(doc(db, `${SHOP}/members/${STAFF}`), { active: true, name: 'Rana!' }))
    await assertSucceeds(setDoc(doc(db, `${SHOP}/auditLog/a2`), { action: 'x', by: STAFF }))
    await assertFails(setDoc(doc(db, `${SHOP}/auditLog/a3`), { action: 'x', by: OWNER }))
  })

  it('adds prescription photos and bumps the counter, but cannot delete photos', async () => {
    const db = staff()
    const batch = writeBatch(db)
    batch.set(doc(db, `${SHOP}/prescriptions/p1`), { customerId: MOBILE, note: '', thumb: tiny, createdBy: STAFF })
    batch.set(doc(db, `${SHOP}/prescriptionImages/p1`), { image: tiny, createdBy: STAFF })
    batch.set(doc(db, `${SHOP}/stats/usage`), { prescriptionCount: increment(1), prescriptionBytes: increment(200) }, { merge: true })
    await assertSucceeds(batch.commit())
    await assertSucceeds(getDoc(doc(db, `${SHOP}/prescriptionImages/p1`)))
    await assertFails(deleteDoc(doc(db, `${SHOP}/prescriptions/p1`)))
    await assertFails(deleteDoc(doc(db, `${SHOP}/prescriptionImages/p1`)))
    await assertFails(setDoc(doc(db, `${SHOP}/stats/usage`), { other: 1 }, { merge: true }))
  })

  it('a turned-off staff member loses access at once', async () => {
    await seed(`${SHOP}/members/${STAFF}`, { role: 'staff', name: 'Rana', active: false })
    await assertFails(getDoc(doc(staff(), `${SHOP}/customers/${MOBILE}`)))
    await assertFails(setDoc(doc(staff(), `${SHOP}/transactions/t9`), { ...sale(), createdBy: STAFF }))
    await assertSucceeds(getDoc(doc(staff(), `${SHOP}/members/${STAFF}`)))
  })

  it('the owner adds and turns off staff; records are never deleted or made owners', async () => {
    const db = owner()
    await assertSucceeds(setDoc(doc(db, `${SHOP}/members/staff-9`), { role: 'staff', name: 'Joy', active: true, email: 'joy@x.test' }))
    await assertSucceeds(updateDoc(doc(db, `${SHOP}/members/staff-9`), { active: false }))
    await assertFails(setDoc(doc(db, `${SHOP}/members/staff-8`), { role: 'owner', name: 'Joy', active: true }))
    await assertFails(deleteDoc(doc(db, `${SHOP}/members/staff-9`)))
    await assertSucceeds(getDocs(collection(db, `${SHOP}/members`)))
  })
})

