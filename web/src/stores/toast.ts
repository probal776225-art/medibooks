import { create } from 'zustand'
import type { MessageKey } from '../i18n/bn'

export interface Toast {
  id: number
  kind: 'success' | 'error' | 'info'
  message: MessageKey
}

interface ToastState {
  toasts: Toast[]
  show: (kind: Toast['kind'], message: MessageKey) => void
  dismiss: (id: number) => void
}

let nextId = 1

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  show: (kind, message) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, kind, message }] }))
    setTimeout(() => get().dismiss(id), kind === 'error' ? 8000 : 3000)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
