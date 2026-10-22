// The New Baki screen's working state (what the owner is typing) → live totals → final sale transaction.
// Inputs stay as text so half-typed values never crash; everything is validated here, not in the UI.
import { buildSale, computeBillTotals, NO_DISCOUNT, type BillTotals, type CustomerRef, type TxnMeta } from './billing'
import { DomainError, type DomainErrorCode } from './errors'
import { parseMoney, parsePercentToBp } from './money'
import { buildSaleLine, effectiveUnitPrice, type StandardUnit } from './pricing'
import type { BillDiscount, Medicine, Paisa, PaymentMethod, SaleLine, SaleMode, SaleUnit, TransactionDraft } from './types'

export interface DraftLine {
  key: string
  /** null = free-text item (no medicine). */
  medicineId: string | null
  /** Free-text item name (ignored when medicineId is set). */
  name: string
  unit: SaleUnit
  /** Custom unit label, e.g. "১ পাতা". */
  customLabel: string
  qty: number
  priceText: string
  discountText: string
}

export interface SaleDraft {
  customerMobile: string | null
  mode: SaleMode
  lines: DraftLine[]
  amountText: string
  discountType: BillDiscount['type']
  discountText: string
  paidText: string
  method: PaymentMethod | null
  trxId: string
  note: string
}

export const EMPTY_DRAFT: SaleDraft = {
  customerMobile: null,
  mode: 'items',
  lines: [],
  amountText: '',
  discountType: 'none',
  discountText: '',
  paidText: '',
  method: null,
  trxId: '',
  note: '',
}

/** Price text for a unit from the medicine's effective price ('' if unknown). */
export function defaultPriceText(m: Medicine | null, unit: SaleUnit): string {
  if (!m || unit === 'custom') return ''
  const p = effectiveUnitPrice(m, unit)
  return p === null ? '' : paisaToText(p)
}

export function paisaToText(p: Paisa): string {
  const taka = Math.floor(p / 100)
  const frac = p % 100
  return frac === 0 ? String(taka) : `${taka}.${String(frac).padStart(2, '0')}`
}

export function newDraftLine(key: string, m: Medicine | null, unit: SaleUnit = 'piece', name = ''): DraftLine {
  return {
    key,
    medicineId: m?.id ?? null,
    name: m ? '' : name,
    unit: m ? unit : 'custom',
    customLabel: '',
    qty: 1,
    priceText: defaultPriceText(m, unit),
    discountText: '',
  }
}

function money(text: string, emptyAs: Paisa | null, code: DomainErrorCode): Paisa | null {
  if (!text.trim()) return emptyAs
  const p = parseMoney(text)
  if (p === null) throw new DomainError(code)
  return p
}

/** Turn one draft line into its snapshot, using the medicine as it is right now. */
export function evaluateLine(line: DraftLine, lineNo: number, medicines: ReadonlyMap<string, Medicine>): SaleLine {
  const m = line.medicineId ? (medicines.get(line.medicineId) ?? null) : null
  if (line.medicineId && !m) throw new DomainError('UNIT_NOT_AVAILABLE', 'medicine not on this device')
  const price = money(line.priceText, null, 'INVALID_PRICE')
  const discountPaisa = money(line.discountText, 0, 'INVALID_PRICE') ?? 0
  if (line.unit === 'custom') {
    if (price === null) throw new DomainError('INVALID_PRICE')
    return buildSaleLine({
      lineNo,
      medicine: m,
      name: line.name,
      unit: 'custom',
      unitLabel: line.customLabel.trim() || '১টি',
      qty: line.qty,
      unitPricePaisa: price,
      discountPaisa,
    })
  }
  if (!m) throw new DomainError('UNIT_NOT_AVAILABLE')
  return buildSaleLine({
    lineNo,
    medicine: m,
    unit: line.unit as StandardUnit,
    qty: line.qty,
    ...(price === null ? {} : { unitPricePaisa: price }),
    discountPaisa,
  })
}

