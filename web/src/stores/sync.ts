import { useSyncExternalStore } from 'react'
import { create } from 'zustand'

interface SyncState {
  /** Batches committed in this session and not yet acknowledged by the server. */
  inflightWrites: number
  /** Customer docs with pending local writes (from the listener; survives reloads). */
  pendingDocs: number
  beginWrite: () => void
  endWrite: () => void
  setPendingDocs: (n: number) => void
}

export const useSyncStore = create<SyncState>()((set) => ({
  inflightWrites: 0,
  pendingDocs: 0,
  beginWrite: () => set((s) => ({ inflightWrites: s.inflightWrites + 1 })),
  endWrite: () => set((s) => ({ inflightWrites: Math.max(0, s.inflightWrites - 1) })),
  setPendingDocs: (pendingDocs) => set({ pendingDocs }),
}))

/** Number shown as "সিঙ্ক বাকি: N" in the header. */
export function usePendingCount(): number {
  return useSyncStore((s) => Math.max(s.inflightWrites, s.pendingDocs))
}

function subscribeOnline(cb: () => void): () => void {
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => {
    window.removeEventListener('online', cb)
    window.removeEventListener('offline', cb)
  }
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine)
}
