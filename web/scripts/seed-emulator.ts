// Seeds the LOCAL Firebase emulator with a test owner, ~30 fake customers and ~200 sample medicines.
// Never touches a real Firebase project (refuses unless the demo- project + emulator are used).
//
//   1. From the project root:  npm run emulators      (leave it running)
//   2. In another terminal:     npm run seed
//
// Test login for the emulator only:
const OWNER_EMAIL = 'owner@baki.test'
const OWNER_PASSWORD = 'baki-test-1234'
// Must match the UID placeholder in firestore.rules.
const OWNER_UID = 'REPLACE_WITH_OWNER_UID'

import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getFirestore,
  serverTimestamp,
  terminate,
  Timestamp,
  writeBatch,
} from 'firebase/firestore'
import { SAMPLE_MEDICINES } from './sample-medicines.ts'

const PROJECT = 'demo-baki'
const HOST = '127.0.0.1'
const AUTH = `http://${HOST}:9099`
const FIRESTORE = `http://${HOST}:8080`
const SHOP = 'shops/main'
const DAY = 86_400_000

async function call(url: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(url, init)
  } catch {
    console.error(`\nCannot reach the emulator at ${url}.\nStart it first from the project root:  npm run emulators\n`)
    process.exit(1)
  }
}

// --- deterministic fake data ---
let seed = 20261022
function rand(n: number): number {
  seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648
  return seed % n
}
const pick = <T>(xs: readonly T[]): T => xs[rand(xs.length)]!

const NAMES = [
  'রহিম উদ্দিন', 'করিম মিয়া', 'সুমি আক্তার', 'জসিম উদ্দিন', 'নাসরিন বেগম', 'মোঃ হাবিবুর রহমান',
  'রাশেদা খাতুন', 'আব্দুল কাদের', 'শিউলি রানী দাস', 'বিপ্লব দেব', 'সুব্রত চক্রবর্তী', 'মনোয়ারা বেগম',
  'Abdul Karim', 'Rina Das', 'Shahin Ahmed', 'Polash Sarkar', 'Nurul Islam', 'Mitu Akter',
  'আলমগীর হোসেন', 'রুবিনা ইয়াসমিন', 'প্রদীপ পাল', 'শাহানা পারভীন', 'কামরুল হাসান', 'অনিতা রায়',
  'Tanvir Hasan', 'Liton Deb', 'Selina Begum', 'Rafiq Mia', 'Joynal Abedin', 'Shirin Sultana',
]
const PLACES = [
  'R.K Mission Road', 'Station Road', 'College Road', 'Bhanugach Road', 'Kalighat Road',
  'Moulvibazar Road', 'Rajghat', 'Lamua', 'Satgaon', 'Kalapur', 'Uttarsur', 'Sindurkhan Road',
]
const NOTES = ['', '', '', 'পরিবারের সবার জন্য', 'মাসের শুরুতে দেন', 'চা বাগান', 'Family account']

function code4(): string {
  const a = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  return Array.from({ length: 4 }, () => a[rand(32)]).join('')
}
function yymmdd(ms: number): string {
  const d = new Date(ms + 6 * 3_600_000) // Asia/Dhaka (UTC+6, no DST)
  return d.toISOString().slice(2, 10).replace(/-/g, '')
}

function txn(o: {
  type: 'opening' | 'payment'
  mobile: string
  name: string
  amount: number
  at: number
  method?: 'cash' | 'bkash'
}) {
  const payment = o.type === 'payment'
  return {
    customerId: o.mobile,
    customerName: o.name,
    type: o.type,
    memoNo: `${payment ? 'J' : 'O'}-${yymmdd(o.at)}-${code4()}`,
    mode: null,
    lines: [],
    subtotalPaisa: 0,
    billDiscount: { type: 'none', value: 0 },
    billDiscountPaisa: 0,
    roundOffPaisa: 0,
    netPaisa: o.amount,
    paidNowPaisa: payment ? o.amount : 0,
    paymentMethod: payment ? (o.method ?? 'cash') : null,
    trxId: '',
    effectPaisa: payment ? -o.amount : o.amount,
    memoPrevDuePaisa: null,
    note: payment ? '' : 'পুরনো খাতা থেকে',
    deviceId: 'D-SEED',
    createdAt: Timestamp.fromMillis(o.at),
    createdBy: OWNER_UID,
    serverAt: Timestamp.fromMillis(o.at),
    voided: false,
    voidedAt: null,
    voidedBy: null,
    voidReason: '',
    schemaVersion: 1,
  }
}

