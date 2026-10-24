/*
 * Pagination Playground — HTTP layer. `handle(req, res)` takes plain Node
 * request/response objects, so the same code runs as the Vercel function
 * (api/pagination.js) and as Vite dev middleware (vite.config.ts).
 *
 * Routes (all under /pagination):
 *   /                          catalogue home page
 *   /docs                      how to use the playground
 *   /_scenarios                machine-readable catalogue
 *   /s/<ID>/…                  a scenario (entry: /s/<ID>/ redirects to it)
 *   /s/<ID>/_answer            answer key (?variant=h01…h12 where supported)
 *   /s/<ID>/item/<id>          detail page for a record
 *   /_log/<ID>?run=            request log (GET, DELETE) and /summary
 */
import {
  CATALOGUE_VERSION, END_TEXT, H_CODES, PREFIX, addParams, allIds, esc, html, json, page, recordDetail,
  recordNumber, redirect, requestKey,
} from './core.js'
import { BY_ID, CATEGORIES, SCENARIOS } from './scenarios.js'

const RUN_RE = /^[A-Za-z0-9_-]{1,64}$/
const VARIANT_RE = /^h(0[1-9]|1[0-2])$/i
const MAX_BODY = 16 * 1024

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'",
  // Every request must reach the handler, or the request log would miss it.
  'Cache-Control': 'no-store',
}

/* ── run logs and per-run scenario state ────────────────────────────── */

// ponytail: in-memory, per process. Exact on one Node process (local dev, a VM);
// on serverless, a run split across cold instances loses entries. Move to a
// shared store (Redis/Supabase) if that bites.
const BUCKETS = new Map()
const TTL_MS = 24 * 3600_000
const MAX_BUCKETS = 2000
const MAX_ENTRIES = 1000

function bucket(id, run, create = true) {
  const key = `${id}|${run || 'anonymous'}`
  let b = BUCKETS.get(key)
  if (b && Date.now() - b.created > TTL_MS) {
    BUCKETS.delete(key)
    b = undefined
  }
  if (!b && create) {
    if (BUCKETS.size >= MAX_BUCKETS) BUCKETS.delete(BUCKETS.keys().next().value)
    b = { created: Date.now(), entries: [], state: {}, inflight: 0, maxInflight: 0, variant: null }
    BUCKETS.set(key, b)
  }
  return b
}

/* ── global per-IP rate limit ───────────────────────────────────────── */

const HITS = new Map()
function rateLimited(ip) {
  const limit = Number(process.env.PG_RATE_LIMIT ?? 600) // requests per 10 s; 0 disables
  if (!limit) return false
  const w = Math.floor(Date.now() / 10_000)
  let h = HITS.get(ip)
  if (!h || h.w !== w) {
    if (HITS.size > 10_000) HITS.clear()
    h = { w, n: 0 }
    HITS.set(ip, h)
  }
  return ++h.n > limit
}

/* ── helpers ────────────────────────────────────────────────────────── */

function baseUrl(req) {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/+$/, '')
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost').split(',')[0].trim()
  const proto = String(req.headers['x-forwarded-proto'] || (req.socket?.encrypted ? 'https' : 'http')).split(',')[0].trim()
  return `${proto === 'https' ? 'https' : 'http'}://${/^[A-Za-z0-9.-]+(:\d{1,5})?$/.test(host) ? host : 'localhost'}`
}

function parseCookies(header = '') {
  const out = {}
  for (const part of String(header).split(';')) {
    const i = part.indexOf('=')
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim()
  }
  return out
}

async function readBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return ''
  // Vercel's Node runtime pre-parses the body into req.body; plain Node leaves the stream unread.
  if (req.body !== undefined) {
    const v = req.body
    if (typeof v === 'string') return v
    if (Buffer.isBuffer(v)) return v.toString()
    if (v && typeof v === 'object') return String(req.headers['content-type'] || '').includes('form') ? new URLSearchParams(v).toString() : JSON.stringify(v)
    return ''
  }
  let size = 0
  const chunks = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY) return null
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString()
}

const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]))
const SELECTORS = { record: '.card', id: '.card[data-id]', title: '.card .title', price: '.card .price', link: '.card a[href]' }
const scenarioUrl = (base, sc, rel = '') => `${base}${PREFIX}/s/${sc.id}${rel}`

