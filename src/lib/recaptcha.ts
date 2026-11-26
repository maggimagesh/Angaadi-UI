// Client side of Google reCAPTCHA (v2 checkbox). The site key is public and is
// read at build time; the secret key lives only in the /api/verify-recaptcha
// Vercel function. When no site key is set (e.g. local dev), reCAPTCHA is off
// and forms behave exactly as before.

export const RECAPTCHA_SITE_KEY: string = import.meta.env.VITE_RECAPTCHA_SITE_KEY || ''
export const recaptchaEnabled = RECAPTCHA_SITE_KEY.length > 0

type Grecaptcha = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => number
  reset: (id?: number) => void
}

declare global {
  interface Window {
    grecaptcha?: Grecaptcha
    __angaadiRecaptchaOnload?: () => void
  }
}

let loader: Promise<Grecaptcha> | null = null

/** Loads Google's script once (explicit render, so it works inside modals). */
export function loadRecaptcha(): Promise<Grecaptcha> {
  if (loader) return loader
  loader = new Promise((resolve, reject) => {
    if (window.grecaptcha?.render) return resolve(window.grecaptcha)
    window.__angaadiRecaptchaOnload = () => resolve(window.grecaptcha as Grecaptcha)
    const s = document.createElement('script')
    s.src = 'https://www.google.com/recaptcha/api.js?onload=__angaadiRecaptchaOnload&render=explicit'
    s.async = true
    s.defer = true
    s.onerror = () => {
      loader = null
      reject(new Error('Failed to load reCAPTCHA'))
    }
    document.head.appendChild(s)
  })
  return loader
}

/**
 * Checks a widget token with the server. Resolves to null when it passes (or
 * when reCAPTCHA is disabled), otherwise to a message to show the user.
 */
export async function verifyRecaptcha(token: string | null): Promise<string | null> {
  if (!recaptchaEnabled) return null
  if (!token) return 'Please confirm you are not a robot'
  try {
    const r = await fetch('/api/verify-recaptcha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    if (r.ok) return null
    if (r.status === 403) return 'reCAPTCHA check failed. Please try again.'
    return 'Could not verify reCAPTCHA. Please try again.'
  } catch {
    return 'Could not verify reCAPTCHA. Please try again.'
  }
}
