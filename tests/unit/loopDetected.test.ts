// Tests for the never-finishing /loop-detected page (api/_loop/app.js).
import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import test, { describe } from 'node:test'

type Handle = (req: object, res: object, options?: object) => void
// A computed specifier keeps tsc from type-checking the plain .js module.
const { handle }: { handle: Handle } = await import(new URL('../../api/_loop/app.js', import.meta.url).href)

async function withServer(options: object, fn: (base: string) => Promise<void>) {
  const server = http.createServer((req, res) => handle(req, res, options))
  await new Promise<void>((resolve) => server.listen(0, resolve))
  const { port } = server.address() as AddressInfo
  try { await fn(`http://localhost:${port}`) } finally { server.closeAllConnections(); server.close() }
}

describe('/loop-detected', () => {
  test('/loop-detected/status answers 508 JSON', async () => {
    await withServer({}, async (base) => {
      const res = await fetch(`${base}/loop-detected/status`)
      assert.equal(res.status, 508)
      assert.equal((await res.json()).code, 508)
    })
  })

  test('the page streams, navigates to itself and is still open after the cycle', async () => {
    await withServer({ cycleMs: 200, heartbeatMs: 50, graceMs: 5000 }, async (base) => {
      const res = await fetch(`${base}/loop-detected`)
      assert.equal(res.status, 200)
      assert.match(res.headers.get('content-type') ?? '', /text\/html/)
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let body = ''
      const deadline = Date.now() + 2000
      while (!body.includes('__loopNext()</script>') && Date.now() < deadline) {
        const { value, done } = await reader.read()
        assert.equal(done, false, 'the response must not end')
        body += decoder.decode(value)
      }
      assert.match(body, /AUTOMATIC LOOP DETECTED/)
      assert.match(body, /<script>__loopNext\(\)<\/script>/)
      assert.doesNotMatch(body, /<\/html>/, 'the document must never be completed')
      await reader.cancel()
    })
  })

  test('without a follow-up request the response ends after the grace period', async () => {
    await withServer({ cycleMs: 100, heartbeatMs: 50, graceMs: 100 }, async (base) => {
      const text = await (await fetch(`${base}/loop-detected`)).text()
      assert.match(text, /<\/html>$/)
    })
  })
})
