/*
 * Pagination Playground — reference client. It exists to prove the site and
 * its answer keys agree: for one scenario it starts a run, makes every
 * expected request (following redirects, retrying 5xx/429 and honouring
 * Retry-After, keeping cookies), extracts record ids, probes one request
 * past the end, then checks the records and the server's request log
 * against the answer key.
 *
 * It is HTTP-only. Browser scenarios (category F) are checked through the
 * XHR endpoints their answer keys list; their uiActions are not replayed.
 */
import { requestKey } from './core.js'

const ID_RE = /\bp-\d{6,9}\b/g
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function idsInJson(v, out = []) {
  if (Array.isArray(v)) v.forEach((x) => idsInJson(x, out))
  else if (v && typeof v === 'object')
    for (const [k, x] of Object.entries(v)) {
      if ((k === 'id' || k === '_id') && typeof x === 'string' && /^p-\d{6,9}$/.test(x)) out.push(x)
      else idsInJson(x, out)
    }
  return out
}

/** Record ids in a response body, by content type. */
export function extractIds(body, type) {
  if (/json/.test(type)) {
    try { return idsInJson(JSON.parse(body)) } catch { return [] }
  }
  if (/html/.test(type)) {
    const ids = [...body.matchAll(/data-id="(p-\d{6,9})"/g)].map((m) => m[1])
    for (const m of body.matchAll(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g)) {
      try { ids.push(...idsInJson(JSON.parse(m[1]))) } catch { /* not JSON */ }
    }
    return ids
  }
  return body.match(ID_RE) ?? []
}

const toRequest = (e) => (typeof e === 'string' ? { method: 'GET', url: e } : { method: e.method, url: e.url, body: e.body, contentType: e.contentType })

export async function runScenario({ base, id, variant = '', run = `ref-${id}-${Math.random().toString(36).slice(2, 10)}` }) {
  const v = variant ? `?variant=${variant}` : ''
  const answer = await (await fetch(`${base}/pagination/s/${id}/_answer${v}`)).json()
  await fetch(`${base}/pagination/_log/${id}?run=${run}`, { method: 'DELETE' })

  const jar = new Map()
  const made = new Set()
  const ids = new Set()
  const problems = []
  const keyOf = (r) => requestKey(r.method, r.url, r.body, answer.ignoreParams)

  async function send(req) {
    let firstStatus
    for (let hop = 0; hop <= 5; hop++) {
      let r
      for (let attempt = 0; ; attempt++) {
        const headers = { 'X-Run-Id': run, 'User-Agent': 'pagination-playground-reference-client/1', ...answer.requestHeaders }
        if (jar.size) headers.Cookie = [...jar].map(([k, val]) => `${k}=${val}`).join('; ')
        if (req.body) headers['Content-Type'] = req.contentType
        made.add(keyOf(req))
        r = await fetch(req.url, { method: req.method, headers, body: req.body || undefined, redirect: 'manual' })
        for (const c of r.headers.getSetCookie()) {
          const kv = c.split(';')[0]
          const i = kv.indexOf('=')
          if (i > 0) jar.set(kv.slice(0, i).trim(), kv.slice(i + 1).trim())
        }
        firstStatus ??= r.status
        if ((r.status >= 500 || r.status === 429) && attempt < 2) {
          await r.arrayBuffer()
          await sleep(Math.min(3, Number(r.headers.get('retry-after')) || 0.1) * 1000)
          continue
        }
        break
      }
      const loc = r.headers.get('location')
      if (r.status >= 300 && r.status < 400 && loc) {
        await r.arrayBuffer()
        req = { method: 'GET', url: new URL(loc, req.url).href }
        continue
      }
      return { status: r.status, firstStatus, body: await r.text(), type: r.headers.get('content-type') ?? '' }
    }
    return { status: 0, firstStatus, body: '', type: '' } // redirect loop: give up on this page
  }

  for (const e of answer.expectedRequests) {
    const req = toRequest(e)
    if (made.has(keyOf(req))) continue // already reached, e.g. as a redirect hop
    const r = await send(req)
    if (r.status === 200) extractIds(r.body, r.type).forEach((x) => ids.add(x))
  }

  if (answer.endProbe) {
    const p = answer.endProbe
    const r = await send(toRequest(p.request))
    const got = r.status === 200 ? extractIds(r.body, r.type) : []
    if (r.firstStatus !== p.expectStatus) problems.push(`end probe: expected status ${p.expectStatus}, got ${r.firstStatus}`)
    if (p.expectRecords === 'none' && got.length) problems.push(`end probe: expected no records, got ${got.length}`)
    if (p.expectRecords === 'repeat' && (!got.length || got.some((x) => !ids.has(x)))) problems.push('end probe: expected repeated records')
  }

  if (answer.expectedRecordIds) {
    const want = new Set(answer.expectedRecordIds)
    const missing = [...want].filter((x) => !ids.has(x))
    const extra = [...ids].filter((x) => !want.has(x))
    if (missing.length) problems.push(`missing records: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ` (+${missing.length - 5})` : ''}`)
    if (extra.length) problems.push(`unexpected records: ${extra.slice(0, 5).join(', ')}`)
  } else if (!ids.size) problems.push('no records collected')

  const summary = await (await fetch(`${base}/pagination/_log/${id}/summary?run=${run}${variant ? `&variant=${variant}` : ''}`)).json()
  if (!summary.pass)
    problems.push(`request log: missing ${JSON.stringify(summary.missing)}, extra ${summary.extra.length}/${summary.extraRequestsAllowed}, mustNotRequest hits ${JSON.stringify(summary.mustNotRequestHits)}`)

  return { id, variant: variant || null, run, pass: problems.length === 0, problems, records: ids.size, summary }
}
