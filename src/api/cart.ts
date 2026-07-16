import { secureFetch } from '../lib/secureClient'
import { getAuthTokenCookie } from '../utils/token'

export type CartApiProduct = {
  id: number
  name: string
  brand?: string
  imageurl?: string
  freedelivery?: boolean
  price: string
  oldprice?: string
  discountpercent?: number
  category?: string
}

export type CartApiItem = {
  itemId: string
  productId: number
  quantity: number
  product: CartApiProduct
  totals: {
    total: number
    youSave: number
  }
}

export type CartApiResponse = {
  items: CartApiItem[]
  summary: {
    subtotal: number
    youSave: number
    deliveryFee: number
    tax: number
    total: number
  }
}

export type ApiResult<T> = { data?: T; error?: { message: string } }

const MOCK_STORAGE_KEY = 'demo.server.cart.mock'

function getAuthHeaders(): Record<string, string> {
  const token = getAuthTokenCookie()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

function readMock(): CartApiResponse | null {
  try {
    const raw = localStorage.getItem(MOCK_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CartApiResponse) : null
  } catch { return null }
}

function writeMock(state: CartApiResponse) {
  try { localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(state)) } catch {}
}

function toNumber(v?: string): number { const n = v ? parseFloat(v) : NaN; return isNaN(n) ? 0 : n }

export async function getCart(): Promise<ApiResult<CartApiResponse>> {
  try {
    const res = await secureFetch('/cart', { method: 'GET', headers: getAuthHeaders() })
    const json = await res.json()
    if (!res.ok) return { error: { message: json?.message || 'Failed to fetch cart' } }
    return { data: json as CartApiResponse }
  } catch (e) {
    // Fallback to mock
    const mock = readMock() || { items: [], summary: { subtotal: 0, youSave: 0, deliveryFee: 0, tax: 0, total: 0 } }
    return { data: mock }
  }
}

export async function addCartItem(payload: { productId: number; quantity: number; fallback?: Partial<CartApiProduct> }): Promise<ApiResult<CartApiResponse>> {
  try {
    const res = await secureFetch('/cart', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ productId: payload.productId, quantity: payload.quantity })
    })
    const json = await res.json()
    if (!res.ok) return { error: { message: json?.message || 'Failed to add to cart' } }
    return { data: json as CartApiResponse }
  } catch (e) {
    // Mock fallback using localStorage
    const current = readMock() || { items: [], summary: { subtotal: 0, youSave: 0, deliveryFee: 0, tax: 0, total: 0 } }
    const existing = current.items.find(i => i.productId === payload.productId)
    const meta = payload.fallback || {}
    if (existing) {
      existing.quantity += payload.quantity
      existing.totals.total = existing.quantity * (toNumber(existing.product.price))
      const old = toNumber(existing.product.oldprice)
      const now = toNumber(existing.product.price)
      existing.totals.youSave = Math.max(0, (old - now) * existing.quantity)
    } else {
      const now = toNumber(String(meta.price ?? '0'))
      const old = toNumber(String(meta.oldprice ?? now))
      const item: CartApiItem = {
        itemId: String(Date.now()),
        productId: payload.productId,
        quantity: payload.quantity,
        product: {
          id: payload.productId,
          name: meta.name || 'Product',
          brand: meta.brand || 'Brand',
          imageurl: meta.imageurl,
          freedelivery: true,
          price: String(now || 0),
          oldprice: String(old || 0),
          discountpercent: meta.discountpercent || (old > now && old ? Math.round(((old - now) / old) * 100) : 0),
          category: 'general'
        },
        totals: {
          total: (now || 0) * payload.quantity,
          youSave: Math.max(0, (old - now) * payload.quantity)
        }
      }
      current.items.push(item)
    }
    // Recompute summary
    current.summary.subtotal = current.items.reduce((s, i) => s + i.totals.total, 0)
    current.summary.youSave = current.items.reduce((s, i) => s + i.totals.youSave, 0)
    current.summary.deliveryFee = 0
    current.summary.tax = 0
    current.summary.total = current.summary.subtotal
    writeMock(current)
    return { data: current }
  }
}

export async function deleteCartItem(productId: number): Promise<ApiResult<CartApiResponse>> {
  try {
    const res = await secureFetch('/cart', {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ productId })
    })
    const json = await res.json()
    if (!res.ok) return { error: { message: json?.message || 'Failed to delete cart item' } }
    return { data: json as CartApiResponse }
  } catch (e) {
    // Mock fallback using localStorage
    const current = readMock() || { items: [], summary: { subtotal: 0, youSave: 0, deliveryFee: 0, tax: 0, total: 0 } }
    const filteredItems = current.items.filter(i => i.productId !== productId)
    current.items = filteredItems
    // Recompute summary
    current.summary.subtotal = current.items.reduce((s, i) => s + i.totals.total, 0)
    current.summary.youSave = current.items.reduce((s, i) => s + i.totals.youSave, 0)
    current.summary.deliveryFee = 0
    current.summary.tax = 0
    current.summary.total = current.summary.subtotal
    writeMock(current)
    return { data: current }
  }
}
