import { create } from 'zustand'

/**
 * Saved items, persisted client-side.
 *
 * There is no wishlist endpoint, so this follows the same pattern the cart
 * store already uses for its local copy: a zustand store mirrored into
 * localStorage under the `demo.*.v1` key convention.
 */

export type WishlistItem = {
  id: number
  name: string
  brand?: string
  image?: string
  price: number
  oldPrice?: number
  /** Price at the moment it was saved, so a drop can be surfaced later. */
  savedPrice: number
  savedAt: string
  inStock: boolean
  categoryId?: number
}

type WishlistState = {
  items: WishlistItem[]
  has: (id: number) => boolean
  toggle: (item: Omit<WishlistItem, 'savedPrice' | 'savedAt'>) => void
  add: (item: Omit<WishlistItem, 'savedPrice' | 'savedAt'>) => void
  remove: (id: number) => void
  clear: () => void
  count: () => number
}

const STORAGE_KEY = 'demo.wishlist.v1'

const read = (): WishlistItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as WishlistItem[]) : []
  } catch {
    return []
  }
}

const write = (items: WishlistItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* ignore */
  }
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  items: typeof window !== 'undefined' ? read() : [],

  has: (id) => get().items.some((i) => i.id === id),

  add: (item) => {
    if (get().has(item.id)) return
    const next = [
      ...get().items,
      { ...item, savedPrice: item.price, savedAt: new Date().toISOString() },
    ]
    write(next)
    set({ items: next })
  },

  remove: (id) => {
    const next = get().items.filter((i) => i.id !== id)
    write(next)
    set({ items: next })
  },

  toggle: (item) => {
    if (get().has(item.id)) get().remove(item.id)
    else get().add(item)
  },

  clear: () => {
    write([])
    set({ items: [] })
  },

  count: () => get().items.length,
}))
