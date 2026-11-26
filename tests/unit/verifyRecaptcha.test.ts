// Tests for the /api/verify-recaptcha serverless function.
import assert from 'node:assert/strict'
import test, { describe, beforeEach } from 'node:test'

type Res = { statusCode: number | null; headers: Record<string, string>; body: unknown }
type FetchLike = (url: string, init: { body: URLSearchParams }) => Promise<{ json: () => Promise<unknown> }>
type Mod = { default: (req: object, res: object, fetchImpl?: FetchLike) => Promise<void> }

// A computed specifier keeps tsc from type-checking the plain .js function.
const mod: Mod = await import(new URL('../../api/verify-recaptcha.js', import.meta.url).href)

function fakeGoogle(reply: object, seen: URLSearchParams[] = []): FetchLike {
  return async (_url, init) => {
    seen.push(init.body)
    return { json: async () => reply }
  }
}

async function call(req: object, fetchImpl?: FetchLike): Promise<Res> {
  const out: Res = { statusCode: null, headers: {}, body: undefined }
  const res = {
    setHeader(name: string, value: string) { out.headers[name.toLowerCase()] = value },
    status(code: number) { out.statusCode = code; return res },
    json(body: unknown) { out.body = body },
  }
  await mod.default({ headers: {}, ...req }, res, fetchImpl)
  return out
}

describe('/api/verify-recaptcha', () => {
  beforeEach(() => {
    process.env.RECAPTCHA_SECRET_KEY = 'test-secret'
    delete process.env.RECAPTCHA_MIN_SCORE
  })

  test('rejects non-POST', async () => {
    const out = await call({ method: 'GET' })
    assert.equal(out.statusCode, 405)
    assert.equal(out.headers.allow, 'POST')
  })

  test('500 when the secret is not configured', async () => {
    delete process.env.RECAPTCHA_SECRET_KEY
    const out = await call({ method: 'POST', body: { token: 't' } })
    assert.equal(out.statusCode, 500)
  })

  test('400 when the token is missing', async () => {
    const out = await call({ method: 'POST', body: {} })
    assert.equal(out.statusCode, 400)
  })

  test('200 on success, sending secret, token and client ip to Google', async () => {
    const seen: URLSearchParams[] = []
    const out = await call(
      { method: 'POST', body: JSON.stringify({ token: 'tok' }), headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' } },
      fakeGoogle({ success: true }, seen),
    )
    assert.equal(out.statusCode, 200)
    assert.deepEqual(out.body, { ok: true })
    assert.equal(seen[0].get('secret'), 'test-secret')
    assert.equal(seen[0].get('response'), 'tok')
    assert.equal(seen[0].get('remoteip'), '1.2.3.4')
  })

  test('403 when Google says the token is invalid', async () => {
    const out = await call({ method: 'POST', body: { token: 'bad' } }, fakeGoogle({ success: false, 'error-codes': ['invalid-input-response'] }))
    assert.equal(out.statusCode, 403)
  })

  test('403 when a v3 score is below the minimum', async () => {
    const out = await call({ method: 'POST', body: { token: 't' } }, fakeGoogle({ success: true, score: 0.2 }))
    assert.equal(out.statusCode, 403)
  })

  test('502 when Google cannot be reached', async () => {
    const out = await call({ method: 'POST', body: { token: 't' } }, async () => { throw new Error('down') })
    assert.equal(out.statusCode, 502)
  })
})
