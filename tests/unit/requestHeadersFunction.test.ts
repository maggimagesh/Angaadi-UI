// Tests for the plain-HTML /request-headers serverless function (api/request-headers.js).
import assert from 'node:assert/strict'
import test, { describe } from 'node:test'

type Pair = [string, string]
type Res = { statusCode: number | null; headers: Record<string, string>; body: string | undefined }
type Mod = {
  default: (req: object, res: object) => void
  renderPage: (pairs: Pair[], nonce?: string) => string
  headerPairs: (req: object) => Pair[]
}

// A computed specifier keeps tsc from type-checking the plain .js function.
const mod: Mod = await import(new URL('../../api/request-headers.js', import.meta.url).href)

function call(method: string, rawHeaders: string[]): Res {
  const out: Res = { statusCode: null, headers: {}, body: undefined }
  const res = {
    setHeader(name: string, value: string) { out.headers[name.toLowerCase()] = value },
    status(code: number) { out.statusCode = code; return res },
    send(body: string) { out.body = body },
    end() {},
  }
  mod.default({ method, rawHeaders, headers: {} }, res)
  return out
}

describe('/request-headers function', () => {
  test('serves the headers table in the HTML, in order, before the one fingerprint script', () => {
    const out = call('GET', ['Host', 'angaadi.dev', 'User-Agent', 'Probe/1', 'Accept', 'text/html'])
    assert.equal(out.statusCode, 200)
    assert.equal(out.headers['content-type'], 'text/html; charset=utf-8')
    assert.equal(out.headers['cache-control'], 'no-store, max-age=0')
    const html = out.body ?? ''
    // The headers table is server-rendered; the only script is the nonce'd
    // fingerprint collector, placed after it.
    assert.equal(html.match(/<table/g)?.length, 1)
    const nonce = out.headers['content-security-policy'].match(/script-src 'nonce-([^']+)'/)?.[1]
    assert.ok(nonce)
    assert.equal(html.match(/<script/g)?.length, 1)
    assert.ok(html.includes(`<script nonce="${nonce}">(function fingerprintMain()`))
    assert.ok(html.indexOf('request-headers-table') < html.indexOf('<script'))
    assert.match(out.headers['content-security-policy'], /connect-src 'none'/)
    assert.match(html, /<th scope="col">HTTP header<\/th><th scope="col">Value<\/th>/)
    const names = [...html.matchAll(/<th scope="row">([^<]+)<\/th>/g)].map((m) => m[1])
    assert.deepEqual(names, ['Host', 'User-Agent', 'Accept'])
    assert.match(html, /<tr data-header="user-agent"><th scope="row">User-Agent<\/th><td>Probe\/1<\/td><\/tr>/)
  })

  test('escapes header values', () => {
    const html = mod.renderPage([['User-Agent', '"><script>alert(1)</script>']])
    assert.equal(html.includes('<script>alert'), false)
    assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'))
  })

  test('falls back to the parsed header map', () => {
    assert.deepEqual(mod.headerPairs({ headers: { host: 'x', 'x-multi': ['a', 'b'] } }), [
      ['host', 'x'],
      ['x-multi', 'a'],
      ['x-multi', 'b'],
    ])
  })

  test('HEAD has no body and other methods get 405', () => {
    assert.equal(call('HEAD', []).body, undefined)
    assert.equal(call('POST', []).statusCode, 405)
  })
})
