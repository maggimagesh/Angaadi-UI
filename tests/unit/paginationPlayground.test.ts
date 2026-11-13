// The Pagination Playground's reference client, run against every scenario
// and every H-variant of the base URL/path scenarios. A pass means the server
// and the answer keys agree: the expected requests yield exactly the expected
// records, the end probe returns the documented signal, and the request log
// matches within the documented tolerance.
import assert from 'node:assert/strict'
import { createServer, type Server } from 'node:http'
import test, { after, before, describe } from 'node:test'
import { handle } from '../../api/_pagination/app.js'
import { runScenario } from '../../api/_pagination/client.js'
import { record } from '../../api/_pagination/core.js'
import { SCENARIOS } from '../../api/_pagination/scenarios.js'

process.env.PG_RATE_LIMIT = '0'
let server: Server
let base = ''

before(async () => {
  server = createServer((req, res) => void handle(req, res))
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const addr = server.address()
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`
})
after(() => server.close())

describe('data generator', () => {
  test('is deterministic and derives createdAt from the id', () => {
    assert.deepEqual(record('A01', 5), record('A01', 5))
    assert.equal(record('A01', 5).id, 'p-000005')
    assert.equal(record('A01', 5).createdAt, '2024-01-01T04:00:00Z')
    assert.notDeepEqual(record('A01', 5).title + record('A01', 6).title, record('B01', 5).title + record('B01', 6).title)
  })
})

describe('reference client', () => {
  test('passes every scenario against its answer key', { timeout: 120_000 }, async () => {
    const results = await Promise.all(SCENARIOS.map((sc) => runScenario({ base, id: sc.id })))
    assert.deepEqual(results.filter((r) => !r.pass).map((r) => ({ id: r.id, problems: r.problems })), [])
    assert.equal(results.length, 123)
  })

  test('passes every H-variant of A01, A02 and B01', { timeout: 60_000 }, async () => {
    const runs = ['A01', 'A02', 'B01'].flatMap((id) =>
      Array.from({ length: 12 }, (_, k) => runScenario({ base, id, variant: `h${String(k + 1).padStart(2, '0')}` }))
    )
    const results = await Promise.all(runs)
    assert.deepEqual(results.filter((r) => !r.pass).map((r) => ({ id: r.id, variant: r.variant, problems: r.problems })), [])
  })

  test('the log summary flags an over-crawl', async () => {
    const run = 'overcrawl-check'
    await fetch(`${base}/pagination/_log/A02?run=${run}`, { method: 'DELETE' })
    for (const start of [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]) await fetch(`${base}/pagination/s/A02/list?start=${start}&run=${run}`)
    const summary = await (await fetch(`${base}/pagination/_log/A02/summary?run=${run}`)).json()
    assert.equal(summary.pass, false)
    assert.equal(summary.mustNotRequestHits.length, 1)
  })
})

describe('A17 data and end parameters', () => {
  const get = async (q: string) => {
    const r = await fetch(`${base}/pagination/s/A17/list?${q}`, { redirect: 'manual' })
    const body = await r.text()
    return { status: r.status, ids: [...body.matchAll(/data-id="([^"]+)"/g)].map((m) => m[1]), next: /rel="next" href="([^"]+)"/.exec(body)?.[1] ?? null }
  }

  test('data sets records per page and end makes later pages empty, for every type', async () => {
    const p1 = await get('type=1&page=1&data=20&end=50')
    assert.equal(p1.status, 200)
    assert.equal(p1.ids.length, 20)
    assert.match(p1.next ?? '', /page=2&amp;data=20&amp;end=50/)
    const p2 = await get('type=1&page=2&data=20&end=50')
    assert.equal(p2.ids[0], 'p-1000021')
    assert.equal((await get('type=1&page=50&data=20&end=50')).ids.length, 20)
    for (const t of [1, 2, 3]) {
      const after = await get(`type=${t}&page=51&data=20&end=50`)
      assert.deepEqual([after.status, after.ids.length], [200, 0], `type ${t}`)
    }
  })

  test('without the parameters A17 keeps its type rules', async () => {
    assert.equal((await get('type=1&page=1')).ids.length, 10)
    assert.equal((await get('type=3&page=6')).status, 404)
    assert.equal((await get('type=2&page=3&data=25')).ids.length, 25)
  })

  test('rejects out-of-range values', async () => {
    for (const q of ['data=0', 'data=101', 'end=0', 'end=abc']) assert.equal((await get(`type=1&page=1&${q}`)).status, 400, q)
  })
})
