// Small browser file helpers for imports and backups.
import Papa from 'papaparse'

/** Save text as a file. CSVs get a UTF-8 BOM so Excel shows Bangla correctly. */
export function downloadText(fileName: string, text: string): void {
  const bom = fileName.endsWith('.csv') ? '﻿' : ''
  const type = fileName.endsWith('.json') ? 'application/json' : 'text/csv;charset=utf-8'
  const url = URL.createObjectURL(new Blob([bom + text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Parse a CSV file with a header row; every value is a string. */
export async function readCsv(file: File): Promise<Record<string, string>[]> {
  const text = (await file.text()).replace(/^﻿/, '')
  const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: 'greedy' })
  if (result.errors.some((e) => e.type === 'Delimiter') && result.data.length === 0) throw new Error('Not a CSV file')
  return result.data
}

export async function sha256OfFile(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
