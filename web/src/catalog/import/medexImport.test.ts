import { deflateRawSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { mapMedexSheets, refUrl } from './medexRef'
import { packRefCatalog, sha256Hex, unpackRefCatalog } from './refPack'
import { readXlsx } from './xlsx'

/** Build a tiny .xlsx (ZIP) in memory: deflated entries, enough for our reader. */
function makeZip(files: Record<string, string>): ArrayBuffer {
  const enc = new TextEncoder()
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  for (const [name, content] of Object.entries(files)) {
    const nameBytes = enc.encode(name)
    const data = new Uint8Array(deflateRawSync(enc.encode(content)))
    const local = new Uint8Array(30 + nameBytes.length + data.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(8, 8, true)
    lv.setUint32(18, data.length, true)
    lv.setUint16(26, nameBytes.length, true)
    local.set(nameBytes, 30)
    local.set(data, 30 + nameBytes.length)
    const central = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(10, 8, true)
    cv.setUint32(20, data.length, true)
    cv.setUint16(28, nameBytes.length, true)
    cv.setUint32(42, offset, true)
    central.set(nameBytes, 46)
    locals.push(local)
    centrals.push(central)
    offset += local.length
  }
  const centralSize = centrals.reduce((n, c) => n + c.length, 0)
  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, centrals.length, true)
  ev.setUint16(10, centrals.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)
  const out = new Uint8Array(offset + centralSize + 22)
  let p = 0
  for (const part of [...locals, ...centrals, eocd]) {
    out.set(part, p)
    p += part.length
  }
  return out.buffer
}

const inline = (r: string, v: string) => `<c r="${r}" t="inlineStr"><is><t>${v}</t></is></c>`
const HEADER = ['ID', 'Brand Name', 'Dosage Form', 'Strength', 'Generic Name', 'Company', 'MedEx Link']
const row = (n: number, cells: string[]) =>
  `<row r="${n}">${cells.map((v, i) => inline(`${String.fromCharCode(65 + i)}${n}`, v)).join('')}</row>`

const workbook = `<workbook><sheets>
  <sheet name="Brands (Allopathic)" sheetId="1" r:id="rId1"/>
  <sheet name="Brands (Herbal)" sheetId="2" r:id="rId2"/>
  <sheet name="Companies" sheetId="3" r:id="rId3"/>
</sheets></workbook>`
const rels = `<Relationships>
  <Relationship Id="rId1" Type="x" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="x" Target="/xl/worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="x" Target="worksheets/sheet3.xml"/>
</Relationships>`
const sheet1 = `<worksheet><sheetData>
  ${row(1, HEADER)}
  ${row(2, ['13717', '3 Bion', 'Tablet', '100 mg+200 mg+200 mcg', 'Vitamin B1, B6 &amp; B12', 'Jenphar Bangladesh Ltd.', 'https://medex.com.bd/brands/13717/3-bion-100-mg-tablet'])}
  ${row(3, ['7695', '3-C', 'Capsule', '', 'Cefixime Trihydrate', 'Edruc Limited', 'https://medex.com.bd/brands/7695/3-c-200-mg-capsule'])}
  ${row(4, ['999', 'Broken link', 'Tablet', '', 'X', 'Y', 'https://example.com/brands/999/x'])}
  ${row(5, ['', '', '', '', '', '', ''])}
</sheetData></worksheet>`
// Herbal sheet written the way Excel does: shared strings + a numeric id cell.
const shared = `<sst><si><t>ID</t></si><si><t>Brand Name</t></si><si><t>Dosage Form</t></si><si><t>Strength</t></si>
  <si><t>Generic Name</t></si><si><t>Company</t></si><si><t>MedEx Link</t></si>
  <si><r><t>Acme's </t></r><r><t>Basok</t></r></si><si><t>Syrup</t></si><si><t>Vasaka</t></si><si><t>ACME Laboratories Ltd.</t></si>
  <si><t>https://medex.com.bd/brands/29707/acmes-basok-syrup</t></si></sst>`
const s = (r: string, i: number) => `<c r="${r}" t="s"><v>${i}</v></c>`
const sheet2 = `<worksheet><sheetData>
  <row r="1">${[0, 1, 2, 3, 4, 5, 6].map((i) => s(`${String.fromCharCode(65 + i)}1`, i)).join('')}</row>
  <row r="2"><c r="A2"><v>29707</v></c>${s('B2', 7)}${s('C2', 8)}${s('E2', 9)}${s('F2', 10)}${s('G2', 11)}</row>
</sheetData></worksheet>`
const sheet3 = `<worksheet><sheetData>${row(1, ['ID', 'Company Name'])}${row(2, ['3', 'ACME'])}</sheetData></worksheet>`

const xlsx = makeZip({
  'xl/workbook.xml': workbook,
  'xl/_rels/workbook.xml.rels': rels,
  'xl/sharedStrings.xml': shared,
  'xl/worksheets/sheet1.xml': sheet1,
  'xl/worksheets/sheet2.xml': sheet2,
  'xl/worksheets/sheet3.xml': sheet3,
})

describe('readXlsx', () => {
  it('reads inline strings, shared strings (rich text), numbers and gaps', async () => {
    const sheets = await readXlsx(xlsx)
    expect(sheets.map((x) => x.name)).toEqual(['Brands (Allopathic)', 'Brands (Herbal)', 'Companies'])
    expect(sheets[0]!.rows[1]![4]).toBe('Vitamin B1, B6 & B12')
    expect(sheets[1]!.rows[1]).toEqual([
      '29707',
      "Acme's Basok",
      'Syrup',
      '',
      'Vasaka',
      'ACME Laboratories Ltd.',
      'https://medex.com.bd/brands/29707/acmes-basok-syrup',
    ])
  })

  it('rejects non-xlsx data', async () => {
    await expect(readXlsx(new TextEncoder().encode('hello').buffer)).rejects.toThrow()
  })
})

describe('mapMedexSheets', () => {
  it('maps brand sheets, flags herbal, skips bad rows, ignores other sheets', async () => {
    const result = mapMedexSheets(await readXlsx(xlsx))
    expect(result.sheetsUsed).toEqual(['Brands (Allopathic)', 'Brands (Herbal)'])
    expect(result.items.map((i) => i.id)).toEqual(['13717', '7695', '29707'])
    expect(result.herbalCount).toBe(1)
    expect(result.skipped).toBe(1) // the broken link; the empty row is not counted
    expect(result.items[0]).toEqual({
      id: '13717',
      brandName: '3 Bion',
      dosageForm: 'Tablet',
      strength: '100 mg+200 mg+200 mcg',
      genericName: 'Vitamin B1, B6 & B12',
      manufacturer: 'Jenphar Bangladesh Ltd.',
      slug: '3-bion-100-mg-tablet',
      herbal: false,
    })
    expect(refUrl(result.items[2]!)).toBe('https://medex.com.bd/brands/29707/acmes-basok-syrup')
  })
})

describe('refPack', () => {
  it('round-trips and splits into size-limited chunks', async () => {
    const { items } = mapMedexSheets(await readXlsx(xlsx))
    const many = Array.from({ length: 3000 }, (_, i) => ({ ...items[i % items.length]!, id: String(i + 1) }))
    const packed = packRefCatalog(many, 50_000)
    expect(packed.chunks.length).toBeGreaterThan(1)
    for (const c of packed.chunks) expect(new TextEncoder().encode(c).length).toBeLessThanOrEqual(50_000)
    expect(unpackRefCatalog(packed.dict, packed.chunks)).toEqual(many)
    expect(JSON.parse(packed.dict).companies).toEqual(['Jenphar Bangladesh Ltd.', 'Edruc Limited', 'ACME Laboratories Ltd.'])
  })

  it('hashes content for the version', async () => {
    const a = await sha256Hex(new TextEncoder().encode('a').buffer)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(await sha256Hex(new TextEncoder().encode('a').buffer)).toBe(a)
  })
})
