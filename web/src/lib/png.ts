// Turn a React element into a PNG (SPEC §11): 576 px wide (80 mm thermal printer width), pixel ratio 2, white.
// html-to-image draws through the browser's own text engine, so Bangla conjuncts come out right (html2canvas does not).
import { getFontEmbedCSS, toPng } from 'html-to-image'
import type { ReactElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

export const PRINT_WIDTH = 576

/** The @font-face CSS (Hind Siliguri, as data URLs) is built once per session; it is the slow part. */
let fontCss: Promise<string> | null = null

const nextTick = () => new Promise((r) => setTimeout(r, 0))

export async function renderToPng(element: ReactElement): Promise<Blob> {
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${PRINT_WIDTH}px;background:#fff;`
  document.body.appendChild(host)
  const root = createRoot(host)
  try {
    flushSync(() => root.render(element))
    await document.fonts.ready
    await nextTick()
    const node = host.firstElementChild as HTMLElement
    fontCss ??= getFontEmbedCSS(node).catch((e: unknown) => {
      fontCss = null
      throw e
    })
    const dataUrl = await toPng(node, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      width: PRINT_WIDTH,
      fontEmbedCSS: await fontCss,
    })
    return await (await fetch(dataUrl)).blob()
  } finally {
    root.unmount()
    host.remove()
  }
}

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
