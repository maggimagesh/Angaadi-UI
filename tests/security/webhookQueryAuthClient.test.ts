// Security tests for the inspector's client-side handling of webhook auth
// credentials. The API is the authority on what is accepted; these assert the
// UI cannot become the weak link by building a URL that means something other
// than what the operator configured.
import assert from 'node:assert/strict'
import test, { describe } from 'node:test'
import {
  buildWebhookAuthQueryApiUrl,
  buildWebhookCaptureUrl,
  buildWebhookCaptureUrlWithQueryAuth,
  isValidWebhookQueryParamName,
} from '../../src/api/webhook.ts'

const TOKEN = 'uitokenaaaaaaaa1'

describe('the client validator refuses what the API refuses', () => {
  test('markup and script payloads are not valid param names', () => {
    for (const name of [
      '<script>alert(1)</script>',
      'key"onload="alert(1)',
      "key'onload='alert(1)",
      'javascript:alert(1)',
      'key<img src=x onerror=alert(1)>',
    ]) {
      assert.equal(isValidWebhookQueryParamName(name), false, `${name} should be rejected`)
    }
  })

  test('control characters and CRLF are not valid param names', () => {
    for (const name of [
      'key\r\nSet-Cookie: a=b',
      'key\n',
      'key\r',
      'key\u0000',
      'key\u007F',
      'key\t',
    ]) {
      assert.equal(isValidWebhookQueryParamName(name), false, `${name} should be rejected`)
    }
  })

  test('homoglyph names that would render as a familiar key are rejected', () => {
    // Cyrillic "е" renders identically to "e".
    assert.equal(isValidWebhookQueryParamName('kеy'), false)
  })
})

describe('the generated receive URL cannot be smuggled into something else', () => {
  test('a value cannot add, override, or drop a param', () => {
    const url = buildWebhookCaptureUrlWithQueryAuth(TOKEN, [
      { name: 'key', value: 'secret&key=other&admin=1#' },
    ])
    const parsed = new URL(url)

    assert.deepEqual([...parsed.searchParams.keys()], ['key'])
    assert.equal(parsed.searchParams.get('key'), 'secret&key=other&admin=1#')
    assert.equal(parsed.hash, '')
  })

  test('a value cannot escape into the path', () => {
    const url = buildWebhookCaptureUrlWithQueryAuth(TOKEN, [
      { name: 'key', value: '../../../admin' },
    ])
    const parsed = new URL(url)

    assert.equal(parsed.pathname, new URL(buildWebhookCaptureUrl(TOKEN)).pathname)
    assert.equal(parsed.searchParams.get('key'), '../../../admin')
  })

  test('a whitespace or newline value cannot break the URL across lines', () => {
    const url = buildWebhookCaptureUrlWithQueryAuth(TOKEN, [
      { name: 'key', value: 'secret\r\nHost: evil.example' },
    ])

    assert.ok(!/[\r\n]/.test(url), 'the built URL must stay on one line')
    assert.equal(new URL(url).searchParams.get('key'), 'secret\r\nHost: evil.example')
  })

  test('the URL stays on the configured origin no matter the values', () => {
    const captureOrigin = new URL(buildWebhookCaptureUrl(TOKEN)).origin
    const url = buildWebhookCaptureUrlWithQueryAuth(TOKEN, [
      { name: 'key', value: '//evil.example/' },
      { name: 'next', value: 'https://evil.example' },
    ])

    assert.equal(new URL(url).origin, captureOrigin)
  })
})

describe('the token never escapes its path segment', () => {
  test('a token containing separators is encoded, not interpolated', () => {
    for (const badToken of ['a/b', 'a?b', 'a#b', '../../admin']) {
      const url = buildWebhookAuthQueryApiUrl(badToken)
      assert.ok(url.endsWith('/auth-query'), `${url} should still end at the endpoint`)
      assert.ok(!url.includes(`${badToken}/auth-query`), `${badToken} leaked into the path`)
    }
  })
})