/* ── answer keys ────────────────────────────────────────────────────── */

export function answerKey(sc, base, variant) {
  const v = sc.variants && variant && VARIANT_RE.test(variant) ? variant.toUpperCase() : undefined
  const A = { abs: (rel) => scenarioUrl(base, sc, rel) }
  let a = sc.answer(A, v)
  if (sc.answerPatch) a = sc.answerPatch(a, A)
  if (v) {
    // A variant run starts from ?variant=hNN, so every URL in its key carries it too.
    const tag = (u) => addParams(u, { variant: v.toLowerCase() })
    const tagReq = (e) => (typeof e === 'string' ? tag(e) : { ...e, url: tag(e.url) })
    a = { ...a, expectedRequests: a.expectedRequests.map(tagReq), mustNotRequest: a.mustNotRequest?.map(tag), endProbe: a.endProbe && { ...a.endProbe, request: tagReq(a.endProbe.request) } }
  }
  const end = a.end ?? sc.end
  const entry = a.entryUrl ?? A.abs(sc.entryPath)
  return {
    id: sc.id,
    title: sc.title,
    category: sc.category,
    catalogueVersion: CATALOGUE_VERSION,
    client: sc.client,
    variant: v ?? null,
    entryUrl: v ? addParams(entry, { variant: v.toLowerCase() }) : entry,
    pageSize: a.pageSize ?? sc.pageSize ?? 10,
    totalRecords: a.totalRecords ?? sc.total,
    records: sc.recordsText,
    selectors: sc.recordsText.includes('li.card') ? SELECTORS : null,
    pagination: { kind: sc.kind, ...sc.pagination, end: { behaviour: end ?? 'custom', description: end ? END_TEXT[end] : sc.endText } },
    expectedRequests: a.expectedRequests,
    extraRequestsAllowed: sc.extra ?? 3,
    mustNotRequest: a.mustNotRequest ?? [],
    ignoreParams: sc.ignoreParams ?? [],
    requestHeaders: sc.requestHeaders ?? {},
    endProbe: a.endProbe ?? null,
    expectedRecordIds: a.expectedRecordIds === undefined ? allIds(sc.total) : a.expectedRecordIds,
    ...pick(a, ['expectedRecordCount', 'missedRecordIds', 'uiActions', 'cursors', 'alternatives', 'robotsTxt', 'expectedBehaviour', 'notes']),
    variants: sc.variants ? H_CODES.map((h) => ({ behaviour: h, entryUrl: addParams(A.abs(sc.entryPath), { variant: h.toLowerCase() }), answer: A.abs(`/_answer?variant=${h.toLowerCase()}`) })) : [],
    comparison: 'Requests are compared on method, path and query (in order, decoded), ignoring run/variant/bare/delay and ignoreParams; JSON bodies are compared structurally (GraphQL: variables only). Records are compared order-insensitively by id.',
  }
}

const entryKey = (e) => (typeof e === 'string' ? ['GET', e, ''] : [e.method, e.url, e.body ?? ''])

export function summarize(sc, b, base, variant) {
  const key = answerKey(sc, base, variant || b?.variant)
  const entries = b?.entries ?? []
  const ignore = key.ignoreParams
  const logKeys = entries.map((e) => requestKey(e.method, e.url, e.body, ignore))
  const used = new Set()
  const matched = []
  const missing = []
  for (const e of key.expectedRequests) {
    const [m, url, body] = entryKey(e)
    const k = requestKey(m, url, body, ignore)
    const hit = logKeys.findIndex((lk, i) => lk === k && !used.has(i))
    if (hit >= 0) {
      used.add(hit)
      matched.push(`${m} ${url}`)
    } else missing.push(`${m} ${url}`)
  }
  const forbidden = new Set(key.mustNotRequest.map((u) => requestKey('GET', u, '', ignore)))
  const extra = entries.filter((_, i) => !used.has(i)).map((e) => `${e.method} ${base}${e.url}`)
  const mustNotRequestHits = entries.filter((_, i) => forbidden.has(logKeys[i])).map((e) => `${e.method} ${base}${e.url}`)
  const first = entries[0]
  const last = entries.at(-1)
  return {
    scenario: sc.id,
    variant: key.variant,
    catalogueVersion: CATALOGUE_VERSION,
    requested: entries.map((e) => `${e.method} ${base}${e.url}`),
    matched,
    missing,
    extra,
    extraRequestsAllowed: key.extraRequestsAllowed,
    mustNotRequestHits,
    maxConcurrent: b?.maxInflight ?? 0,
    durationMs: first ? Date.parse(last.startedAt) + last.latencyMs - Date.parse(first.startedAt) : 0,
    pass: missing.length === 0 && extra.length <= key.extraRequestsAllowed && mustNotRequestHits.length === 0,
  }
}

