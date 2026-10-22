import { describe, expect, it } from 'vitest'
import { cleanPin, idleExpired, isValidPin, lockoutMs, makePinRecord, parsePinRecord, verifyPin } from './pin'

describe('PIN', () => {
  it('accepts 4–6 digits only, Bangla digits too', () => {
    expect(isValidPin('1234')).toBe(true)
    expect(isValidPin('123456')).toBe(true)
    expect(isValidPin('123')).toBe(false)
    expect(isValidPin('1234567')).toBe(false)
    expect(isValidPin('12a4')).toBe(false)
    expect(cleanPin('১২৩৪')).toBe('1234')
    expect(cleanPin('12 34-5678')).toBe('123456')
  })

  it('verifies the right PIN and rejects others', async () => {
    const rec = await makePinRecord('2580', 1000)
    expect(rec.length).toBe(4)
    expect(rec.hash).not.toContain('2580')
    expect(await verifyPin('2580', rec)).toBe(true)
    expect(await verifyPin('2581', rec)).toBe(false)
    expect(await verifyPin('25800', rec)).toBe(false)
    // Same PIN, new salt → different hash.
    const again = await makePinRecord('2580', 1000)
    expect(again.hash).not.toBe(rec.hash)
    expect(await verifyPin('2580', again)).toBe(true)
  })

  it('reads stored records safely', async () => {
    const rec = await makePinRecord('123456', 1000)
    expect(parsePinRecord(JSON.stringify(rec))).toEqual(rec)
    expect(parsePinRecord(null)).toBeNull()
    expect(parsePinRecord('not json')).toBeNull()
    expect(parsePinRecord(JSON.stringify({ ...rec, length: 9 }))).toBeNull()
    expect(parsePinRecord(JSON.stringify({ v: 2 }))).toBeNull()
  })

  it('waits longer after repeated wrong PINs', () => {
    expect(lockoutMs(4)).toBe(0)
    expect(lockoutMs(5)).toBe(30_000)
    expect(lockoutMs(6)).toBe(60_000)
    expect(lockoutMs(30)).toBe(15 * 60_000)
  })

  it('locks after the idle time', () => {
    expect(idleExpired(5 * 60_000, 0, 5)).toBe(true)
    expect(idleExpired(5 * 60_000 - 1, 0, 5)).toBe(false)
  })
})
