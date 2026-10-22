// The bill being written. Autosaved to Dexie so a closed tab or dead battery does not lose it.
import { create } from 'zustand'
import { localDb } from '../../data/localdb'
import { EMPTY_DRAFT, newDraftLine, type DraftLine, type SaleDraft } from '../../domain/saleDraft'
import type { Medicine, SaleUnit } from '../../domain/types'

interface SaleState {
  draft: SaleDraft
  loaded: boolean
}

export const useSaleStore = create<SaleState>()(() => ({ draft: EMPTY_DRAFT, loaded: false }))

let seq = 0
const lineKey = () => `l${Date.now().toString(36)}${(seq++).toString(36)}`

let saveTimer: ReturnType<typeof setTimeout> | null = null
useSaleStore.subscribe((s, prev) => {
  if (!s.loaded || s.draft === prev.draft) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    void localDb.drafts
      .put({ key: 'sale', draft: useSaleStore.getState().draft, savedAt: Date.now() })
      .catch((e: unknown) => console.error('Draft save failed', e))
  }, 300)
})

export async function loadSaleDraft(): Promise<void> {
  if (useSaleStore.getState().loaded) return
  const row = await localDb.drafts.get('sale').catch(() => undefined)
  useSaleStore.setState({ draft: row ? { ...EMPTY_DRAFT, ...row.draft } : EMPTY_DRAFT, loaded: true })
}

export function patchDraft(patch: Partial<SaleDraft>): void {
  useSaleStore.setState((s) => ({ draft: { ...s.draft, ...patch } }))
}

export function patchLine(key: string, patch: Partial<DraftLine>): void {
  useSaleStore.setState((s) => ({
    draft: { ...s.draft, lines: s.draft.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)) },
  }))
}

export function removeLine(key: string): void {
  useSaleStore.setState((s) => ({ draft: { ...s.draft, lines: s.draft.lines.filter((l) => l.key !== key) } }))
}

/** Same medicine + unit again → one more of it instead of a second row. */
export function addMedicineLine(m: Medicine, unit: SaleUnit = 'piece'): void {
  useSaleStore.setState((s) => {
    const existing = s.draft.lines.find((l) => l.medicineId === m.id && l.unit === unit)
    const lines = existing
      ? s.draft.lines.map((l) => (l === existing ? { ...l, qty: l.qty + 1 } : l))
      : [...s.draft.lines, newDraftLine(lineKey(), m, unit)]
    return { draft: { ...s.draft, mode: 'items', lines } }
  })
}

export function addFreeTextLine(name = ''): void {
  useSaleStore.setState((s) => ({
    draft: { ...s.draft, mode: 'items', lines: [...s.draft.lines, newDraftLine(lineKey(), null, 'custom', name)] },
  }))
}

/** Start a fresh bill (optionally for a customer). */
export function resetDraft(customerMobile: string | null = null): void {
  useSaleStore.setState({ draft: { ...EMPTY_DRAFT, customerMobile } })
}
