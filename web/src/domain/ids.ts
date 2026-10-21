// Offline-safe identifiers: no counters, no server round-trip.
import { yymmdd } from './dates'
import type { Millis, TxnType } from './types'

/** 32 symbols without look-alikes (0/O, 1/I) — 256 is a multiple of 32, so no modulo bias. */
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

export type RandomBytes = (n: number) => Uint8Array

const cryptoBytes: RandomBytes = (n) => crypto.getRandomValues(new Uint8Array(n))

export function randomCode(length: number, rng: RandomBytes = cryptoBytes): string {
  let out = ''
  for (const b of rng(length)) out += ALPHABET[b % ALPHABET.length]
  return out
}

export const MEMO_PREFIX: Record<TxnType, string> = {
  sale: 'B',
  payment: 'J',
  opening: 'O',
  adjustment: 'A',
}

/** 'B-261022-4F7K' — prefix by type, Dhaka date, 4 random symbols. Display only; not a unique key. */
export function makeMemoNo(type: TxnType, now: Millis, rng: RandomBytes = cryptoBytes): string {
  return `${MEMO_PREFIX[type]}-${yymmdd(now)}-${randomCode(4, rng)}`
}

const DEVICE_KEY = 'baki.deviceId'

/** Stable per-browser id stored in localStorage (audit trail: which device wrote what). */
export function getOrCreateDeviceId(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  rng: RandomBytes = cryptoBytes,
): string {
  const existing = storage.getItem(DEVICE_KEY)
  if (existing) return existing
  const id = `D-${randomCode(10, rng)}`
  storage.setItem(DEVICE_KEY, id)
  return id
}
