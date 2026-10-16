// Tests for the plain-HTML /request-headers serverless function (api/request-headers.js).
import assert from 'node:assert/strict'
import test, { describe } from 'node:test'

type Pair = [string, string]
type Res = { statusCode: number | null; headers: Record<string, string>; body: string | undefined }
type Mod = {
  default: (req: object, res: object) => void
  renderPage: (pairs: Pair[]) => string
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
  test('serves one plain table of the request headers, in order, with no script', () => {
    const out = call('GET', ['Host', 'angaadi.dev', 'User-Agent', 'Probe/1', 'Accept', 'text/html'])
    assert.equal(out.statusCode, 200)
    assert.equal(out.headers['content-type'], 'text/html; charset=utf-8')
    assert.equal(out.headers['cache-control'], 'no-store, max-age=0')
    const html = out.body ?? ''
    assert.equal(/<script/i.test(html), false)
    assert.equal(html.match(/<table/g)?.length, 1)
    assert.match(html, /<th scope="col">HTTP header<\/th><th scope="col">Value<\/th>/)
    const names = [...html.matchAll(/<th scope="row">([^<]+)<\/th>/g)].map((m) => m[1])
    assert.deepEqual(names, ['Host', 'User-Agent', 'Accept'])
    assert.match(html, /<tr data-header="user-agent"><th scope="row">User-Agent<\/th><td>Probe\/1<\/td><\/tr>/)
  })

  test('escapes header values', () => {
    const html = mod.renderPage([['User-Agent', '"><script>alert(1)</script>']])
    assert.equal(html.includes('<script>'), false)
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