async function main() {
  // 1. Wipe emulator Firestore (emulator-only endpoint).
  await call(`${FIRESTORE}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' })

  // 2. Test owner with the fixed UID the rules expect (admin call; emulator accepts "Bearer owner").
  await call(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' })
  const res = await call(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ localId: OWNER_UID, email: OWNER_EMAIL, password: OWNER_PASSWORD }),
  })
  if (!res.ok) throw new Error(`Creating test owner failed: ${res.status} ${await res.text()}`)

  // 3. Sign in as the owner and write through the security rules, like the app does.
  const app = initializeApp({ apiKey: 'demo-key', projectId: PROJECT, appId: 'seed' })
  const auth = getAuth(app)
  connectAuthEmulator(auth, AUTH, { disableWarnings: true })
  const db = getFirestore(app)
  connectFirestoreEmulator(db, HOST, 8080)
  await signInWithEmailAndPassword(auth, OWNER_EMAIL, OWNER_PASSWORD)

  const now = Date.now()
  const batch = writeBatch(db)
  const used = new Set<string>()
  let txns = 0
  for (const name of NAMES) {
    let mobile: string
    do mobile = `01${pick(['3', '4', '5', '6', '7', '8', '9'])}${String(rand(100_000_000)).padStart(8, '0')}`
    while (used.has(mobile))
    used.add(mobile)

    const createdAt = now - (1 + rand(120)) * DAY - rand(DAY)
    let due = 0
    let lastPaymentAt: number | null = null
    const roll = rand(10)
    if (roll > 0) {
      const opening = (5 + rand(1500)) * 1000 // ৳50 – ৳15,000 in ৳10 steps
      batch.set(doc(db, `${SHOP}/transactions/seed-${mobile}-o`), txn({ type: 'opening', mobile, name, amount: opening, at: createdAt }))
      due += opening
      txns++
      if (roll >= 6) {
        // Some paid part, one paid in full plus advance.
        const paid = roll === 9 ? opening + 20_000 : Math.round((opening * (20 + rand(60))) / 100 / 1000) * 1000
        lastPaymentAt = createdAt + rand(Math.max(1, now - createdAt))
        batch.set(
          doc(db, `${SHOP}/transactions/seed-${mobile}-p`),
          txn({ type: 'payment', mobile, name, amount: paid, at: lastPaymentAt, method: rand(2) ? 'cash' : 'bkash' }),
        )
        due -= paid
        txns++
      }
    }

    batch.set(doc(db, `${SHOP}/customers/${mobile}`), {
      mobile,
      name,
      address: `${pick(PLACES)}, Sreemangal`,
      note: pick(NOTES),
      totalDuePaisa: due,
      smsEnabled: rand(8) !== 0,
      reminderEnabled: rand(6) !== 0,
      archived: rand(15) === 0,
      lastTxnAt: Timestamp.fromMillis(lastPaymentAt ?? createdAt),
      lastPaymentAt: lastPaymentAt === null ? null : Timestamp.fromMillis(lastPaymentAt),
      lastReminderAt: null,
      reminderMonth: null,
      reminderCountThisMonth: 0,
      createdAt: Timestamp.fromMillis(createdAt),
      createdBy: OWNER_UID,
      updatedAt: Timestamp.fromMillis(now),
      schemaVersion: 1,
    })
  }
  await batch.commit()

  // Sample medicines: most look like a supplier-file import (source price), some added by hand (shop price),
  // a few with a shop price override, a few no longer sold.
  const medBatch = writeBatch(db)
  const rows = SAMPLE_MEDICINES.trim().split('\n')
  rows.forEach((line, i) => {
    const [brandName, genericName, strength, dosageForm, manufacturer, price, strip, pack, packDescription] = line.split('|')
    const pricePaisa = Math.round(Number(price) * 100)
    const manual = i % 7 === 0
    const override = !manual && i % 23 === 5
    medBatch.set(doc(collection(db, `${SHOP}/medicines`), `seed-med-${String(i + 1).padStart(3, '0')}`), {
      brandName,
      genericName,
      strength,
      dosageForm,
      manufacturer,
      dosageText: dosageForm,
      packDescription,
      piecesPerStrip: strip ? Number(strip) : null,
      piecesPerPack: pack ? Number(pack) : null,
      sourceUnitPricePaisa: manual ? null : pricePaisa,
      sourceStripPricePaisa: null,
      sourcePackPricePaisa: null,
      shopUnitPricePaisa: manual ? pricePaisa : override ? Math.round((pricePaisa * 11) / 10) : null,
      shopStripPricePaisa: null,
      shopPackPricePaisa: null,
      sourceName: manual ? 'manual' : 'csv',
      sourceId: null,
      sourceUrl: null,
      sourceUpdatedAt: null,
      sourceFetchedAt: manual ? null : Timestamp.fromMillis(now - 10 * DAY),
      lastImportId: manual ? null : 'seed-import',
      sourceStatus: 'listed',
      status: i % 41 === 3 ? 'inactive' : 'active',
      createdAt: Timestamp.fromMillis(now - 30 * DAY),
      createdBy: OWNER_UID,
      updatedAt: serverTimestamp(),
      schemaVersion: 1,
    })
  })
  await medBatch.commit()
  await terminate(db)

  console.log(`\nSeeded ${NAMES.length} customers, ${txns} transactions and ${rows.length} sample medicines into the emulator.`)
  console.log(`Emulator login →  email: ${OWNER_EMAIL}   password: ${OWNER_PASSWORD}`)
  console.log('Emulator UI   →  http://127.0.0.1:4000/firestore\n')
  process.exit(0)
}

main().catch((e: unknown) => {
  console.error(e)
  process.exit(1)
})
