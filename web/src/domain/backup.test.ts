import { describe, expect, it } from 'vitest'
import {
  BACKUP_APP,
  BACKUP_COLLECTIONS,
  customersCsv,
  daysSinceBackup,
  decodeValue,
  encodeValue,
  liveVersion,
  parseBackup,
  summarizeBackup,
  type BackupFile,
  type TimestampLike,
} from './backup'
import { makeCustomer } from './fixtures'

class FakeTs implements TimestampLike {
  readonly seconds: number
  readonly nanoseconds: number
  constructor(seconds: number, nanoseconds: number) {
    this.seconds = seconds
    this.nanoseconds = nanoseconds
  }
}
const isTs = (v: unknown): v is FakeTs => v instanceof FakeTs

function backupWith(collections: Partial<BackupFile['collections']>): BackupFile {
  const all = Object.fromEntries(BACKUP_COLLECTIONS.map((c) => [c, collections[c] ?? []])) as BackupFile['collections']
  return {
    app: BACKUP_APP,
    format: 1,
    shopId: 'main',
    backupId: 'b1',
    exportedAt: 1_700_000_000_000,
    exportedBy: 'u1',
    counts: Object.fromEntries(BACKUP_COLLECTIONS.map((c) => [c, all[c].length])) as BackupFile['counts'],
    collections: all,
  }
}

describe('backup encoding', () => {
  it('round-trips timestamps exactly, nested in maps and arrays', () => {
    const data = {
      createdAt: new FakeTs(1_700_000_000, 123_456_789),
      lines: [{ name: 'Napa', at: new FakeTs(1, 2) }],
      note: null,
      effectPaisa: 57_000,
      tags: ['a'],
    }
    const json = JSON.parse(JSON.stringify(encodeValue(data, isTs))) as unknown
    expect(json).toMatchObject({ createdAt: { $ts: [1_700_000_000, 123_456_789] } })
    expect(decodeValue(json, (s, ns) => new FakeTs(s, ns))).toEqual(data)
  })

  it('round-trips bytes as base64', () => {
    const toB64 = (v: unknown) => (v instanceof Uint8Array ? btoa(String.fromCharCode(...v)) : null)
    const data = { image: new Uint8Array([255, 216, 255, 0, 7]), note: 'x' }
    const json = JSON.parse(JSON.stringify(encodeValue(data, isTs, toB64))) as unknown
    expect(json).toEqual({ image: { $bytes: '/9j/AAc=' }, note: 'x' })
    const back = decodeValue(json, (s, ns) => new FakeTs(s, ns), (b) => Uint8Array.from(atob(b), (c) => c.charCodeAt(0)))
    expect(back).toEqual(data)
  })

  it('leaves look-alike maps alone', () => {
    const v = { $ts: [1, 2], other: 1 }
    expect(decodeValue(v, (s, ns) => new FakeTs(s, ns))).toEqual(v)
  })
})

describe('parseBackup', () => {
  it('accepts a backup of this shop and rejects everything else', () => {
    const good = JSON.stringify(backupWith({}))
    expect('backup' in parseBackup(good, 'main')).toBe(true)
    expect(parseBackup('{oops', 'main')).toEqual({ problem: 'notJson' })
    expect(parseBackup('{"app":"other"}', 'main')).toEqual({ problem: 'notBackup' })
    expect(parseBackup(good.replace('"format":1', '"format":9'), 'main')).toEqual({ problem: 'newerFormat' })
    expect(parseBackup(good, 'shop2')).toEqual({ problem: 'otherShop' })
    // A file from before the photo collections existed still opens (they count as empty).
    const old = backupWith({}) as unknown as { collections: Record<string, unknown> }
    delete old.collections.prescriptions
    delete old.collections.prescriptionImages
    delete old.collections.stats
    const parsed = parseBackup(JSON.stringify(old), 'main')
    expect('backup' in parsed && parsed.backup.collections.prescriptions).toEqual([])
    const broken = { ...backupWith({}), collections: { customers: [{ id: '', data: {} }] } }
    expect(parseBackup(JSON.stringify(broken), 'main')).toEqual({ problem: 'broken' })
  })
})

describe('summarizeBackup', () => {
  it('totals the market and finds dues that do not match their transactions', () => {
    const b = backupWith({
      customers: [
        { id: '01711111111', data: { name: 'A', totalDuePaisa: 50_000 } },
        { id: '01722222222', data: { name: 'B', totalDuePaisa: 10_000 } },
      ],
      transactions: [
        { id: 't1', data: { customerId: '01711111111', effectPaisa: 60_000, voided: false } },
        { id: 't2', data: { customerId: '01711111111', effectPaisa: -10_000, voided: false } },
        { id: 't3', data: { customerId: '01711111111', effectPaisa: 99_900, voided: true } },
        { id: 't4', data: { customerId: '01722222222', effectPaisa: 9_000, voided: false } },
        { id: 't5', data: { customerId: '01999999999', effectPaisa: 1, voided: false } },
      ],
    })
    const s = summarizeBackup(b)
    expect(s.marketDuePaisa).toBe(60_000)
    expect(s.counts.transactions).toBe(5)
    expect(s.orphanTransactions).toBe(1)
    expect(s.mismatches).toEqual([{ mobile: '01722222222', name: 'B', storedPaisa: 10_000, computedPaisa: 9_000 }])
  })
})

describe('restore helpers', () => {
  it('creates voided transactions as live first', () => {
    expect(liveVersion({ effectPaisa: 5, voided: true, voidReason: 'ভুল', voidedBy: 'u', voidedAt: 1 })).toEqual({
      effectPaisa: 5,
      voided: false,
      voidReason: '',
      voidedBy: null,
      voidedAt: null,
    })
  })

  it('counts days since the last backup', () => {
    expect(daysSinceBackup(0, 1_000)).toBeNull()
    expect(daysSinceBackup(0 + 1, 7 * 86_400_000 + 1)).toBe(7)
  })
})

describe('customersCsv', () => {
  it('lists customers by due with taka amounts and quoted text', () => {
    const csv = customersCsv(
      [
        makeCustomer({ mobile: '01711111111', name: 'Rahim, Sr', totalDuePaisa: 12_345 }),
        makeCustomer({ mobile: '01722222222', name: 'করিম', totalDuePaisa: 99_900 }),
      ],
      () => 'd',
    )
    const lines = csv.trim().split('\n')
    expect(lines[0]).toBe('name,mobile,address,total_due_taka,last_payment,last_transaction,added,archived,note')
    expect(lines[1]).toContain('করিম,01722222222')
    expect(lines[1]).toContain('999.00')
    expect(lines[2]).toContain('"Rahim, Sr",01711111111')
    expect(lines[2]).toContain('123.45')
  })
})
