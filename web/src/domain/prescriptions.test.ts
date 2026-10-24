import { describe, expect, it } from 'vitest'
import { cleanNote, fitWithin, formatBytes, nextAttempt, PHOTO_MAX_SIDE, PHOTO_MIN_SIDE, PHOTO_START_QUALITY } from './prescriptions'

describe('prescription photos', () => {
  it('shrinks the long side only, never enlarges', () => {
    expect(fitWithin(4000, 3000, 1400)).toEqual({ width: 1400, height: 1050 })
    expect(fitWithin(3000, 4000, 1400)).toEqual({ width: 1050, height: 1400 })
    expect(fitWithin(800, 600, 1400)).toEqual({ width: 800, height: 600 })
  })

  it('lowers quality first, then size, then gives up', () => {
    let a = nextAttempt({ maxSide: PHOTO_MAX_SIDE, quality: PHOTO_START_QUALITY })
    expect(a).toEqual({ maxSide: PHOTO_MAX_SIDE, quality: 0.64 })
    const seen = []
    while (a) {
      seen.push(a)
      a = nextAttempt(a)
    }
    expect(seen.at(-1)?.maxSide).toBe(PHOTO_MIN_SIDE)
    expect(seen.every((x) => x.quality >= 0.5)).toBe(true)
    expect(seen.length).toBeLessThan(20)
  })

  it('cleans notes and formats sizes', () => {
    expect(cleanNote('  ডা.  করিম \n জ্বর ')).toBe('ডা. করিম জ্বর')
    expect(cleanNote('x'.repeat(300))).toHaveLength(200)
    expect(formatBytes(300_000)).toBe('293 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
  })
})
