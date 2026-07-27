import { secureFetch } from '../lib/secureClient'
import { getAuthTokenCookie } from '../utils/token'
import type { Order } from './orders'

export type ApiResult<T> = { data?: T; error?: { message: string } }

function getAuthHeaders(): Record<string, string> {
  const token = getAuthTokenCookie()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

export async function createPaypalOrder(
  orderId: string
): Promise<ApiResult<{ paypalOrderId: string; demo: boolean; orderNumber: string }>> {
  try {
    const res = await secureFetch('/payments/paypal/create-order', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ orderId }),
    })
    const json = await res.json()
    if (!res.ok) return { error: { message: json?.error || 'Could not start PayPal checkout' } }
    return { data: json }
  } catch {
    return { error: { message: 'Could not start PayPal checkout' } }
  }
}

export async function capturePaypalOrder(orderId: string, paypalOrderId: string): Promise<ApiResult<Order>> {
  try {
    const res = await secureFetch('/payments/paypal/capture-order', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ orderId, paypalOrderId }),
    })
    const json = await res.json()
    if (!res.ok) return { error: { message: json?.error || 'Payment was declined' } }
    return { data: json.order as Order }
  } catch {
    return { error: { message: 'Payment was declined' } }
  }
}

export async function cancelPaypalOrder(orderId: string): Promise<ApiResult<Order>> {
  try {
    const res = await secureFetch('/payments/paypal/cancel', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ orderId }),
    })
    const json = await res.json()
    if (!res.ok) return { error: { message: json?.error || 'Failed to cancel payment' } }
    return { data: json.order as Order }
  } catch {
    return { error: { message: 'Failed to cancel payment' } }
  }
}
