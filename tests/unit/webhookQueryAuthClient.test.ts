// Unit tests for the inspector's webhook client helpers that back the
// query-param authorization UI.
import assert from 'node:assert/strict'
import test, { describe } from 'node:test'
import {
  appendWebhookQueryAuthParams,
  buildWebhookAuthQueryApiUrl,
  buildWebhookCaptureUrl,
  buildWebhookCaptureUrlWithQueryAuth,
  isValidWebhookQueryParamName,
  MAX_WEBHOOK_AUTH_QUERY_PARAMS,
} from '../../src/api/webhook.ts'

const TOKEN = 'uitokenaaaaaaaa1'

describe('isValidWebhookQueryParamName', () => {
  test('accepts the names the API accepts', () => {
    for (const name of ['callback_key', 'webhook.key', 'a-b', 'x~y', 'Key1', 'a']) {
      assert.equal(isValidWebhookQueryParamName(name), true, `${name} should be valid`)
    }
  })

  test('rejects separators that would split one param into several', () => {
    for (const name of ['a&b', 'a=b', 'a?b', 'a#b', 'a b', 'a/b', 'a%20b', 'a+b', '']) {
      assert.equal(isValidWebhookQueryParamName(name), false, `${name} should be invalid`)
    }
  })

  test('rejects the reserved names, in any case', () => {
    for (const name of ['token', 'Token', 'path', 'PATH', '__proto__', 'constructor', 'prototype']) {
      assert.equal(isValidWebhookQueryParamName(name), false, `${name} should be reserved`)
    }
  })

  test('rejects a name longer than the API limit', () => {
    assert.equal(isValidWebhookQueryParamName('a'.repeat(128)), true)
    assert.equal(isValidWebhookQueryParamName('a'.repeat(129)), false)
  })
})

describe('buildWebhookCaptureUrlWithQueryAuth', () => {
  test('returns the plain capture URL when nothing is configured', () => {
    assert.equal(buildWebhookCaptureUrlWithQueryAuth(TOKEN, []), buildWebhookCaptureUrl(TOKEN))
  })

  test('appends a single param', () => {
    const url = buildWebhookCaptureUrlWithQueryAuth(TOKEN, [
      { name: 'callback_key', value: 'secret' },
    ])
    assert.equal(url, `${buildWebhookCaptureUrl(TOKEN)}?callback_key=secret`)
  })

  test('joins several params with &', () => {
    const url = buildWebhookCaptureUrlWithQueryAuth(TOKEN, [
      { name: 'a', value: '1' },
      { name: 'b', value: '2' },
    ])
    assert.equal(url, `${buildWebhookCaptureUrl(TOKEN)}?a=1&b=2`)
  })

  test('percent-encodes values so a secret with reserved characters still works', () => {
    const url = buildWebhookCaptureUrlWithQueryAuth(TOKEN, [
      { name: 'key', value: 'a b&c=d#e?f' },
    ])

    assert.equal(url, `${buildWebhookCaptureUrl(TOKEN)}?key=a%20b%26c%3Dd%23e%3Ff`)

    // The URL a sender would paste round-trips back to the original secret.
    const parsed = new URL(url)
    assert.equal(parsed.searchParams.get('key'), 'a b&c=d#e?f')
    assert.equal(parsed.searchParams.getAll('key').length, 1)
  })

  test('a value that looks like an extra param cannot inject one', () => {
    const url = buildWebhookCaptureUrlWithQueryAuth(TOKEN, [
      { name: 'key', value: 'secret&admin=1' },
    ])

    const parsed = new URL(url)
    assert.equal(parsed.searchParams.get('key'), 'secret&admin=1')
    assert.equal(parsed.searchParams.get('admin'), null)
    assert.deepEqual([...parsed.searchParams.keys()], ['key'])
  })
})

describe('buildWebhookAuthQueryApiUrl', () => {
  test('points at the query-param auth endpoint for the token', () => {
    assert.match(buildWebhookAuthQueryApiUrl(TOKEN), new RegExp(`/api/webhook/${TOKEN}/auth-query$`))
  })

  test('encodes the token into the path', () => {
    assert.ok(!buildWebhookAuthQueryApiUrl('a/b').includes('/a/b/'))
  })
})

describe('limits match the API', () => {
  test('the client caps query params at the same number the API does', () => {
    assert.equal(MAX_WEBHOOK_AUTH_QUERY_PARAMS, 10)
  })
})

describe('appendWebhookQueryAuthParams', () => {
  // The inspector decorates the capture URL the API reported, rather than one
  // rebuilt client-side, so this has to work on an arbitrary base URL.
  const BASE = 'https://webhooks.example.com/valid-webhooks/abc123'

  test('returns the base untouched when nothing is configured', () => {
    assert.equal(appendWebhookQueryAuthParams(BASE, []), BASE)
  })

  test('appends the configured params', () => {
    assert.equal(
      appendWebhookQueryAuthParams(BASE, [
        { name: 'a', value: '1' },
        { name: 'b', value: '2' },
      ]),
      `${BASE}?a=1&b=2`
    )
  })

  test('uses & when the base already has a query string', () => {
    assert.equal(
      appendWebhookQueryAuthParams(`${BASE}?existing=1`, [{ name: 'k', value: 'v' }]),
      `${BASE}?existing=1&k=v`
    )
  })

  test('preserves the origin and path of whatever base it is given', () => {
    const url = new URL(
      appendWebhookQueryAuthParams(BASE, [{ name: 'k', value: 'v' }])
    )
    assert.equal(url.origin, 'https://webhooks.example.com')
    assert.equal(url.pathname, '/valid-webhooks/abc123')
  })

  test('percent-encodes values so the copied URL is usable as-is', () => {
    const secret = 'a b&c=d?e#f'
    const parsed = new URL(appendWebhookQueryAuthParams(BASE, [{ name: 'k', value: secret }]))

    assert.equal(parsed.searchParams.get('k'), secret)
    assert.deepEqual([...parsed.searchParams.keys()], ['k'])
    assert.equal(parsed.hash, '')
  })
})
