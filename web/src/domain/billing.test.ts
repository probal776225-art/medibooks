import { describe, expect, it } from 'vitest'
import {
  buildAdjustment,
  buildOpening,
  buildPayment,
  buildSale,
  buildVoid,
  computeBillTotals,
  type TxnMeta,
} from './billing'
import type { DomainError } from './errors'
import { makeMedicine } from './fixtures'
import { expectedDue } from './ledger'
import { buildSaleLine } from './pricing'

const meta: TxnMeta = { memoNo: 'B-261022-TEST', deviceId: 'D-TEST', createdAt: 1_761_100_000_000, createdBy: 'owner' }
const customer = { mobile: '01711460114', name: 'Rahim' }

function code(fn: () => unknown): string {
  try {
    fn()
  } catch (e) {
    return (e as DomainError).code
  }
  return 'no error'
}

describe('computeBillTotals', () => {
  it('no discount, no rounding', () => {
    expect(computeBillTotals(123456, { type: 'none', value: 0 }, false)).toEqual({
      subtotalPaisa: 123456,
      billDiscountPaisa: 0,
      roundOffPaisa: 0,
      netPaisa: 123456,
    })
  })

  it('percent discount then round to taka', () => {
    // ৳1234.56 − 10% (12346) = 111110 → round to 111100 (−10)
    expect(computeBillTotals(123456, { type: 'percent', value: 1000 }, true)).toEqual({
      subtotalPaisa: 123456,
      billDiscountPaisa: 12346,
      roundOffPaisa: -10,
      netPaisa: 111100,
    })
  })

  it('33.33% and flat discounts', () => {
    expect(computeBillTotals(30000, { type: 'percent', value: 3333 }, false).billDiscountPaisa).toBe(9999)
    expect(computeBillTotals(30000, { type: 'flat', value: 5000 }, true).netPaisa).toBe(25000)
    expect(computeBillTotals(30000, { type: 'flat', value: 30000 }, true).netPaisa).toBe(0)
  })

  it('rejects discounts that are too big', () => {
    expect(code(() => computeBillTotals(30000, { type: 'flat', value: 30001 }, true))).toBe('BILL_DISCOUNT_EXCEEDS')
    expect(code(() => computeBillTotals(30000, { type: 'percent', value: 10001 }, true))).toBe('INVALID_PERCENT')
    expect(code(() => computeBillTotals(30000, { type: 'percent', value: 12.5 }, true))).toBe('INVALID_PERCENT')
  })
})

describe('buildSale', () => {
  const napa = makeMedicine()
  const seclo = makeMedicine({
    id: 'med-seclo',
    brandName: 'Seclo',
    genericName: 'Omeprazole',
    strength: '20 mg',
    dosageForm: 'Capsule',
    manufacturer: 'Square Pharmaceuticals PLC',
    piecesPerStrip: 10,
    piecesPerPack: 100,
    sourceUnitPricePaisa: 600,
    sourcePackPricePaisa: 58000,
  })
  const syrup = makeMedicine({
    id: 'med-syrup',
    brandName: 'Napa',
    strength: '120 mg/5 ml',
    dosageForm: 'Suspension',
    piecesPerStrip: null,
    piecesPerPack: null,
    sourceUnitPricePaisa: 3500,
  })

  it('5-item bill: piece + strip + pack + custom, edited price, line discount, 10% bill discount, paid now', () => {
    const lines = [
      buildSaleLine({ lineNo: 1, medicine: napa, unit: 'piece', qty: 6 }), // 6 × 120 = 720
      buildSaleLine({ lineNo: 2, medicine: napa, unit: 'strip', qty: 2 }), // 2 × 1200 = 2400
      buildSaleLine({ lineNo: 3, medicine: seclo, unit: 'pack', qty: 1, discountPaisa: 3000 }), // 58000 − 3000 = 55000
      buildSaleLine({ lineNo: 4, medicine: syrup, unit: 'piece', qty: 1, unitPricePaisa: 3200 }), // edited 3200
      buildSaleLine({
        lineNo: 5,
        medicine: null,
        name: 'Gauze',
        unit: 'custom',
        unitLabel: 'প্যাকেট',
        qty: 2,
        unitPricePaisa: 1525,
      }), // 3050
    ]
    // subtotal = 720 + 2400 + 55000 + 3200 + 3050 = 64370
    // 10% = 6437 → 57933 → round 57900 (−33)
    const txn = buildSale({
      customer,
      prevDuePaisa: 150000,
      mode: 'items',
      lines,
      billDiscount: { type: 'percent', value: 1000 },
      roundToTaka: true,
      paidNowPaisa: 20000,
      paymentMethod: 'bkash',
      trxId: ' 9AB12CD ',
      note: ' মাসিক ',
      meta,
    })
    expect(txn).toMatchObject({
      type: 'sale',
      mode: 'items',
      customerId: '01711460114',
      customerName: 'Rahim',
      subtotalPaisa: 64370,
      billDiscountPaisa: 6437,
      roundOffPaisa: -33,
      netPaisa: 57900,
      paidNowPaisa: 20000,
      paymentMethod: 'bkash',
      trxId: '9AB12CD',
      effectPaisa: 37900,
      memoPrevDuePaisa: 150000,
      note: 'মাসিক',
      voided: false,
      schemaVersion: 1,
    })
    expect(txn.lines.map((l) => l.lineNo)).toEqual([1, 2, 3, 4, 5])
    expect(txn.lines[3]?.priceOverridden).toBe(true)
  })

  it('amount mode with full payment has zero effect', () => {
    const txn = buildSale({
      customer,
      prevDuePaisa: 0,
      mode: 'amount',
      amountPaisa: 50000,
      roundToTaka: true,
      paidNowPaisa: 50000,
      paymentMethod: 'cash',
      meta,
    })
    expect(txn.lines).toEqual([])
    expect(txn.effectPaisa).toBe(0)
    expect(txn.trxId).toBe('')
  })

  it('validates', () => {
    const ok = { customer, prevDuePaisa: 0, roundToTaka: false, meta } as const
    expect(code(() => buildSale({ ...ok, mode: 'items', lines: [] }))).toBe('EMPTY_BILL')
    expect(code(() => buildSale({ ...ok, mode: 'amount', amountPaisa: 0 }))).toBe('INVALID_AMOUNT')
    expect(code(() => buildSale({ ...ok, mode: 'amount', amountPaisa: 100, paidNowPaisa: 101, paymentMethod: 'cash' }))).toBe(
      'PAID_EXCEEDS_NET',
    )
    expect(code(() => buildSale({ ...ok, mode: 'amount', amountPaisa: 100, paidNowPaisa: 50 }))).toBe('METHOD_REQUIRED')
  })

  it('drops payment method when nothing is paid now', () => {
    const txn = buildSale({ customer, prevDuePaisa: 0, mode: 'amount', amountPaisa: 100, roundToTaka: false, paymentMethod: 'card', meta })
    expect(txn.paymentMethod).toBeNull()
    expect(txn.effectPaisa).toBe(100)
  })
})

