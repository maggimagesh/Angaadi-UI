/*
 * POST /api/verify-recaptcha  { token: string, version?: 'v2' | 'v3', action?: string }
 *
 * Server-side half of Google reCAPTCHA. The browser gets a token with the
 * public site key and sends it here; this function checks it with Google using
 * the secret key, which only exists on the server (never prefix a secret with
 * VITE_, or Vite would bake it into the public bundle).
 *
 *   version 'v2' (default) — "I'm not a robot" checkbox, RECAPTCHA_SECRET_KEY.
 *   version 'v3'           — invisible page-load score, RECAPTCHA_V3_SECRET_KEY.
 *                            The token's action must match `action`, and its
 *                            score must be >= RECAPTCHA_MIN_SCORE (default 0.5).
 *
 * A 403 for v3 means "probably a bot": the page then asks for the v2 checkbox.
 *
 * Responses: 200 { ok: true } | 400 missing token | 403 failed check
 *            405 wrong method | 500 secret not configured | 502 Google unreachable
 */

const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'

export async function verifyToken({ token, secret, remoteip, minScore = 0.5, expectedAction, fetchImpl = fetch }) {
  const body = new URLSearchParams({ secret, response: token })
  if (remoteip) body.set('remoteip', remoteip)
  const r = await fetchImpl(VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = await r.json()
  if (!data.success) return { ok: false, errors: data['error-codes'] || [] }
  if (expectedAction && data.action !== expectedAction) {
    return { ok: false, errors: ['action-mismatch'], score: data.score }
  }
  if (typeof data.score === 'number' && data.score < minScore) {
    return { ok: false, errors: ['low-score'], score: data.score }
  }
  return { ok: true, score: data.score }
}

function readBody(req) {
  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = null }
  }
  if (!body || typeof body !== 'object') body = {}
  const str = (v) => (typeof v === 'string' ? v.trim() : '')
  return {
    token: str(body.token),
    version: body.version === 'v3' ? 'v3' : 'v2',
    action: str(body.action).slice(0, 100),
  }
}

export default async function handler(req, res, fetchImpl = fetch) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const { token, version, action } = readBody(req)
  const secret = version === 'v3' ? process.env.RECAPTCHA_V3_SECRET_KEY : process.env.RECAPTCHA_SECRET_KEY
  if (!secret) {
    return res.status(500).json({ ok: false, error: `reCAPTCHA ${version} is not configured on the server` })
  }
  if (!token) return res.status(400).json({ ok: false, error: 'Missing reCAPTCHA token' })
  if (version === 'v3' && !action) return res.status(400).json({ ok: false, error: 'Missing reCAPTCHA action' })

  const fwd = req.headers?.['x-forwarded-for']
  const remoteip = typeof fwd === 'string' ? fwd.split(',')[0].trim() : undefined
  const minScore = Number(process.env.RECAPTCHA_MIN_SCORE) || 0.5

  try {
    const result = await verifyToken({
      token, secret, remoteip, minScore, fetchImpl,
      expectedAction: version === 'v3' ? action : undefined,
    })
    if (!result.ok) {
      return res.status(403).json({ ok: false, error: 'reCAPTCHA verification failed', codes: result.errors })
    }
    return res.status(200).json({ ok: true })
  } catch {
    return res.status(502).json({ ok: false, error: 'Could not reach reCAPTCHA service' })
  }
}
