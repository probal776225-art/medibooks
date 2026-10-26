/** Codes are stable so the UI can map them to bn/en messages. */
export type DomainErrorCode =
  | 'EMPTY_BILL'
  | 'INVALID_QTY'
  | 'INVALID_PRICE'
  | 'INVALID_AMOUNT'
  | 'LINE_DISCOUNT_EXCEEDS'
  | 'BILL_DISCOUNT_EXCEEDS'
  | 'INVALID_PERCENT'
  | 'PAID_EXCEEDS_NET'
  | 'METHOD_REQUIRED'
  | 'UNIT_NOT_AVAILABLE'
  | 'NAME_REQUIRED'
  | 'REASON_REQUIRED'
  | 'ALREADY_VOIDED'
  | 'INVALID_MOBILE'
  | 'INVALID_URL'
  | 'MOBILE_TAKEN'
  | 'SAME_MOBILE'
  | 'CUSTOMER_HAS_HISTORY'

export class DomainError extends Error {
  readonly code: DomainErrorCode

  constructor(code: DomainErrorCode, message?: string) {
    super(message ?? code)
    this.name = 'DomainError'
    this.code = code
  }
}
