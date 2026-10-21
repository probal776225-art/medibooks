// Builds transaction drafts and their effect on the customer's due (ARCHITECTURE §7).
// The repository writes the draft and increment(effectPaisa) in ONE batch.
import { DomainError } from './errors'
import { assertPaisa, MAX_PAISA, percentOf, roundToTaka, sumPaisa } from './money'
import {
  type BillDiscount,
  type Millis,
  type Paisa,
  type PaymentMethod,
  type SaleLine,
  type Transaction,
  type TransactionDraft,
  type TxnType,
  SCHEMA_VERSION,
} from './types'

export interface TxnMeta {
  memoNo: string
  deviceId: string
  createdAt: Millis
  createdBy: string
}

export interface CustomerRef {
  mobile: string
  name: string
}

export const NO_DISCOUNT: BillDiscount = { type: 'none', value: 0 }

export interface BillTotals {
  subtotalPaisa: Paisa
  billDiscountPaisa: Paisa
  roundOffPaisa: Paisa
  netPaisa: Paisa
}

/** subtotal → bill discount → optional round to taka → net. */
export function computeBillTotals(subtotalPaisa: Paisa, discount: BillDiscount, roundTaka: boolean): BillTotals {
  assertPaisa(subtotalPaisa, 'subtotal')
  if (subtotalPaisa < 0) throw new DomainError('INVALID_AMOUNT')
  let billDiscountPaisa = 0
  if (discount.type === 'percent') {
    if (!Number.isInteger(discount.value) || discount.value < 0 || discount.value > 10_000) {
      throw new DomainError('INVALID_PERCENT')
    }
    billDiscountPaisa = percentOf(subtotalPaisa, discount.value)
  } else if (discount.type === 'flat') {
    if (!Number.isSafeInteger(discount.value) || discount.value < 0) throw new DomainError('INVALID_AMOUNT')
    if (discount.value > subtotalPaisa) throw new DomainError('BILL_DISCOUNT_EXCEEDS')
    billDiscountPaisa = discount.value
  }
  const afterDiscount = subtotalPaisa - billDiscountPaisa
  const { rounded, roundOff } = roundTaka ? roundToTaka(afterDiscount) : { rounded: afterDiscount, roundOff: 0 }
  return { subtotalPaisa, billDiscountPaisa, roundOffPaisa: roundOff, netPaisa: rounded }
}

function base(type: TxnType, customer: CustomerRef, meta: TxnMeta): TransactionDraft {
  return {
    customerId: customer.mobile,
    customerName: customer.name,
    type,
    memoNo: meta.memoNo,
    mode: null,
    lines: [],
    subtotalPaisa: 0,
    billDiscount: NO_DISCOUNT,
    billDiscountPaisa: 0,
    roundOffPaisa: 0,
    netPaisa: 0,
    paidNowPaisa: 0,
    paymentMethod: null,
    trxId: '',
    effectPaisa: 0,
    memoPrevDuePaisa: null,
    note: '',
    deviceId: meta.deviceId,
    createdAt: meta.createdAt,
    createdBy: meta.createdBy,
    voided: false,
    voidedAt: null,
    voidedBy: null,
    voidReason: '',
    schemaVersion: SCHEMA_VERSION,
  }
}

function assertPositiveAmount(amount: Paisa): void {
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > MAX_PAISA) throw new DomainError('INVALID_AMOUNT')
}

export interface SaleInput {
  customer: CustomerRef
  /** Customer's due as this device sees it right now (shown on the memo only). */
  prevDuePaisa: Paisa
  mode: 'items' | 'amount'
  /** mode 'items': snapshots from buildSaleLine(). */
  lines?: SaleLine[]
  /** mode 'amount': the typed bill amount. */
  amountPaisa?: Paisa
  billDiscount?: BillDiscount
  roundToTaka: boolean
  paidNowPaisa?: Paisa
  paymentMethod?: PaymentMethod | null
  trxId?: string
  note?: string
  meta: TxnMeta
}