export function catalogue(base) {
  return {
    name: 'Pagination Playground',
    catalogueVersion: CATALOGUE_VERSION,
    baseUrl: base,
    count: SCENARIOS.length,
    categories: CATEGORIES.map(([id, label]) => ({ id, label })),
    scenarios: SCENARIOS.map((sc) => ({
      id: sc.id, title: sc.title, category: sc.category, client: sc.client, description: sc.description,
      end: sc.end ?? null, endText: sc.endText, variants: sc.variants,
      entryUrl: scenarioUrl(base, sc, sc.entryPath), answerUrl: scenarioUrl(base, sc, '/_answer'), logUrl: `${base}${PREFIX}/_log/${sc.id}`,
    })),
  }
}

/* ── pages ──────────────────────────────────────────────────────────── */

const bareCtx = { sticky: {}, link: (x) => x }

function homePage(base) {
  const groups = CATEGORIES.map(([cat, label]) => {
    const items = SCENARIOS.filter((s) => s.category === cat)
      .map((s) => {
        const entry = scenarioUrl(base, s, s.entryPath)
        return `<article class="scenario" id="${s.id}">
<h3>${s.id} · ${esc(s.title)}</h3>
<p>${esc(s.description)}</p>
<p><strong>Entry:</strong> <code class="entry">${esc(entry)}</code></p>
<p><strong>End:</strong> ${esc(s.end ? `${s.end} — ${END_TEXT[s.end]}` : s.endText)}${s.client === 'browser' ? ' · <strong>needs a browser</strong>' : ''}${s.variants ? ' · H-variants' : ''}</p>
<p class="links"><a href="${esc(entry)}">Open</a><a href="${PREFIX}/s/${s.id}/_answer">Answer key</a><a href="${PREFIX}/_log/${s.id}">Request log</a></p>
</article>`
      })
      .join('\n')
    return `<section id="cat-${cat}"><h2>${esc(label)}</h2>\n<div class="grid">\n${items}\n</div></section>`
  })
  return html(page(bareCtx, {
    title: 'Pagination Playground',
    body: `<h1>Pagination Playground</h1>
<p>${SCENARIOS.length} pagination patterns found on real websites. Each one has deterministic data, a machine-readable answer key and a per-run request log, so you can develop and regression-test any scraper or crawler against it.</p>
<p><a href="${PREFIX}/docs">Docs</a> · <a href="${PREFIX}/_scenarios">/_scenarios (JSON)</a> · catalogue ${CATALOGUE_VERSION}</p>
<nav aria-label="Categories"><p>${CATEGORIES.map(([c, l]) => `<a href="#cat-${c}">${esc(l)}</a>`).join(' · ')}</p></nav>
${groups.join('\n')}`,
  }))
}

