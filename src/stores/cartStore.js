import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const makeStore = (businessSlug) =>
  create(
    persist(
      (set, get) => ({
        items: [],
        addItem: (item) => {
          const existing = get().items.find((i) => i.id === item.id)
          if (existing) {
            set({
              items: get().items.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
              ),
            })
          } else {
            set({ items: [...get().items, { ...item, quantity: 1, notes: '' }] })
          }
        },
        updateQuantity: (id, quantity) => {
          if (quantity <= 0) {
            set({ items: get().items.filter((i) => i.id !== id) })
          } else {
            set({
              items: get().items.map((i) => (i.id === id ? { ...i, quantity } : i)),
            })
          }
        },
        updateNotes: (id, notes) => {
          set({
            items: get().items.map((i) => (i.id === id ? { ...i, notes } : i)),
          })
        },
        removeItem: (id) => {
          set({ items: get().items.filter((i) => i.id !== id) })
        },
        removeItemByMenuId: (menuItemId) => {
          set({ items: get().items.filter((i) => i.id !== menuItemId) })
        },
        clear: () => set({ items: [] }),
        total: () =>
          get().items.reduce((sum, i) => sum + (i.promo_price ?? i.price) * i.quantity, 0),
      }),
      { name: `cart_${businessSlug}` }
    )
  )

const stores = {}
export const useCartStore = (businessSlug) => {
  if (!stores[businessSlug]) stores[businessSlug] = makeStore(businessSlug)
  return stores[businessSlug]()
}
