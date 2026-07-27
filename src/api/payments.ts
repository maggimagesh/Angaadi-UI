import { buildApiUrl } from '../lib/api'
import { getAuthTokenCookie } from '../utils/token'
import type { Order } from './orders'

export type ApiResult<T> = { data?: T; error?: { message: string } }

export interface RazorpaySession {
  razorpayOrderId: string
  /** Amount in paise, as Razorpay's checkout expects it. */
  amount: number
  currency: string
  /** Publishable key id; null in demo mode, where no checkout is opened. */
  keyId: string | null
  demo: boolean
  orderNumber: string
}

function getAuthHeaders(): Record<string, string> {
  const token = getAuthTokenCookie()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

/**
 * `forceDemo` asks the API for a fabricated DEMO- order id instead of a real
 * test one — used as the fallback when the Razorpay checkout script cannot load.
 */
export async function createRazorpayOrder(
  orderId: string,
  forceDemo = false
): Promise<ApiResult<RazorpaySession>> {
  try {
    const res = await fetch(buildApiUrl('/payments/razorpay/create-order'), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(forceDemo ? { orderId, demo: true } : { orderId }),
    })
    const json = await res.json()
    if (!res.ok) return { error: { message: json?.error || 'Could not start Razorpay checkout' } }
    return { data: json as RazorpaySession }
  } catch {
    return { error: { message: 'Could not start Razorpay checkout' } }
  }
}

export async function verifyRazorpayPayment(
  orderId: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): Promise<ApiResult<Order>> {
  try {
    const res = await fetch(buildApiUrl('/payments/razorpay/verify'), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature }),
    })
    const json = await res.json()
    if (!res.ok) return { error: { message: json?.error || 'Payment could not be verified' } }
    return { data: json.order as Order }
  } catch {
    return { error: { message: 'Payment could not be verified' } }
  }
}

export async function cancelRazorpayOrder(orderId: string): Promise<ApiResult<Order>> {
  try {
    const res = await fetch(buildApiUrl('/payments/razorpay/cancel'), {
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
