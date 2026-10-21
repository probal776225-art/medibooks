// Security rules tests. Run from the project root: `npm run test:rules` (starts the Firestore emulator).
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { deleteDoc, doc, getDoc, increment, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
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

  it('cannot be deleted and mobile cannot change in place', async () => {
    await seed(`${SHOP}/customers/${MOBILE}`, customer())
    await assertFails(deleteDoc(doc(owner(), `${SHOP}/customers/${MOBILE}`)))
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

  it('sms queue: owner creates, cannot edit or delete', async () => {
    await assertSucceeds(setDoc(doc(owner(), `${SHOP}/smsQueue/s1`), { status: 'pending' }))
    await assertFails(updateDoc(doc(owner(), `${SHOP}/smsQueue/s1`), { status: 'sent' }))
    await assertFails(deleteDoc(doc(owner(), `${SHOP}/smsQueue/s1`)))
  })
})
