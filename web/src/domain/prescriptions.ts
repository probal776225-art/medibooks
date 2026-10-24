// Prescription photos (SPEC §15): how big a stored photo may be, and how much of the free space they use.
// A photo must fit in one Firestore document (1 MiB), so it is shrunk on the device before saving.
import type { Millis } from './types'

export const PHOTO_MAX_SIDE = 1400
/** Never shrink the long side below this — the handwriting must stay readable. */
export const PHOTO_MIN_SIDE = 800
export const PHOTO_MAX_BYTES = 700_000
export const PHOTO_START_QUALITY = 0.72
const PHOTO_MIN_QUALITY = 0.5
export const THUMB_SIDE = 240
export const THUMB_QUALITY = 0.6
export const NOTE_MAX = 200
/** Firestore's free (Spark) storage, shared by every record of the shop. */
export const FREE_STORAGE_BYTES = 1024 ** 3

export interface Prescription {
  id: string
  customerId: string
  note: string
  /** JPEG thumbnail for the gallery. */
  thumb: Uint8Array
  width: number
  height: number
  imageBytes: number
  createdAt: Millis
  createdBy: string
}

/** Scale (w, h) down so the long side is at most `maxSide`; never up. */
export function fitWithin(w: number, h: number, maxSide: number): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(w, h, 1))
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) }
}

export interface ShrinkAttempt {
  maxSide: number
  quality: number
}

/** The next try when a photo is still too big: lower the JPEG quality first, then the size. Null = give up. */
export function nextAttempt(a: ShrinkAttempt): ShrinkAttempt | null {
  if (a.quality - 0.08 >= PHOTO_MIN_QUALITY) return { maxSide: a.maxSide, quality: Math.round((a.quality - 0.08) * 100) / 100 }
  if (a.maxSide - 200 >= PHOTO_MIN_SIDE) return { maxSide: a.maxSide - 200, quality: PHOTO_START_QUALITY }
  return null
}

export function cleanNote(note: string): string {
  return note.replace(/\s+/g, ' ').trim().slice(0, NOTE_MAX)
}

/** "1.4 MB", "820 KB" — English digits; the UI converts them. */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}
