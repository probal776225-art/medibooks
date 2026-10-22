import { describe, expect, it } from 'vitest'
import type { TxnMeta } from './billing'
import type { DomainError } from './errors'
import { makeMedicine } from './fixtures'
import { draftToSale, EMPTY_DRAFT, evaluateDraft, newDraftLine, type SaleDraft } from './saleDraft'
import type { Medicine } from './types'

const napa = makeMedicine()
const seclo = makeMedicine({
  id: 'seclo',
  brandName: 'Seclo',
  genericName: 'Omeprazole',
  strength: '20 mg',
  dosageForm: 'Capsule',
  piecesPerStrip: 10,
  piecesPerPack: 100,
  sourceUnitPricePaisa: 600,
  sourcePackPricePaisa: 58000,
})
const syrup = makeMedicine({ id: 'syrup', strength: '120 mg/5 ml', dosageForm: 'Suspension', piecesPerStrip: null, piecesPerPack: null, sourceUnitPricePaisa: 3500 })
const byId = (...ms: Medicine[]) => new Map(ms.map((m) => [m.id, m]))
const meds = byId(napa, seclo, syrup)
const meta: TxnMeta = { memoNo: 'B-261022-TEST', deviceId: 'D-1', createdAt: 1, createdBy: 'owner' }
const customer = { mobile: '01711460114', name: 'Rahim' }

function fiveItemDraft(): SaleDraft {
  return {
    ...EMPTY_DRAFT,
    customerMobile: customer.mobile,
    lines: [
      { ...newDraftLine('a', napa, 'piece'), qty: 6 }, // 720
      { ...newDraftLine('b', napa, 'strip'), qty: 2 }, // 2400
      { ...newDraftLine('c', seclo, 'pack'), discountText: '30' }, // 58000 − 3000
      { ...newDraftLine('d', syrup, 'piece'), priceText: '32' }, // edited price 3200
      { ...newDraftLine('e', null, 'custom', 'Gauze'), customLabel: 'প্যাকেট', qty: 2, priceText: '15.25' }, // 3050
    ],
    discountType: 'percent',
    discountText: '10',
    paidText: '200',
    method: 'bkash',
  }
}

describe('evaluateDraft', () => {
  it('gives live totals for the 5-item bill (piece, strip, box, custom; edited price; line + 10% bill discount; paid now)', () => {
    const ev = evaluateDraft(fiveItemDraft(), meds, true)
    expect(ev.error).toBeNull()
    expect(ev.lineErrors).toEqual([null, null, null, null, null])
    expect(ev.totals).toEqual({ subtotalPaisa: 64370, billDiscountPaisa: 6437, roundOffPaisa: -33, netPaisa: 57900 })
    expect(ev.paidNowPaisa).toBe(20000)
    expect(ev.effectPaisa).toBe(37900)
    expect(ev.lines[3]?.priceOverridden).toBe(true)
    expect(ev.lines[4]).toMatchObject({ medicineId: null, name: 'Gauze', unitLabel: 'প্যাকেট', lineTotalPaisa: 3050 })
  })

  it('prefills prices from the medicine and keeps half-typed input harmless', () => {
    expect(newDraftLine('x', napa, 'strip').priceText).toBe('12')
    expect(newDraftLine('x', napa, 'piece').priceText).toBe('1.20')
    const ev = evaluateDraft({ ...EMPTY_DRAFT, lines: [{ ...newDraftLine('x', napa), priceText: '1.2.3' }] }, meds, true)
    expect(ev.lineErrors).toEqual(['INVALID_PRICE'])
    expect(ev.totals).toBeNull()
    expect(ev.error).toBe('INVALID_PRICE')
  })

  it('reports blocking problems', () => {
    expect(evaluateDraft(EMPTY_DRAFT, meds, true).error).toBe('EMPTY_BILL')
    expect(evaluateDraft({ ...EMPTY_DRAFT, mode: 'amount', amountText: '' }, meds, true).error).toBe('INVALID_AMOUNT')
    const amount = { ...EMPTY_DRAFT, mode: 'amount' as const, amountText: '500' }
    expect(evaluateDraft({ ...amount, paidText: '600', method: 'cash' }, meds, true).error).toBe('PAID_EXCEEDS_NET')
    expect(evaluateDraft({ ...amount, paidText: '100' }, meds, true).error).toBe('METHOD_REQUIRED')
    expect(evaluateDraft({ ...amount, discountType: 'percent', discountText: '120' }, meds, true).error).toBe('INVALID_PERCENT')
    expect(evaluateDraft({ ...amount, discountType: 'flat', discountText: '600' }, meds, true).error).toBe('BILL_DISCOUNT_EXCEEDS')
    const unknownMed = { ...EMPTY_DRAFT, lines: [{ ...newDraftLine('x', napa), medicineId: 'gone' }] }
    expect(evaluateDraft(unknownMed, meds, true).error).toBe('UNIT_NOT_AVAILABLE')
    const noPrice = makeMedicine({ id: 'np', sourceUnitPricePaisa: null })
    expect(evaluateDraft({ ...EMPTY_DRAFT, lines: [newDraftLine('x', noPrice)] }, byId(noPrice), true).error).toBe('INVALID_PRICE')
  })

  it('amount mode with discount and rounding', () => {
    const ev = evaluateDraft({ ...EMPTY_DRAFT, mode: 'amount', amountText: '1,234.56', discountType: 'flat', discountText: '34.56' }, meds, true)
    expect(ev.totals?.netPaisa).toBe(120000)
    expect(ev.effectPaisa).toBe(120000)
  })
})

describe('draftToSale', () => {
  it('builds the transaction and freezes the snapshot', () => {
    const live = new Map(meds)
    const txn = draftToSale(fiveItemDraft(), { customer, prevDuePaisa: 150000, medicines: live, roundToTaka: true, meta })
    expect(txn).toMatchObject({ type: 'sale', netPaisa: 57900, effectPaisa: 37900, memoPrevDuePaisa: 150000, paymentMethod: 'bkash' })
    const frozen = structuredClone(txn)
    // The shop changes Napa's price and name afterwards: the saved bill must not change.
    live.set('med-napa', { ...napa, shopUnitPricePaisa: 999, brandName: 'Renamed' })
    expect(txn).toEqual(frozen)
    expect(txn.lines[0]).toMatchObject({ name: 'Napa 500 mg Tablet', unitPricePaisa: 120, listUnitPricePaisa: 120 })
  })

  it('refuses an invalid draft', () => {
    try {
      draftToSale(EMPTY_DRAFT, { customer, prevDuePaisa: 0, medicines: meds, roundToTaka: true, meta })
      expect.unreachable()
    } catch (e) {
      expect((e as DomainError).code).toBe('EMPTY_BILL')
    }
  })
})
