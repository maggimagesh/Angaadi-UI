#!/usr/bin/env node
/*
 * Pagination Playground checker for third-party scrapers.
 *
 *   node scripts/playground-check.mjs --base https://angaadi.dev --scenario A02 --run <runId> [--records records.json] [--variant h01]
 *
 * Compares the requests logged for the run, and optionally the scraper's
 * records (a JSON array of ids, or of objects with an `id`), with the
 * scenario's answer key. Prints a diff; exits 1 on any mismatch.
 */
import { readFileSync } from 'node:fs'
import { parseArgs } from 'node:util'

const { values: a } = parseArgs({
  options: { base: { type: 'string', default: 'http://localhost:3000' }, scenario: { type: 'string' }, run: { type: 'string' }, records: { type: 'string' }, variant: { type: 'string' } },
})
if (!a.scenario || !a.run) {
  console.error('usage: playground-check --scenario <ID> --run <runId> [--records records.json] [--base URL] [--variant hNN]')
  process.exit(2)
}

const base = a.base.replace(/\/+$/, '')
const v = a.variant ? `variant=${encodeURIComponent(a.variant)}` : ''
const get = async (path) => {
  const r = await fetch(base + path)
  if (!r.ok) throw new Error(`${r.status} from ${path}`)
  return r.json()
}
const key = await get(`/pagination/s/${a.scenario}/_answer${v ? '?' + v : ''}`)
const summary = await get(`/pagination/_log/${a.scenario}/summary?run=${encodeURIComponent(a.run)}${v ? '&' + v : ''}`)
let ok = summary.pass

console.log(`${key.id} · ${key.title}${key.variant ? ` (variant ${key.variant})` : ''} · run ${a.run}`)
console.log(`\nRequests: ${summary.requested.length} made, ${summary.matched.length}/${key.expectedRequests.length} expected matched, max concurrency ${summary.maxConcurrent}, ${summary.durationMs} ms`)
for (const m of summary.missing) console.log(`  - missing   ${m}`)
for (const x of summary.extra) console.log(`  + extra     ${x}`)
for (const x of summary.mustNotRequestHits) console.log(`  ! forbidden ${x}`)
console.log(`  extra requests ${summary.extra.length} (allowed ${summary.extraRequestsAllowed})`)

if (a.records) {
  const raw = JSON.parse(readFileSync(a.records, 'utf8'))
  const got = new Set((Array.isArray(raw) ? raw : raw.records ?? []).map((r) => (typeof r === 'string' ? r : r.id)))
  if (key.expectedRecordIds) {
    const want = new Set(key.expectedRecordIds)
    const missing = [...want].filter((x) => !got.has(x))
    const extra = [...got].filter((x) => !want.has(x))
    console.log(`\nRecords: ${got.size} collected, ${want.size} expected`)
    for (const x of missing) console.log(`  - missing   ${x}`)
    for (const x of extra) console.log(`  + extra     ${x}`)
    ok &&= !missing.length && !extra.length
  } else {
    console.log(`\nRecords: ${got.size} collected (answer key expects ${key.expectedRecordCount} in total; not compared id by id)`)
  }
}
if (key.expectedBehaviour) console.log(`\nExpected behaviour: ${key.expectedBehaviour}`)
console.log(`\n${ok ? 'PASS' : 'FAIL'}`)
process.exit(ok ? 0 : 1)