function docsPage(base) {
  const ex = `${base}${PREFIX}/s/A02`
  return html(page(bareCtx, {
    title: 'Pagination Playground docs',
    body: `<h1>Pagination Playground docs</h1>
<h2>What it is</h2>
<p>Every scenario lives under <code>${PREFIX}/s/&lt;ID&gt;/</code> and is generated from one catalogue file (<code>api/_pagination/scenarios.js</code>). Data is deterministic: the same request always gives the same response, except where a scenario says it varies (for example "fails once, then succeeds").</p>
<h2>Running it</h2>
<pre>npm run dev                  # Vite dev server, port 3000: http://localhost:3000${PREFIX}
npm run test:unit            # includes the reference client run against every scenario
BASE_URL=https://example.org # optional: the host used in answer keys and absolute links</pre>
<p>In production the Vercel function <code>api/pagination.js</code> serves it via the <code>${PREFIX}</code> rewrites in <code>vercel.json</code>. Many crawlers refuse loopback/private IPs and hostnames without a TLD, so test those crawlers against the deployed site, a tunnel (<code>cloudflared tunnel --url http://localhost:3000</code>, <code>ngrok http 3000</code>), or a VM behind a real hostname.</p>
<h2>Run IDs</h2>
<p>Pass <code>?run=&lt;id&gt;</code> on the entry URL (letters, digits, <code>-</code>, <code>_</code>, up to 64), or send an <code>X-Run-Id</code> header. The site then:</p>
<ul><li>appends <code>run=&lt;id&gt;</code> to every link it generates (HTML links, JSON next links, redirects);</li>
<li>sets a <code>pg_run</code> cookie scoped to the scenario, so clients that build URLs themselves (cursors, POST bodies) are still attributed;</li>
<li>logs every request of that run: <code>GET ${PREFIX}/_log/&lt;ID&gt;?run=&lt;id&gt;</code>.</li></ul>
<p>Without a run ID, requests are logged under <code>anonymous</code>. <code>DELETE ${PREFIX}/_log/&lt;ID&gt;?run=&lt;id&gt;</code> resets a run, including per-run state such as I01's one-off failure. Logs expire after 24 h and hold at most ${MAX_ENTRIES} entries per run.</p>
<h2>Other sticky params</h2>
<ul><li><code>variant=h01…h12</code> switches the end-of-data behaviour of any scenario marked "H-variants". Answer key: <code>_answer?variant=h01</code>.</li>
<li><code>bare=1</code> hides the explainer panel.</li>
<li><code>delay=ms</code> (0–8000) sets I05's latency.</li></ul>
<h2>Answer key format</h2>
<p><code>GET ${ex}/_answer</code>. Key fields:</p>
<table><tr><th>Field</th><th>Meaning</th></tr>
<tr><td>entryUrl</td><td>Where a scraper should start.</td></tr>
<tr><td>expectedRequests</td><td>The minimal correct set of requests, in order. Strings are GETs; objects are <code>{method, url, contentType, body}</code>.</td></tr>
<tr><td>extraRequestsAllowed</td><td>Tolerance for probing past the end, retries and parallel fetches.</td></tr>
<tr><td>mustNotRequest</td><td>Clear over-crawls. Any hit fails the run.</td></tr>
<tr><td>ignoreParams</td><td>Params that may be kept or dropped (tracking params, for example).</td></tr>
<tr><td>requestHeaders</td><td>Headers a client must send.</td></tr>
<tr><td>expectedRecordIds</td><td>The records a correct scraper collects, compared without regard to order. I12 uses <code>expectedRecordCount</code> instead.</td></tr>
<tr><td>endProbe</td><td>What one request past the end returns (status, and whether records repeat).</td></tr>
<tr><td>uiActions</td><td>For browser scenarios (category F): the clicks/scrolls a headless browser performs.</td></tr>
<tr><td>pagination</td><td>How to paginate, including <code>end.behaviour</code>.</td></tr>
<tr><td>expectedBehaviour / notes</td><td>Fault scenarios: what the client should do (retry, honour Retry-After, skip…).</td></tr></table>
<h2>Testing a scraper</h2>
<pre># curl: one page, attributed to a run
curl -s '${ex}/list?start=0&amp;run=demo1' | grep -o 'data-id="p-[0-9]*"'
curl -s '${base}${PREFIX}/_log/A02/summary?run=demo1'</pre>
<pre># Python
import requests, re, uuid
run = uuid.uuid4().hex[:12]
ids, start = set(), 0
while True:
    r = requests.get("${ex}/list", params={"start": start, "run": run})
    found = re.findall(r'data-id="(p-\\d{6,9})"', r.text)
    if not found: break
    ids |= set(found); start += 10
key = requests.get("${ex}/_answer").json()
print(set(key["expectedRecordIds"]) == ids)
print(requests.get("${base}${PREFIX}/_log/A02/summary", params={"run": run}).json()["pass"])</pre>
<pre>// Node 18+
const run = 'node-' + Date.now()
const ids = new Set()
for (let start = 0; ; start += 10) {
  const html = await (await fetch(\`${ex}/list?start=\${start}&amp;run=\${run}\`)).text()
  const found = [...html.matchAll(/data-id="(p-\\d{6,9})"/g)].map((m) => m[1])
  if (!found.length) break
  found.forEach((id) => ids.add(id))
}
console.log(await (await fetch(\`${base}${PREFIX}/_log/A02/summary?run=\${run}\`)).json())</pre>
<pre>// Playwright: client-side scenario F01
const run = 'pw-' + Date.now()
await page.goto('${base}${PREFIX}/s/F01/list?run=' + run)
while (await page.locator('button.load-more').count()) await page.click('button.load-more')
const ids = await page.locator('li.card').evaluateAll((els) => els.map((e) => e.dataset.id))</pre>
<h2>CLI checker</h2>
<pre>node scripts/playground-check.mjs --base ${base} --scenario A02 --run demo1 --records records.json</pre>
<p><code>records.json</code> is a JSON array of record ids, or of objects with an <code>id</code>. The checker compares them and the logged requests with the answer key, prints a diff and exits non-zero on failure.</p>
<h2>Adding a scenario</h2>
<p>Add one entry to <code>api/_pagination/scenarios.js</code>. Most scenarios are a <code>paged({ id, category, title, description, howTo, url, parse })</code> call. Then run <code>npm run test:unit</code> (the reference client checks the new answer key) and <code>node scripts/gen-pagination-docs.mjs</code> (regenerates <code>docs/pagination-playground/</code>).</p>`,
  }))
}

