// Turn a React element into a PNG (SPEC §11): 576 px wide (80 mm thermal printer width), pixel ratio 2, white.
// Loaded on demand (dynamic import) so html-to-image is not in the start-up bundle.
// html-to-image draws through the browser's own text engine, so Bangla conjuncts come out right (html2canvas does not).
import { getFontEmbedCSS, toPng } from 'html-to-image'
import type { ReactElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

import { PRINT_WIDTH } from './printWidth'

export { PRINT_WIDTH }

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
