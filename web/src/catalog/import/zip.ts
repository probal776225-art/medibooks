// Minimal ZIP reader for .xlsx files, using the browser's built-in DecompressionStream (no library).
// Supports stored (0) and deflate (8) entries; ZIP64 is not needed for spreadsheet-sized files.

export interface ZipEntry {
  name: string
  method: number
  compressedSize: number
  offset: number
}

const EOCD = 0x06054b50
const CENTRAL = 0x02014b50
const LOCAL = 0x04034b50

export function listZip(buf: ArrayBuffer): Map<string, ZipEntry> {
  const view = new DataView(buf)
  let eocd = -1
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 22 - 0xffff); i--) {
    if (view.getUint32(i, true) === EOCD) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('Not a ZIP/XLSX file')
  const count = view.getUint16(eocd + 10, true)
  let p = view.getUint32(eocd + 16, true)
  const decoder = new TextDecoder()
  const entries = new Map<string, ZipEntry>()
  for (let i = 0; i < count; i++) {
    if (view.getUint32(p, true) !== CENTRAL) throw new Error('Corrupt ZIP central directory')
    const method = view.getUint16(p + 10, true)
    const compressedSize = view.getUint32(p + 20, true)
    const nameLen = view.getUint16(p + 28, true)
    const extraLen = view.getUint16(p + 30, true)
    const commentLen = view.getUint16(p + 32, true)
    const offset = view.getUint32(p + 42, true)
    if (compressedSize === 0xffffffff || offset === 0xffffffff) throw new Error('ZIP64 files are not supported')
    const name = decoder.decode(new Uint8Array(buf, p + 46, nameLen))
    entries.set(name, { name, method, compressedSize, offset })
    p += 46 + nameLen + extraLen + commentLen
  }
  return entries
}

export async function readZipText(buf: ArrayBuffer, entry: ZipEntry): Promise<string> {
  const view = new DataView(buf)
  if (view.getUint32(entry.offset, true) !== LOCAL) throw new Error(`Corrupt ZIP entry ${entry.name}`)
  const start = entry.offset + 30 + view.getUint16(entry.offset + 26, true) + view.getUint16(entry.offset + 28, true)
  const data = new Uint8Array(buf, start, entry.compressedSize)
  if (entry.method === 0) return new TextDecoder().decode(data)
  if (entry.method !== 8) throw new Error(`Unsupported ZIP compression ${entry.method}`)
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new TextDecoder().decode(await new Response(stream).arrayBuffer())
}