export function buildSale(input: SaleInput): TransactionDraft {
  let subtotal: Paisa
  let lines: SaleLine[] = []
  if (input.mode === 'items') {
    lines = (input.lines ?? []).map((l, i) => ({ ...l, lineNo: i + 1 }))
    if (lines.length === 0) throw new DomainError('EMPTY_BILL')
    subtotal = sumPaisa(lines.map((l) => l.lineTotalPaisa))
  } else {
    subtotal = input.amountPaisa ?? 0
    assertPositiveAmount(subtotal)
  }

  const discount = input.billDiscount ?? NO_DISCOUNT
  const totals = computeBillTotals(subtotal, discount, input.roundToTaka)

  const paidNow = input.paidNowPaisa ?? 0
  if (!Number.isSafeInteger(paidNow) || paidNow < 0) throw new DomainError('INVALID_AMOUNT')
  if (paidNow > totals.netPaisa) throw new DomainError('PAID_EXCEEDS_NET')
  const method = paidNow > 0 ? (input.paymentMethod ?? null) : null
  if (paidNow > 0 && method === null) throw new DomainError('METHOD_REQUIRED')
  assertPaisa(input.prevDuePaisa, 'prevDue')

  return {
    ...base('sale', input.customer, input.meta),
    mode: input.mode,
    lines,
    ...totals,
    billDiscount: discount.type === 'none' ? NO_DISCOUNT : { ...discount },
    paidNowPaisa: paidNow,
    paymentMethod: method,
    trxId: method ? (input.trxId ?? '').trim() : '',
    effectPaisa: totals.netPaisa - paidNow,
    memoPrevDuePaisa: input.prevDuePaisa,
    note: (input.note ?? '').trim(),
  }
}

export interface PaymentInput {
  customer: CustomerRef
  prevDuePaisa: Paisa
  amountPaisa: Paisa
  method: PaymentMethod
  trxId?: string
  note?: string
  meta: TxnMeta
}

/** Paying more than the due is allowed; the balance goes negative (অগ্রিম / advance). */
export function buildPayment(input: PaymentInput): TransactionDraft {
  assertPositiveAmount(input.amountPaisa)
  assertPaisa(input.prevDuePaisa, 'prevDue')
  return {
    ...base('payment', input.customer, input.meta),
    netPaisa: input.amountPaisa,
    paidNowPaisa: input.amountPaisa,
    paymentMethod: input.method,
    trxId: (input.trxId ?? '').trim(),
    effectPaisa: -input.amountPaisa,
    memoPrevDuePaisa: input.prevDuePaisa,
    note: (input.note ?? '').trim(),
  }
}

export interface OpeningInput {
  customer: CustomerRef
  amountPaisa: Paisa
  note?: string
  meta: TxnMeta
}

/** Due carried over from the paper khata. */
export function buildOpening(input: OpeningInput): TransactionDraft {
  assertPositiveAmount(input.amountPaisa)
  return {
    ...base('opening', input.customer, input.meta),
    netPaisa: input.amountPaisa,
    effectPaisa: input.amountPaisa,
    note: (input.note ?? '').trim(),
  }
}

export interface AdjustmentInput {
  customer: CustomerRef
  /** Signed: positive adds due, negative reduces it. */
  amountPaisa: Paisa
  /** Reason is required. */
  note: string
  meta: TxnMeta
}

export function buildAdjustment(input: AdjustmentInput): TransactionDraft {
  assertPositiveAmount(Math.abs(input.amountPaisa))
  const note = input.note.trim()
  if (!note) throw new DomainError('REASON_REQUIRED')
  return {
    ...base('adjustment', input.customer, input.meta),
    netPaisa: Math.abs(input.amountPaisa),
    effectPaisa: input.amountPaisa,
    note,
  }
}

export interface VoidResult {
  patch: Pick<Transaction, 'voided' | 'voidedAt' | 'voidedBy' | 'voidReason'>
  /** Apply with increment() in the same batch as the patch. */
  reverseEffectPaisa: Paisa
}

export function buildVoid(
  txn: Pick<Transaction, 'voided' | 'effectPaisa'>,
  reason: string,
  at: Millis,
  by: string,
): VoidResult {
  if (txn.voided) throw new DomainError('ALREADY_VOIDED')
  const r = reason.trim()
  if (!r) throw new DomainError('REASON_REQUIRED')
  return {
    patch: { voided: true, voidedAt: at, voidedBy: by, voidReason: r },
    reverseEffectPaisa: 0 - txn.effectPaisa, // 0 − x avoids -0 for zero-effect bills
  }
}
