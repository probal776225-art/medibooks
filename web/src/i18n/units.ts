import type { SaleLine } from '../domain/types'
import type { MessageKey, TranslateVars } from '.'

type T = (key: MessageKey, vars?: TranslateVars) => string

/** "২ স্ট্রিপ (১০)" style unit text for a sale line, in the current language. */
export function unitText(t: T, l: Pick<SaleLine, 'unit' | 'unitLabel' | 'piecesPerUnit'>): string {
  if (l.unit === 'custom') return l.unitLabel ?? ''
  if (l.unit === 'piece') return t('sale.unitPiece')
  return t(l.unit === 'strip' ? 'sale.unitStrip' : 'sale.unitPack', { n: l.piecesPerUnit ?? '' })
}

