import { create } from 'zustand'
import { addCartItem, getCart, deleteCartItem, type CartApiResponse } from '../api/cart'
import { useAuthStore } from './auth'
import { useUIStore } from './ui'

export type CartItem = {
  id: number
  name: string
  image?: string
  brand?: string
  price: number
  oldPrice?: number
  discountPercent?: number
  qty: number
  options?: {
    storage?: string
    color?: string
  }
}

type CartState = {
  items: CartItem[]
  summary: { subtotal: number; youSave: number; deliveryFee: number; tax: number; total: number }
  loading?: boolean
  error?: string | null
  addItem: (item: Omit<CartItem, 'qty'>, qty?: number) => void
  addByProductId: (productId: number, qty: number, fallback?: Partial<CartItem>) => Promise<void>
  fetchServerCart: () => Promise<void>
  removeItem: (id: number) => Promise<void>
  clear: () => void
  updateQty: (id: number, qty: number) => void
  totalItems: () => number
  subtotal: () => number
  totalSavings: () => number
}

const STORAGE_KEY = 'demo.cart.v1'

const readFromStorage = (): CartItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CartItem[]) : []
  } catch {
    return []
  }
}

const writeToStorage = (items: CartItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* ignore */
  }
}

export const useCartStore = create<CartState>((set, get) => ({
  items: typeof window !== 'undefined' ? readFromStorage() : [],
  summary: { subtotal: 0, youSave: 0, deliveryFee: 0, tax: 0, total: 0 },
  addItem: (item, qty = 1) => {
    const { items } = get()
    const existing = items.find(i => i.id === item.id)
    let next: CartItem[]
    if (existing) {
      next = items.map(i => i.id === item.id ? { ...i, qty: i.qty + qty } : i)
    } else {
      next = [...items, { ...item, qty }]
    }
    writeToStorage(next)
    set({ items: next })
  },
  addByProductId: async (productId, qty, fallback) => {
    // Check if user is authenticated
    const { isAuthenticated } = useAuthStore.getState()
    const { openSignInModal } = useUIStore.getState()
    
    if (!isAuthenticated) {
      // Show sign-in modal with callback to add item after login
      openSignInModal(() => {
        // This callback will be executed after successful login
        get().addByProductId(productId, qty, fallback)
      })
      return
    }

    set({ loading: true, error: null })
    const fallbackMeta = fallback ? {
      name: fallback.name,
      brand: fallback.brand,
      imageurl: fallback.image,
      price: String(fallback.price ?? 0),
      oldprice: String(fallback.oldPrice ?? fallback.price ?? 0),
      discountpercent: fallback.discountPercent,
    } : undefined
    const res = await addCartItem({ productId, quantity: qty, fallback: fallbackMeta as any })
    if (res.error || !res.data) {
      // fallback to local add
      get().addItem({ id: productId, name: fallback?.name || 'Product', price: fallback?.price || 0, image: fallback?.image, brand: fallback?.brand, oldPrice: fallback?.oldPrice, discountPercent: fallback?.discountPercent }, qty)
      set({ loading: false, error: res.error?.message || null })
      return
    }
    const mapped = mapApiToItems(res.data)
    writeToStorage(mapped.items)
    set({ items: mapped.items, summary: mapped.summary, loading: false, error: null })
  },
  fetchServerCart: async () => {
    set({ loading: true, error: null })
    const res = await getCart()
    if (res.error || !res.data) {
      set({ loading: false, error: res.error?.message || null })
      return
    }
    const mapped = mapApiToItems(res.data)
    writeToStorage(mapped.items)
    set({ items: mapped.items, summary: mapped.summary, loading: false, error: null })
  },
  removeItem: async (id) => {
    set({ loading: true, error: null })
    const res = await deleteCartItem(id)
    if (res.error || !res.data) {
      // Fallback to local removal
      const next = get().items.filter(i => i.id !== id)
      writeToStorage(next)
      set({ items: next, loading: false, error: res.error?.message || null })
      return
    }
    const mapped = mapApiToItems(res.data)
    writeToStorage(mapped.items)
    set({ items: mapped.items, summary: mapped.summary, loading: false, error: null })
  },
  clear: () => {
    writeToStorage([])
    set({ items: [] })
  },
  updateQty: (id, qty) => {
    const next = get().items.map(i => i.id === id ? { ...i, qty: Math.max(1, qty) } : i)
    writeToStorage(next)
    set({ items: next })
  },
  totalItems: () => get().items.reduce((sum, i) => sum + i.qty, 0),
  subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.qty, 0),
  totalSavings: () => get().items.reduce((sum, i) => {
    const old = i.oldPrice && i.oldPrice > i.price ? i.oldPrice : undefined
    return sum + (old ? (old - i.price) * i.qty : 0)
  }, 0),
}))

function mapApiToItems(api: CartApiResponse): { items: CartItem[]; summary: CartState['summary'] } {
  const items: CartItem[] = api.items.map(it => ({
    id: it.productId,
    name: it.product?.name || 'Product',
    brand: it.product?.brand,
    image: it.product?.imageurl,
    price: Number(it.product?.price || 0),
    oldPrice: it.product?.oldprice ? Number(it.product.oldprice) : undefined,
    discountPercent: it.product?.discountpercent,
    qty: it.quantity,
  }))
  const summary = api.summary || { subtotal: 0, youSave: 0, deliveryFee: 0, tax: 0, total: 0 }
  return { items, summary }
}
