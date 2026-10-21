// Read sheets of an .xlsx as rows of strings. Handles inline strings and the shared-strings table.
import { listZip, readZipText } from './zip'

export interface Sheet {
  name: string
  /** rows[r][c] — missing cells are ''. */
  rows: string[][]
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

function decode(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (whole, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole
    }
    return ENTITIES[e.toLowerCase()] ?? whole
  })
}

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const m of tag.matchAll(/([\w:]+)="([^"]*)"/g)) out[m[1]!] = decode(m[2]!)
  return out
}

/** All <t> texts inside a fragment (rich text runs are concatenated). */
function texts(fragment: string): string {
  let out = ''
  for (const m of fragment.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)) out += m[1]
  return decode(out)
}

function columnIndex(ref: string): number {
  let n = 0
  for (const ch of ref) {
    const c = ch.charCodeAt(0)
    if (c < 65 || c > 90) break
    n = n * 26 + (c - 64)
  }
  return n - 1
}

function parseSheet(xml: string, shared: string[]): string[][] {
  const rows: string[][] = []
  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: string[] = []
    for (const c of rowMatch[1]!.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const a = attrs(c[1]!)
      const body = c[2] ?? ''
      let value = ''
      if (a.t === 'inlineStr') value = texts(body)
      else {
        const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1]
        if (v !== undefined) value = a.t === 's' ? (shared[Number(v)] ?? '') : decode(v)
      }
      const col = a.r ? columnIndex(a.r) : row.length
      while (row.length < col) row.push('')
      row[col] = value
    }
    rows.push(row)
  }
  return rows
}

export async function readXlsx(buf: ArrayBuffer, wantSheet: (name: string) => boolean = () => true): Promise<Sheet[]> {
  const zip = listZip(buf)
  const text = async (path: string) => {
    const entry = zip.get(path)
    return entry ? readZipText(buf, entry) : null
  }
  const workbook = await text('xl/workbook.xml')
  const rels = await text('xl/_rels/workbook.xml.rels')
  if (!workbook || !rels) throw new Error('Not an Excel (.xlsx) file')

  const targets = new Map<string, string>()
  for (const m of rels.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const a = attrs(m[1]!)
    if (a.Id && a.Target) targets.set(a.Id, a.Target.replace(/^\/?xl\//, '').replace(/^\//, ''))
  }

  const sharedXml = await text('xl/sharedStrings.xml')
  const shared = sharedXml ? [...sharedXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((m) => texts(m[1]!)) : []

  const sheets: Sheet[] = []
  for (const m of workbook.matchAll(/<sheet\b([^>]*)\/?>/g)) {
    const a = attrs(m[1]!)
    const name = a.name ?? ''
    const target = targets.get(a['r:id'] ?? '')
    if (!target || !wantSheet(name)) continue
    const xml = await text(`xl/${target}`)
    if (xml) sheets.push({ name, rows: parseSheet(xml, shared) })
  }
  return sheets
}