export interface DraftEvaluation {
  lines: (SaleLine | null)[]
  lineErrors: (DomainErrorCode | null)[]
  /** null while the bill cannot be totalled yet (e.g. a bad line or bad discount). */
  totals: BillTotals | null
  paidNowPaisa: Paisa
  /** Change to the customer's due if saved now. */
  effectPaisa: Paisa | null
  /** First problem that blocks saving. */
  error: DomainErrorCode | null
}

function billDiscount(draft: SaleDraft): BillDiscount {
  if (draft.discountType === 'none' || !draft.discountText.trim()) return NO_DISCOUNT
  if (draft.discountType === 'percent') {
    const bp = parsePercentToBp(draft.discountText)
    if (bp === null) throw new DomainError('INVALID_PERCENT')
    return { type: 'percent', value: bp }
  }
  const flat = parseMoney(draft.discountText)
  if (flat === null) throw new DomainError('INVALID_AMOUNT')
  return { type: 'flat', value: flat }
}

const codeOf = (e: unknown): DomainErrorCode => (e instanceof DomainError ? e.code : 'INVALID_AMOUNT')

export function evaluateDraft(
  draft: SaleDraft,
  medicines: ReadonlyMap<string, Medicine>,
  roundToTaka: boolean,
): DraftEvaluation {
  const lines: (SaleLine | null)[] = []
  const lineErrors: (DomainErrorCode | null)[] = []
  let error: DomainErrorCode | null = null
  let subtotal: Paisa | null = 0

  if (draft.mode === 'items') {
    draft.lines.forEach((l, i) => {
      try {
        const line = evaluateLine(l, i + 1, medicines)
        lines.push(line)
        lineErrors.push(null)
        if (subtotal !== null) subtotal += line.lineTotalPaisa
      } catch (e) {
        lines.push(null)
        lineErrors.push(codeOf(e))
        error ??= codeOf(e)
        subtotal = null
      }
    })
    if (draft.lines.length === 0) error ??= 'EMPTY_BILL'
  } else {
    const amount = parseMoney(draft.amountText)
    if (amount === null || amount <= 0) {
      subtotal = null
      error ??= 'INVALID_AMOUNT'
    } else subtotal = amount
  }

  let totals: BillTotals | null = null
  if (subtotal !== null) {
    try {
      totals = computeBillTotals(subtotal, billDiscount(draft), roundToTaka)
    } catch (e) {
      error ??= codeOf(e)
    }
  }

  let paidNowPaisa = 0
  try {
    paidNowPaisa = money(draft.paidText, 0, 'INVALID_AMOUNT') ?? 0
  } catch (e) {
    error ??= codeOf(e)
  }
  if (totals && paidNowPaisa > totals.netPaisa) error ??= 'PAID_EXCEEDS_NET'
  if (paidNowPaisa > 0 && !draft.method) error ??= 'METHOD_REQUIRED'

  return {
    lines,
    lineErrors,
    totals,
    paidNowPaisa,
    effectPaisa: totals ? totals.netPaisa - paidNowPaisa : null,
    error,
  }
}

/** Final transaction from the draft. Throws DomainError if anything is invalid. */
export function draftToSale(
  draft: SaleDraft,
  ctx: {
    customer: CustomerRef
    prevDuePaisa: Paisa
    medicines: ReadonlyMap<string, Medicine>
    roundToTaka: boolean
    meta: TxnMeta
  },
): TransactionDraft {
  const ev = evaluateDraft(draft, ctx.medicines, ctx.roundToTaka)
  if (ev.error) throw new DomainError(ev.error)
  return buildSale({
    customer: ctx.customer,
    prevDuePaisa: ctx.prevDuePaisa,
    mode: draft.mode,
    lines: ev.lines.filter((l): l is SaleLine => l !== null),
    amountPaisa: draft.mode === 'amount' ? (parseMoney(draft.amountText) ?? 0) : undefined,
    billDiscount: billDiscount(draft),
    roundToTaka: ctx.roundToTaka,
    paidNowPaisa: ev.paidNowPaisa,
    paymentMethod: draft.method,
    trxId: draft.trxId,
    note: draft.note,
    meta: ctx.meta,
  })
}
