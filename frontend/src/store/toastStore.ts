import { create } from 'zustand'

export type ToastVariant = 'success' | 'error'

export interface ToastItem {
  id: number
  description: string
  variant: ToastVariant
}

interface ToastStore {
  toasts: ToastItem[]
  push: (description: string, variant: ToastVariant) => void
  dismiss: (id: number) => void
}

let nextId = 1

export const useToastStore = create<ToastStore>()((set) => ({
  toasts: [],
  push: (description, variant) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts, { id, description, variant }] }))
  },
  dismiss: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
}))
