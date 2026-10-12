import assert from 'node:assert/strict'
import test, { type TestContext } from 'node:test'
import { fetchWebhookRequests } from '../../src/api/webhook.ts'
import { fetchWebhookRequests as fetchLegacyRequests } from '../../src/api/legacyWebhook.ts'
import { startVisiblePolling } from '../../src/utils/visiblePolling.ts'

const token = 'uitokenaaaaaaaa1'
const validPayload = { token, captureUrl: '/capture', inspectUrl: '/inspect', requests: [] }

for (const [name, fetchRequests] of [['current', fetchWebhookRequests], ['legacy', fetchLegacyRequests]] as const) {
  test(`${name}: a bad background response preserves the last list and a later poll recovers`, async (t) => {
    let response: unknown = validPayload
    t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(response)))
    let displayed = await fetchRequests(token)
    for (response of [null, {}, { error: 'Session expired' }, { requests: null }, { requests: {} },
      { requests: [null] }, { requests: [{ id: '1', body: null, response: {} }] },
      { ...validPayload, blocked: {} }, { ...validPayload, blocked: [null] }]) {
      await assert.rejects(async () => { displayed = await fetchRequests(token) }, /Invalid webhook response/)
      assert.deepEqual(displayed, validPayload)
    }
    response = { ...validPayload, retentionHours: 24 }
    displayed = await fetchRequests(token)
    assert.deepEqual(displayed, response)
  })

  test(`${name}: accepts populated lists and empty lists after retention expiry`, async (t) => {
    const record = {
      id: 'request-1', token, receivedAt: '2026-10-12T10:00:00Z', method: 'POST',
      path: '/capture', url: 'https://example.test/capture', query: {}, headers: {}, cookies: {}, ip: null,
      body: { format: 'json', encoding: 'utf8', sizeBytes: 2, contentType: 'application/json', text: '{}', json: {}, base64: null, preview: '{}' },
      response: { statusCode: 200, headers: {}, body: null, text: null },
    }
    let response = { ...validPayload, requests: [record] }
    t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(response)))
    assert.deepEqual((await fetchRequests(token)).requests, [record])
    response = { ...validPayload, requests: [] }
    assert.deepEqual((await fetchRequests(token)).requests, [])
  })

  test(`${name}: an HTML wake-up response does not become render state`, async (t) => {
    t.mock.method(globalThis, 'fetch', async () => new Response('<html>Unavailable</html>'))
    await assert.rejects(fetchRequests(token), /Invalid webhook response/)
  })

  test(`${name}: HTTP errors still reach the existing error UI`, async (t) => {
    t.mock.method(globalThis, 'fetch', async () => new Response('{"error":"Unavailable"}', { status: 503 }))
    await assert.rejects(fetchRequests(token), /Unavailable/)
  })
}

// A deterministic browser clock: exercising an eight-hour idle period does not
// need a real eight-hour wait or real network traffic.
function pollingEnvironment(t: TestContext) {
  const document = Object.assign(new EventTarget(), { visibilityState: 'visible' })
  const timers = new Map<number, () => void>()
  let nextId = 0
  const window = {
    setTimeout(callback: () => void) { timers.set(++nextId, callback); return nextId },
    clearTimeout(id?: number) { if (id !== undefined) timers.delete(id) },
  }
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  Object.defineProperty(globalThis, 'window', { configurable: true, value: window })
  Object.defineProperty(globalThis, 'document', { configurable: true, value: document })
  t.after(() => {
    for (const [key, descriptor] of [['window', oldWindow], ['document', oldDocument]] as const) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  })
  return {
    timers,
    visibility(value: string) {
      document.visibilityState = value
      document.dispatchEvent(new Event('visibilitychange'))
    },
    tick() {
      const pending = [...timers.values()]
      timers.clear()
      pending.forEach((callback) => callback())
    },
  }
}
const settle = async () => { await Promise.resolve(); await Promise.resolve() }

test('polling pauses when hidden, resumes immediately, and removes listeners on cleanup', async (t) => {
  const env = pollingEnvironment(t)
  let calls = 0
  const stop = startVisiblePolling(async () => { calls++ }, 2500)
  await settle()
  assert.equal(calls, 1)
  assert.equal(env.timers.size, 1)
  env.visibility('hidden')
  assert.equal(env.timers.size, 0)
  for (let i = 0; i < 8 * 60 * 60 / 2.5; i++) env.tick()
  assert.equal(calls, 1)
  env.visibility('visible')
  await settle()
  assert.equal(calls, 2)
  env.tick()
  await settle()
  assert.equal(calls, 3)
  stop()
  env.visibility('visible')
  env.tick()
  assert.equal(calls, 3)
  assert.equal(env.timers.size, 0)
})

test('slow requests never overlap, including repeated tab wake-ups', async (t) => {
  const env = pollingEnvironment(t)
  let calls = 0
  let finish!: () => void
  const stop = startVisiblePolling(() => { calls++; return new Promise<void>((resolve) => { finish = resolve }) }, 2500)
  env.visibility('hidden')
  env.visibility('visible')
  env.visibility('visible')
  env.tick()
  assert.equal(calls, 1)
  finish()
  await settle()
  assert.equal(env.timers.size, 1)
  env.tick()
  assert.equal(calls, 2)
  stop()
  finish()
  await settle()
  assert.equal(env.timers.size, 0)
})

test('a hidden initial mount waits until visible to fetch', async (t) => {
  const env = pollingEnvironment(t)
  env.visibility('hidden')
  let calls = 0
  const stop = startVisiblePolling(async () => { calls++ }, 2500)
  assert.equal(calls, 0)
  env.visibility('visible')
  await settle()
  assert.equal(calls, 1)
  stop()
})
