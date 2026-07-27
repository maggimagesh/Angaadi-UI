import { buildApiUrl } from '../lib/api'
import { getAuthTokenCookie } from '../utils/token'
import type { Address } from './address'

export type OrderItem = {
  id: string
  productId: number | null
  productName: string
  productImage: string | null
  price: string
  quantity: number
  total: string
}

export type Order = {
  id: string
  orderNumber: string
  status: 'pending_payment' | 'paid' | 'payment_failed' | string
  subtotal: string
  deliveryFee: string
  tax: string
  total: string
  deliverySlot: string | null
  paymentMethod: string
  paymentStatus: 'pending' | 'completed' | 'failed' | string
  gatewayOrderId: string | null
  gatewayPaymentId: string | null
  created_at: string
  updated_at?: string | null
  items: OrderItem[]
  address: Address | null
}

export type ApiResult<T> = { data?: T; error?: { message: string } }

function getAuthHeaders(): Record<string, string> {
  const token = getAuthTokenCookie()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

export async function createOrder(input: {
  addressId: string
  deliverySlot?: string
  paymentMethod?: string
  deliveryFee?: number
}): Promise<ApiResult<Order>> {
  try {
    const res = await fetch(buildApiUrl('/orders'), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(input),
    })
    const json = await res.json()
    if (!res.ok) return { error: { message: json?.error || 'Failed to place order' } }
    return { data: json.order as Order }
  } catch {
    return { error: { message: 'Failed to place order' } }
  }
}

export async function listOrders(): Promise<ApiResult<Order[]>> {
  try {
    const res = await fetch(buildApiUrl('/orders'), { method: 'GET', headers: getAuthHeaders() })
    const json = await res.json()
    if (!res.ok) return { error: { message: json?.error || 'Failed to load orders' } }
    return { data: (json?.orders || []) as Order[] }
  } catch {
    return { error: { message: 'Failed to load orders' } }
  }
}

export async function getOrder(orderId: string): Promise<ApiResult<Order>> {
  try {
    const res = await fetch(buildApiUrl(`/orders/${orderId}`), { method: 'GET', headers: getAuthHeaders() })
    const json = await res.json()
    if (!res.ok) return { error: { message: json?.error || 'Failed to load order' } }
    return { data: json.order as Order }
  } catch {
    return { error: { message: 'Failed to load order' } }
  }
}
