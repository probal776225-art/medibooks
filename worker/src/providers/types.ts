export type SendResult =
  | { ok: true; ref: string }
  /** retry: the provider said it did NOT send and a later try may work (e.g. low balance, maintenance). */
  | { ok: false; error: string; retry: boolean }

/** One SMS provider (ARCHITECTURE §8). `to` is 01XXXXXXXXX; the adapter converts it to its own format. */
export interface SmsProvider {
  name: string
  send(to: string, text: string, unicode: boolean): Promise<SendResult>
  /** Remaining balance in taka, if the provider can tell. */
  balance?(): Promise<number>
}
