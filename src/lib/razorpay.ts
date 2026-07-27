/**
 * Loads Razorpay's hosted checkout script on demand.
 *
 * The script must come from checkout.razorpay.com — it cannot be bundled, and
 * it is what renders the UPI / cards / netbanking / wallet / pay-later modal.
 * The promise is cached so repeated checkout attempts reuse one <script> tag.
 */

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void }
  }
}

export interface RazorpayHandlerResponse {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

export interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  name: string
  description?: string
  order_id: string
  handler: (response: RazorpayHandlerResponse) => void
  prefill?: { name?: string; email?: string; contact?: string }
  notes?: Record<string, string>
  theme?: { color?: string }
  modal?: { ondismiss?: () => void }
}

let loader: Promise<boolean> | null = null

export function loadRazorpayCheckout(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true)
  if (loader) return loader

  loader = new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(!!window.Razorpay))
      existing.addEventListener('error', () => resolve(false))
      return
    }

    const script = document.createElement('script')
    script.src = CHECKOUT_SRC
    script.async = true
    script.onload = () => resolve(!!window.Razorpay)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  }).then((ok) => {
    // A failed load must not be cached, so a retry can attempt it again.
    if (!ok) loader = null
    return ok
  })

  return loader
}
