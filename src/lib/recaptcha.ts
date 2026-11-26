// Client side of Google reCAPTCHA. Site keys are public and read at build time;
// the secret keys live only in the /api/verify-recaptcha Vercel function.
//
//   VITE_RECAPTCHA_V3_SITE_KEY — invisible score check when a page loads (BotGate)
//   VITE_RECAPTCHA_SITE_KEY    — v2 "I'm not a robot" checkbox: shown by BotGate
//                                when the score is low, and on sign-in / sign-up
//
// Either can be left unset; that part is then simply switched off.

export const RECAPTCHA_SITE_KEY: string = import.meta.env.VITE_RECAPTCHA_SITE_KEY || ''
export const RECAPTCHA_V3_SITE_KEY: string = import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY || ''
export const recaptchaEnabled = RECAPTCHA_SITE_KEY.length > 0
export const recaptchaV3Enabled = RECAPTCHA_V3_SITE_KEY.length > 0

type Grecaptcha = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => number
  reset: (id?: number) => void
  ready: (cb: () => void) => void
  execute: (siteKey: string, opts: { action: string }) => Promise<string>
}

declare global {
  interface Window {
    grecaptcha?: Grecaptcha
    __angaadiRecaptchaOnload?: () => void
  }
}

let loader: Promise<Grecaptcha> | null = null

/**
 * Loads Google's script once. With a v3 key it is loaded with render=<v3 key>
 * (needed for execute); v2 checkboxes are still rendered explicitly with their
 * own site key, which Google supports on the same script.
 */
export function loadRecaptcha(): Promise<Grecaptcha> {
  if (loader) return loader
  loader = new Promise((resolve, reject) => {
    if (window.grecaptcha?.render) return resolve(window.grecaptcha)
    window.__angaadiRecaptchaOnload = () => resolve(window.grecaptcha as Grecaptcha)
    const render = recaptchaV3Enabled ? encodeURIComponent(RECAPTCHA_V3_SITE_KEY) : 'explicit'
    const s = document.createElement('script')
    s.src = `https://www.google.com/recaptcha/api.js?onload=__angaadiRecaptchaOnload&render=${render}`
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

async function postVerify(payload: object): Promise<Response> {
  return fetch('/api/verify-recaptcha', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

/**
 * Checks a v2 checkbox token with the server. Resolves to null when it passes
 * (or when reCAPTCHA is disabled), otherwise to a message to show the user.
 */
export async function verifyRecaptcha(token: string | null): Promise<string | null> {
  if (!recaptchaEnabled) return null
  if (!token) return 'Please confirm you are not a robot'
  try {
    const r = await postVerify({ token, version: 'v2' })
    if (r.ok) return null
    if (r.status === 403) return 'reCAPTCHA check failed. Please try again.'
    return 'Could not verify reCAPTCHA. Please try again.'
  } catch {
    return 'Could not verify reCAPTCHA. Please try again.'
  }
}

/**
 * 'human' — score passed; 'bot' — Google scored the visitor as likely a bot;
 * 'unknown' — the check could not run (script blocked, Google or our API down).
 */
export type ScoreResult = 'human' | 'bot' | 'unknown'

/** Runs the invisible v3 check for `action` and asks the server for a verdict. */
export async function checkScore(action: string): Promise<ScoreResult> {
  if (!recaptchaV3Enabled) return 'human'
  try {
    const g = await loadRecaptcha()
    await new Promise<void>((resolve) => g.ready(resolve))
    const token = await g.execute(RECAPTCHA_V3_SITE_KEY, { action })
    const r = await postVerify({ token, version: 'v3', action })
    if (r.ok) return 'human'
    if (r.status === 403) return 'bot'
    return 'unknown'
  } catch {
    return 'unknown'
  }
}
