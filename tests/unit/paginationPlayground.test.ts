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
