import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  menuId: number
  name: string
  price: number
  image: string
  qty: number
  note: string
}

interface CartStore {
  token: string | null
  items: CartItem[]
  customerName: string
  phone: string
  setTable: (token: string) => void
  setCustomer: (name: string, phone: string) => void
  clearCustomer: () => void
  addItem: (item: Omit<CartItem, 'qty' | 'note'>, qty?: number) => void
  updateQty: (menuId: number, qty: number) => void
  updateNote: (menuId: number, note: string) => void
  removeItem: (menuId: number) => void
  clear: () => void
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      token: null,
      items: [],
      customerName: '',
      phone: '',

      // Switching tables clears the cart — items only make sense for the table they were added on.
      // Identity (name/phone) is deliberately left untouched — it's who's ordering, not what table.
      setTable: (token) => {
        if (get().token !== token) {
          set({ token, items: [] })
        }
      },

      setCustomer: (name, phone) => set({ customerName: name, phone }),
      clearCustomer: () => set({ customerName: '', phone: '' }),

      addItem: (item, qty = 1) => {
        const items = get().items
        const existing = items.find((i) => i.menuId === item.menuId)
        if (existing) {
          set({
            items: items.map((i) => (i.menuId === item.menuId ? { ...i, qty: i.qty + qty } : i)),
          })
        } else {
          set({ items: [...items, { ...item, qty, note: '' }] })
        }
      },

      updateQty: (menuId, qty) => {
        if (qty <= 0) {
          set({ items: get().items.filter((i) => i.menuId !== menuId) })
          return
        }
        set({ items: get().items.map((i) => (i.menuId === menuId ? { ...i, qty } : i)) })
      },

      updateNote: (menuId, note) => {
        set({ items: get().items.map((i) => (i.menuId === menuId ? { ...i, note } : i)) })
      },

      removeItem: (menuId) => {
        set({ items: get().items.filter((i) => i.menuId !== menuId) })
      },

      clear: () => set({ items: [] }),
    }),
    { name: 'cart-storage' }
  )
)
