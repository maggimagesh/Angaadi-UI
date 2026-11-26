/*
 * POST /api/verify-recaptcha  { token: string }
 *
 * Server-side half of Google reCAPTCHA. The browser renders the widget with the
 * public site key (VITE_RECAPTCHA_SITE_KEY) and sends the token it gets here;
 * this function checks it with Google using the secret key, which only exists
 * on the server (RECAPTCHA_SECRET_KEY — never prefix it with VITE_, or Vite
 * would bake it into the public bundle).
 *
 * Works with v2 ("I'm not a robot") keys. For v3 keys, Google also returns a
 * score; tokens below RECAPTCHA_MIN_SCORE (default 0.5) are rejected.
 *
 * Responses: 200 { ok: true } | 400 missing token | 403 failed check
 *            405 wrong method | 500 secret not configured | 502 Google unreachable
 */

const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'

export async function verifyToken({ token, secret, remoteip, minScore = 0.5, fetchImpl = fetch }) {
  const body = new URLSearchParams({ secret, response: token })
  if (remoteip) body.set('remoteip', remoteip)
  const r = await fetchImpl(VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = await r.json()
  if (!data.success) return { ok: false, errors: data['error-codes'] || [] }
  if (typeof data.score === 'number' && data.score < minScore) {
    return { ok: false, errors: ['low-score'], score: data.score }
  }
  return { ok: true, score: data.score }
}

function readToken(req) {
  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = null }
  }
  const token = body && typeof body.token === 'string' ? body.token.trim() : ''
  return token
}

export default async function handler(req, res, fetchImpl = fetch) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const secret = process.env.RECAPTCHA_SECRET_KEY
  if (!secret) {
    return res.status(500).json({ ok: false, error: 'reCAPTCHA is not configured on the server' })
  }

  const token = readToken(req)
  if (!token) return res.status(400).json({ ok: false, error: 'Missing reCAPTCHA token' })

  const fwd = req.headers?.['x-forwarded-for']
  const remoteip = typeof fwd === 'string' ? fwd.split(',')[0].trim() : undefined
  const minScore = Number(process.env.RECAPTCHA_MIN_SCORE) || 0.5

  try {
    const result = await verifyToken({ token, secret, remoteip, minScore, fetchImpl })
    if (!result.ok) {
      return res.status(403).json({ ok: false, error: 'reCAPTCHA verification failed', codes: result.errors })
    }
    return res.status(200).json({ ok: true })
  } catch {
    return res.status(502).json({ ok: false, error: 'Could not reach reCAPTCHA service' })
  }
}
