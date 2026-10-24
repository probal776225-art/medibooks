// Shrink a camera photo in the browser (canvas → JPEG) so it fits one Firestore document, plus a thumbnail.
import {
  fitWithin,
  nextAttempt,
  PHOTO_MAX_BYTES,
  PHOTO_MAX_SIDE,
  PHOTO_START_QUALITY,
  THUMB_QUALITY,
  THUMB_SIDE,
  type ShrinkAttempt,
} from '../domain/prescriptions'

export interface ShrunkPhoto {
  image: Uint8Array
  thumb: Uint8Array
  width: number
  height: number
}

export class PhotoTooBigError extends Error {}

async function toJpeg(source: ImageBitmap, maxSide: number, quality: number): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const { width, height } = fitWithin(source.width, source.height, maxSide)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No canvas')
  // White under transparent pixels (PNG screenshots) instead of black.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(source, 0, 0, width, height)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  if (!blob) throw new Error('Could not encode the photo')
  return { bytes: new Uint8Array(await blob.arrayBuffer()), width, height }
}

/** The browser applies the photo's EXIF rotation while decoding, so portrait shots stay upright. */
export async function shrinkPhoto(file: Blob): Promise<ShrunkPhoto> {
  const bitmap = await createImageBitmap(file)
  try {
    let attempt: ShrinkAttempt | null = { maxSide: PHOTO_MAX_SIDE, quality: PHOTO_START_QUALITY }
    while (attempt) {
      const out = await toJpeg(bitmap, attempt.maxSide, attempt.quality)
      if (out.bytes.length <= PHOTO_MAX_BYTES) {
        const thumb = await toJpeg(bitmap, THUMB_SIDE, THUMB_QUALITY)
        return { image: out.bytes, thumb: thumb.bytes, width: out.width, height: out.height }
      }
      attempt = nextAttempt(attempt)
    }
    throw new PhotoTooBigError('Photo too big even after shrinking')
  } finally {
    bitmap.close()
  }
}

/** Firestore hands back a plain Uint8Array view; copy it into a Blob-friendly one. */
export function jpegBlob(bytes: Uint8Array): Blob {
  return new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' })
}

export function jpegUrl(bytes: Uint8Array): string {
  return URL.createObjectURL(jpegBlob(bytes))
}