function detailPage(ctx, n) {
  const r = recordDetail(ctx.sc.id, n)
  return html(page(ctx, {
    title: r.title,
    body: `<article class="detail" data-id="${r.id}">
<h1 class="title">${esc(r.title)}</h1>
<p class="price" data-price="${r.price}">₹${r.price}</p>
<p class="rating" data-rating="${r.rating}">★ ${r.rating.toFixed(1)}</p>
<p class="category">${esc(r.category)}</p>
<p class="description">${esc(r.description)}</p>
<dl class="specs"><dt>Material</dt><dd>${esc(r.specs.material)}</dd><dt>Colour</dt><dd>${esc(r.specs.colour)}</dd><dt>Weight</dt><dd>${r.specs.weightGrams} g</dd></dl>
<time class="created" datetime="${r.createdAt}">${r.createdAt.slice(0, 10)}</time>
</article>
<p><a href="${esc(ctx.link(ctx.sc.entryPath))}">← Back to the listing</a></p>`,
  }))
}

/* ── request handling ───────────────────────────────────────────────── */

function send(res, out, method) {
  res.statusCode = out.status
  const headers = { ...SECURITY_HEADERS, ...out.headers }
  const cookies = [headers['Set-Cookie'], out.cookie].flat().filter(Boolean)
  delete headers['Set-Cookie']
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v)
  if (cookies.length) res.setHeader('Set-Cookie', cookies)
  res.end(method === 'HEAD' ? undefined : out.body)
}