describe('payment, opening, adjustment, void', () => {
  it('payment reduces due and allows advance', () => {
    const p = buildPayment({ customer, prevDuePaisa: 10000, amountPaisa: 15000, method: 'nagad', meta })
    expect(p).toMatchObject({ type: 'payment', netPaisa: 15000, paidNowPaisa: 15000, effectPaisa: -15000 })
    expect(code(() => buildPayment({ customer, prevDuePaisa: 0, amountPaisa: 0, method: 'cash', meta }))).toBe(
      'INVALID_AMOUNT',
    )
  })

  it('opening adds due; adjustment needs a reason', () => {
    expect(buildOpening({ customer, amountPaisa: 500000, meta }).effectPaisa).toBe(500000)
    expect(buildAdjustment({ customer, amountPaisa: -2500, note: 'ভুল এন্ট্রি', meta })).toMatchObject({
      netPaisa: 2500,
      effectPaisa: -2500,
    })
    expect(code(() => buildAdjustment({ customer, amountPaisa: 100, note: '  ', meta }))).toBe('REASON_REQUIRED')
    expect(code(() => buildAdjustment({ customer, amountPaisa: 0, note: 'x', meta }))).toBe('INVALID_AMOUNT')
  })

  it('void reverses the effect once, with a reason', () => {
    const v = buildVoid({ voided: false, effectPaisa: 37900 }, ' ভুল কাস্টমার ', 5, 'owner')
    expect(v).toEqual({
      patch: { voided: true, voidedAt: 5, voidedBy: 'owner', voidReason: 'ভুল কাস্টমার' },
      reverseEffectPaisa: -37900,
    })
    expect(buildVoid({ voided: false, effectPaisa: 0 }, 'x', 5, 'owner').reverseEffectPaisa).toBe(0)
    expect(code(() => buildVoid({ voided: true, effectPaisa: 1 }, 'x', 5, 'owner'))).toBe('ALREADY_VOIDED')
    expect(code(() => buildVoid({ voided: false, effectPaisa: 1 }, ' ', 5, 'owner'))).toBe('REASON_REQUIRED')
  })
})

describe('invariant: stored due = Σ non-voided effects', () => {
  it('holds over a random sequence of sales, payments and voids', () => {
    let seed = 42
    const rand = (n: number) => {
      seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648
      return seed % n
    }
    let stored = 0
    const txns: { effectPaisa: number; voided: boolean; createdAt: number }[] = []
    for (let i = 0; i < 500; i++) {
      const roll = rand(10)
      if (roll < 5) {
        const amount = 1 + rand(500000)
        const billDiscount = { type: 'percent' as const, value: rand(2001) }
        const roundToTaka = rand(2) === 0
        const { netPaisa } = computeBillTotals(amount, billDiscount, roundToTaka)
        const s = buildSale({
          customer,
          prevDuePaisa: stored,
          mode: 'amount',
          amountPaisa: amount,
          billDiscount,
          roundToTaka,
          paidNowPaisa: rand(netPaisa + 1),
          paymentMethod: 'cash',
          meta,
        })
        stored += s.effectPaisa
        txns.push({ ...s, createdAt: i })
      } else if (roll < 8) {
        const p = buildPayment({ customer, prevDuePaisa: stored, amountPaisa: 1 + rand(300000), method: 'cash', meta })
        stored += p.effectPaisa
        txns.push({ ...p, createdAt: i })
      } else if (txns.length > 0) {
        const target = txns[rand(txns.length)]!
        if (!target.voided) {
          const v = buildVoid(target, 'test', i, 'owner')
          Object.assign(target, v.patch)
          stored += v.reverseEffectPaisa
        }
      }
      expect(Number.isSafeInteger(stored)).toBe(true)
    }
    expect(expectedDue(txns)).toBe(stored)
  })
})
