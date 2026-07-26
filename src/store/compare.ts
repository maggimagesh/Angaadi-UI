import { create } from 'zustand'

/**
 * The compare tray — at most four products, persisted client-side under the
 * same `demo.*.v1` convention the cart and wishlist stores use.
 */

export const COMPARE_LIMIT = 4

export type CompareItem = {
  id: number
  name: string
  brand?: string
  image?: string
  price: number
  rating?: number
  ratingsCount?: number
  categoryId?: number
  /** Spec label → value, read straight off the product detail payload. */
  specs: Record<string, string>
}

type CompareState = {
  items: CompareItem[]
  has: (id: number) => boolean
  isFull: () => boolean
  toggle: (item: CompareItem) => boolean
  add: (item: CompareItem) => boolean
  remove: (id: number) => void
  clear: () => void
  count: () => number
}

const STORAGE_KEY = 'demo.compare.v1'

const read = (): CompareItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as CompareItem[]) : []
    return parsed.slice(0, COMPARE_LIMIT)
  } catch {
    return []
  }
}

const write = (items: CompareItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* ignore */
  }
}

export const useCompareStore = create<CompareState>((set, get) => ({
  items: typeof window !== 'undefined' ? read() : [],

  has: (id) => get().items.some((i) => i.id === id),
  isFull: () => get().items.length >= COMPARE_LIMIT,

  /** Returns false when the tray is already full, so callers can say so. */
  add: (item) => {
    if (get().has(item.id)) return true
    if (get().isFull()) return false
    const next = [...get().items, item]
    write(next)
    set({ items: next })
    return true
  },

  remove: (id) => {
    const next = get().items.filter((i) => i.id !== id)
    write(next)
    set({ items: next })
  },

  toggle: (item) => {
    if (get().has(item.id)) {
      get().remove(item.id)
      return true
    }
    return get().add(item)
  },

  clear: () => {
    write([])
    set({ items: [] })
  },

  count: () => get().items.length,
}))