const plain404 = () => html(page(bareCtx, { title: 'Not found', body: `<h1>404 — Not found</h1><p><a href="${PREFIX}">Back to the catalogue</a></p>` }), 404)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function handle(req, res) {
  const started = Date.now()
  const u = new URL(req.url || '/', 'http://x')
  // On Vercel the rewrite hands the original path over as ?__pgpath=…
  const pgPath = u.searchParams.get('__pgpath')
  let path = u.pathname
  if (pgPath !== null) path = PREFIX + (pgPath ? '/' + pgPath.replace(/^\/+/, '') : '')
  else if (path.startsWith('/api/pagination')) path = PREFIX + path.slice('/api/pagination'.length)
  const rawQuery = u.search.slice(1).split('&').filter((p) => p && !p.startsWith('__pgpath=')).join('&')
  const query = new URLSearchParams(rawQuery)
  const method = String(req.method || 'GET').toUpperCase()
  const base = baseUrl(req)
  const rest = path.slice(PREFIX.length)

  if (!path.startsWith(PREFIX) || (rest && !rest.startsWith('/'))) return send(res, plain404(), method)
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim()
  if (rateLimited(ip)) return send(res, json({ error: 'rate_limited', message: 'Too many requests from this address' }, 429, { 'Retry-After': '10' }), method)

  if (rest === '' || rest === '/') return send(res, homePage(base), method)
  if (rest === '/docs') return send(res, docsPage(base), method)
  if (rest === '/_scenarios') return send(res, json(catalogue(base)), method)

  let m = rest.match(/^\/_log\/([A-J]\d{2})(\/summary)?$/)
  if (m) {
    const sc = BY_ID[m[1]]
    if (!sc) return send(res, json({ error: 'unknown_scenario' }, 404), method)
    const run = RUN_RE.test(query.get('run') ?? '') ? query.get('run') : ''
    if (method === 'DELETE' && !m[2]) {
      BUCKETS.delete(`${sc.id}|${run || 'anonymous'}`)
      return send(res, json({ ok: true, scenario: sc.id, run: run || 'anonymous' }), method)
    }
    const b = bucket(sc.id, run, false)
    if (m[2]) return send(res, json({ run: run || 'anonymous', ...summarize(sc, b, base, query.get('variant')) }), method)
    return send(res, json({ scenario: sc.id, run: run || 'anonymous', count: b?.entries.length ?? 0, maxConcurrent: b?.maxInflight ?? 0, entries: b?.entries ?? [] }), method)
  }

  m = rest.match(/^\/s\/([A-J]\d{2})(\/.*)?$/)
  const sc = m && BY_ID[m[1]]
  if (!sc) return send(res, plain404(), method)
  const sub = m[2] || '/'
  if (sub === '/_answer') return send(res, json(answerKey(sc, base, query.get('variant'))), method)

  const cookies = parseCookies(req.headers.cookie)
  const run = [query.get('run'), req.headers['x-run-id'], cookies.pg_run].find((v) => typeof v === 'string' && RUN_RE.test(v)) || ''
  const variant = VARIANT_RE.test(query.get('variant') ?? '') ? query.get('variant').toLowerCase() : ''
  const delay = /^\d{1,4}$/.test(query.get('delay') ?? '') && Number(query.get('delay')) <= 8000 ? query.get('delay') : ''
  const root = `${PREFIX}/s/${sc.id}`
  const sticky = { run, variant, bare: query.get('bare') === '1' ? '1' : '', delay }

  if (sub === '/') return send(res, redirect(addParams(root + sc.entryPath, sticky), 302), method)

  const b = bucket(sc.id, run)
  if (variant) b.variant = variant
  b.inflight++
  b.maxInflight = Math.max(b.maxInflight, b.inflight)
  const concurrent = b.inflight

  const body = await readBody(req)
  const ctx = {
    sc, method, path: sub, query, body: body ?? '', headers: req.headers, cookies, run, variant: variant.toUpperCase(),
    bare: sticky.bare === '1', sticky, base, host: base.replace(/^https?:\/\//, ''), root, state: b.state,
    link: (rel) => addParams(root + rel, sticky),
  }

  let out
  try {
    if (body === null) out = json({ error: 'payload_too_large', message: `Bodies are limited to ${MAX_BODY} bytes` }, 413)
    else {
      const item = sub.match(/^\/item\/(p-\d{6,9})$/)
      if (item) {
        const n = recordNumber(item[1])
        out = n >= 1 && n <= sc.total ? detailPage(ctx, n) : undefined
      } else out = await sc.handle(ctx)
    }
  } catch (err) {
    console.error('[pagination-playground]', sc.id, err)
    out = json({ error: 'internal_error' }, 500)
  }
  out ??= plain404()
  if (out.delay) await sleep(out.delay)
  if (run && cookies.pg_run !== run) out = { ...out, cookie: `pg_run=${run}; Path=${root}; SameSite=Lax; HttpOnly` }

  send(res, out, method)
  b.inflight--
  if (b.entries.length < MAX_ENTRIES)
    b.entries.push({
      seq: b.entries.length + 1,
      method,
      url: sub === '/' ? root : root + sub + (rawQuery ? '?' + rawQuery : ''),
      status: out.status,
      startedAt: new Date(started).toISOString(),
      latencyMs: Date.now() - started,
      concurrent,
      body: body ? body.slice(0, 2048) : undefined,
      headers: pick(Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, String(v)])), ['user-agent', 'referer', 'accept', 'content-type', 'x-run-id', 'x-requested-with']),
    })
}
