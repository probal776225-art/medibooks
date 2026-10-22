// Device PIN lock (SPEC §12): 4–6 digits, PBKDF2-SHA-256 via WebCrypto, stored in this browser only.
// A short PIN keeps casual hands out of an open app; the real protection is the Firebase login behind it.
import { toEnglishDigits } from './digits'
import type { Millis } from './types'

export const PIN_ITERATIONS = 150_000
export const IDLE_MINUTE_CHOICES = [1, 2, 5, 10, 15, 30] as const
export const DEFAULT_IDLE_MINUTES = 5

export interface PinRecord {
  v: 1
  /** base64 */
  salt: string
  /** base64 PBKDF2 output */
  hash: string
  iterations: number
  /** Digits in the PIN, so the lock screen can check as soon as the last one is typed. */
  length: number
}

/** Bangla digits are accepted too; anything else is dropped. */
export function cleanPin(text: string): string {
  return toEnglishDigits(text).replace(/\D/g, '').slice(0, 6)
}

export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin)
}

const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
const fromB64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0))

async function derive(pin: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
  return new Uint8Array(bits)
}

export async function makePinRecord(pin: string, iterations: number = PIN_ITERATIONS): Promise<PinRecord> {
  if (!isValidPin(pin)) throw new Error('PIN must be 4–6 digits')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return { v: 1, salt: toB64(salt), hash: toB64(await derive(pin, salt, iterations)), iterations, length: pin.length }
}

export async function verifyPin(pin: string, record: PinRecord): Promise<boolean> {
  if (pin.length !== record.length) return false
  const actual = await derive(pin, fromB64(record.salt), record.iterations)
  const expected = fromB64(record.hash)
  if (actual.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < actual.length; i++) diff |= (actual[i] ?? 0) ^ (expected[i] ?? 0)
  return diff === 0
}

/** Whatever is in storage, or null when it is missing or not a PIN record. */
export function parsePinRecord(text: string | null): PinRecord | null {
  if (!text) return null
  try {
    const r = JSON.parse(text) as Partial<PinRecord>
    const ok =
      r.v === 1 &&
      typeof r.salt === 'string' &&
      typeof r.hash === 'string' &&
      typeof r.iterations === 'number' &&
      r.iterations > 0 &&
      typeof r.length === 'number' &&
      r.length >= 4 &&
      r.length <= 6
    return ok ? (r as PinRecord) : null
  } catch {
    return null
  }
}

/** Wait after wrong PINs: none for the first 4, then 30 s, doubling up to 15 min. */
export function lockoutMs(failures: number): number {
  if (failures < 5) return 0
  return Math.min(30_000 * 2 ** (failures - 5), 15 * 60_000)
}

export function idleExpired(now: Millis, lastActivity: Millis, idleMinutes: number): boolean {
  return now - lastActivity >= idleMinutes * 60_000
}
