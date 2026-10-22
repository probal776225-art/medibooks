// Share or save a generated file (memo / statement / report image).

export function canShareFile(file: File): boolean {
  return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })
}

/** Share sheet where the device supports sharing files (Android → WhatsApp etc.); otherwise a normal download. */
export async function shareFile(file: File, title: string): Promise<'shared' | 'cancelled' | 'failed'> {
  try {
    await navigator.share({ files: [file], title })
    return 'shared'
  } catch (e) {
    return e instanceof DOMException && e.name === 'AbortError' ? 'cancelled' : 'failed'
  }
}

export function downloadFile(file: File): void {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
