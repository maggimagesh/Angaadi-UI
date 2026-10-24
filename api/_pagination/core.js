/*
 * Pagination Playground — shared building blocks: the deterministic dataset,
 * HTML/JSON response helpers, and the `paged()` factory most scenarios are
 * built from. Nothing here touches the clock, the file system or the network.
 */

export const CATALOGUE_VERSION = '1.0.0'
export const PREFIX = '/pagination'
/** Query params the site propagates into every generated link. Never part of a scenario's own URL. */
export const STICKY = ['run', 'variant', 'bare', 'delay']
export const H_CODES = ['H01', 'H02', 'H03', 'H04', 'H05', 'H06', 'H07', 'H08', 'H09', 'H10', 'H11', 'H12']

export const END_TEXT = {
  H01: '404 Not Found past the last page',
  H02: '200 with an empty list past the last page',
  H03: '200 with an empty body past the last page',
  H04: 'the last page is repeated for any out-of-range page',
  H05: 'the first page is returned for out-of-range pages (silent reset)',
  H06: '302 redirect to page 1 for out-of-range pages',
  H07: '410 Gone past the last page',
  H08: '400 Bad Request with a JSON "page out of range" error',
  H09: 'soft 404: 200 with a "No results found" message and no records',
  H10: 'total pages announced ("Page 3 of 5"); pages past it return 404',
  H11: 'partial last page (fewer than pageSize records), then 404',
  H12: 'exactly full last page, then a 200 empty page; the end is only detectable by requesting it',
}

/* ── deterministic data ─────────────────────────────────────────────── */

export function hash32(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** mulberry32 */
export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const CATALOG = {
  Shoes: ['Sneakers', 'Loafers', 'Sandals', 'Boots', 'Running Shoes'],
  Kurtas: ['Kurta', 'Kurta Set', 'Nehru Jacket', 'Sherwani', 'Pathani Suit'],
  Sarees: ['Silk Saree', 'Cotton Saree', 'Chiffon Saree', 'Linen Saree', 'Banarasi Saree'],
  Bags: ['Tote', 'Backpack', 'Sling Bag', 'Clutch', 'Duffel'],
  Watches: ['Analog Watch', 'Chronograph', 'Smartwatch', 'Dress Watch', 'Diver Watch'],
  Home: ['Table Lamp', 'Cushion Cover', 'Dhurrie', 'Brass Diya', 'Ceramic Vase'],
}
const CATEGORIES = Object.keys(CATALOG)
const ADJ = ['Classic', 'Handwoven', 'Everyday', 'Festive', 'Minimal', 'Heritage', 'Urban', 'Royal', 'Breezy', 'Vintage', 'Modern', 'Rustic']
const COLOURS = ['Indigo', 'Saffron', 'Ivory', 'Teal', 'Maroon', 'Charcoal', 'Mustard', 'Olive', 'Rose', 'Navy']
const MATERIALS = ['Cotton', 'Silk', 'Leather', 'Linen', 'Brass', 'Canvas', 'Steel', 'Jute']
const EPOCH = Date.UTC(2024, 0, 1)
const HOUR = 3600_000

export const recordId = (n) => 'p-' + String(n).padStart(6, '0')
export const recordNumber = (id) => (/^p-\d{6,9}$/.test(id) ? Number(id.slice(2)) : NaN)
/** Record n is created n-1 hours after 2024-01-01T00:00:00Z — derived from the id, never "now". */
export const createdAt = (n) => new Date(EPOCH + (n - 1) * HOUR).toISOString().replace('.000Z', 'Z')

/** Record n (1-based) of a scenario. Random access, so 100,000-record scenarios cost nothing. */
export function record(scId, n) {
  const r = rng(hash32(`${scId}:${n}`))
  const pick = (arr) => arr[Math.floor(r() * arr.length)]
  const category = pick(CATEGORIES)
  const id = recordId(n)
  return {
    id,
    title: `${pick(ADJ)} ${pick(COLOURS)} ${pick(CATALOG[category])}`,
    category,
    price: Math.round(149 + r() * 9850),
    rating: Math.round(r() * 50) / 10,
    createdAt: createdAt(n),
    url: `${PREFIX}/s/${scId}/item/${id}`,
  }
}

export function recordDetail(scId, n) {
  const base = record(scId, n)
  const r = rng(hash32(`${scId}:${n}:detail`))
  const pick = (arr) => arr[Math.floor(r() * arr.length)]
  const material = pick(MATERIALS)
  return {
    ...base,
    description: `${base.title} in ${material.toLowerCase()}, made in small batches. Part of the ${base.category.toLowerCase()} range.`,
    specs: { material, colour: base.title.split(' ')[1], weightGrams: Math.round(100 + r() * 1900) },
  }
}

/** Records n = from+1 … min(from+count, total). */
export const records = (scId, from, count, total) => {
  const out = []
  for (let n = from + 1; n <= Math.min(from + count, total); n++) out.push(record(scId, n))
  return out
}
export const allIds = (total, skip = []) => {
  const out = []
  for (let n = 1; n <= total; n++) if (!skip.includes(n)) out.push(recordId(n))
  return out
}
export const range = (n) => Array.from({ length: Math.max(0, n) }, (_, i) => i)

/* ── responses ──────────────────────────────────────────────────────── */

export const res = (status, body = '', headers = {}) => ({ status, body, headers })
export const html = (body, status = 200, headers = {}) =>
  res(status, body, { 'Content-Type': 'text/html; charset=utf-8', ...headers })
export const json = (obj, status = 200, headers = {}) =>
  res(status, JSON.stringify(obj, null, 2), { 'Content-Type': 'application/json; charset=utf-8', ...headers })
export const text = (body, type, status = 200, headers = {}) => res(status, body, { 'Content-Type': type, ...headers })
export const redirect = (location, status = 302) => res(status, '', { Location: location })
export const isResponse = (v) => v !== null && typeof v === 'object' && typeof v.status === 'number'

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export function addParams(href, params) {
  const pairs = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  if (!pairs.length) return href
  const hashAt = href.indexOf('#')
  const base = hashAt >= 0 ? href.slice(0, hashAt) : href
  const frag = hashAt >= 0 ? href.slice(hashAt) : ''
  const qs = pairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
  return base + (base.includes('?') ? '&' : '?') + qs + frag
}

/* ── request comparison (shared by the log summary and the reference client) ── */

function stable(v) {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`
  return JSON.stringify(v)
}

/** Method + path + ordered, decoded query (sticky and ignored params dropped) + canonical body. */
export function requestKey(method, url, body = '', ignore = []) {
  const u = new URL(url, 'http://h')
  const drop = new Set([...STICKY, '__pgpath', ...ignore])
  const pairs = [...u.searchParams].filter(([k]) => !drop.has(k)).map(([k, v]) => `${k}=${v}`)
  let path = u.pathname
  try { path = decodeURIComponent(path) } catch { /* keep raw */ }
  let b = ''
  if (body) {
    // GraphQL bodies compare on variables only: query text formatting varies between clients.
    try {
      const parsed = JSON.parse(body)
      b = stable(parsed && typeof parsed === 'object' && 'variables' in parsed ? parsed.variables : parsed)
    } catch { b = String(body) }
  }
  return `${String(method).toUpperCase()} ${path}${pairs.length ? '?' + pairs.join('&') : ''}${b ? ' ' + b : ''}`
}

/* ── HTML ───────────────────────────────────────────────────────────── */

const CSS = `
*,*::before,*::after{box-sizing:border-box}
body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;font-size:15px;line-height:1.5;color:#1d1d1f;background:#f3f4f6}
a{color:#1f4fd1}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;background:#eef0f4;padding:1px 4px;border-radius:4px}
.site-header{background:#131a2a;color:#fff;padding:12px 16px;display:flex;gap:8px;align-items:center}
.site-header a{color:#fff;font-weight:700;text-decoration:none}
.site-footer{color:#6b7280;font-size:13px;text-align:center;padding:24px 16px}
main,.pg-explainer,.wrap{max-width:1040px;margin:0 auto;padding:16px}
.pg-explainer{margin-top:16px;background:#fff8e1;border:1px solid #f1d38a;border-radius:8px}
.pg-explainer summary{cursor:pointer;font-weight:700}
.pg-explainer dt{font-weight:600;margin-top:8px}
.pg-explainer dd{margin:2px 0 0}
h1{font-size:24px;margin:8px 0 12px}
.cards{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:12px}
.card .title{font-size:15px;margin:0 0 6px}
.card p{margin:2px 0;color:#4b5563;font-size:13px}
.card .price{color:#111;font-weight:700;font-size:15px}
.card time{color:#6b7280;font-size:12px}
.pagination{display:flex;flex-wrap:wrap;gap:6px;margin:20px 0;align-items:center}
.pagination a,.pagination span,.pagination button{padding:6px 12px;border:1px solid #d1d5db;border-radius:6px;background:#fff;text-decoration:none;color:#1f2937;font:inherit}
.pagination .current{background:#1f4fd1;color:#fff;border-color:#1f4fd1}
.pagination .disabled{color:#9ca3af;pointer-events:none}
.pagination .ellipsis{border:none;background:none}
.page-info{color:#4b5563}
.no-results{background:#fff;border:1px dashed #d1d5db;padding:24px;text-align:center;border-radius:8px}
.load-more,.see-more,.show-more{display:block;margin:20px auto;padding:10px 20px;border-radius:6px;border:1px solid #1f4fd1;background:#fff;color:#1f4fd1;font:inherit;cursor:pointer}
#sentinel{padding:24px;text-align:center;color:#6b7280}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
.scenario{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:12px}
.scenario h3{margin:0 0 4px;font-size:15px}
.scenario p{margin:4px 0;font-size:13px;color:#4b5563}
.scenario .links a{margin-right:10px;font-size:13px}
.entry{word-break:break-all}
table{border-collapse:collapse;width:100%;background:#fff}
td,th{border:1px solid #e5e7eb;padding:6px 8px;text-align:left;vertical-align:top;font-size:13px}
pre{background:#111827;color:#e5e7eb;padding:12px;border-radius:8px;overflow:auto;font-size:13px}
.filters{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:12px}
.virtual-viewport{height:400px;overflow-y:auto;border:1px solid #d1d5db;border-radius:8px;background:#fff;position:relative}
.virtual-viewport .cards{display:block;position:relative}
.virtual-viewport .card{position:absolute;left:0;right:0;height:48px;border-radius:0;border-width:0 0 1px;padding:6px 12px;display:flex;gap:16px;align-items:center}
.virtual-viewport .card p,.virtual-viewport .card time,.virtual-viewport .card .title{margin:0}
`

export function page(ctx, { title, body, head = '', script = '' }) {
  const sc = ctx.sc
  const data = sc ? `<script>window.__PG__=${JSON.stringify({ root: ctx.root, run: ctx.run || '', q: stickyQuery(ctx) }).replace(/</g, '\\u003c')}</script>\n` : ''
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(title)}</title>
${head}<style>${CSS}</style>
</head>
<body>
<header class="site-header"><a href="${PREFIX}">Pagination Playground</a>${sc ? ` <span aria-hidden="true">›</span> <span>${sc.id}</span>` : ''}</header>
${sc && !ctx.bare ? explainer(ctx) : ''}
<main id="main">
${body}
</main>
<footer class="site-footer">Pagination Playground · catalogue ${CATALOGUE_VERSION} · <a href="${PREFIX}/docs">Docs</a></footer>
${script ? `${data}<script>${CLIENT_JS}\n${script}</script>\n` : ''}</body>
</html>
`
}

export const stickyQuery = (ctx) =>
  Object.entries(ctx.sticky).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')

/** Shared by every client-side scenario. `PG` comes from window.__PG__. */
const CLIENT_JS = `
const PG = window.__PG__;
const addq = (p) => (PG.q ? p + (p.includes('?') ? '&' : '?') + PG.q : p);
const u = (rel) => addq(PG.root + rel);
const escH = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const card = (r) => '<li class="card" data-id="' + r.id + '"><a href="' + u('/item/' + r.id) + '"><h3 class="title">' + escH(r.title) + '</h3></a>' +
  '<p class="category">' + escH(r.category) + '</p><p class="price" data-price="' + r.price + '">\\u20b9' + r.price + '</p>' +
  '<p class="rating" data-rating="' + r.rating + '">\\u2605 ' + r.rating.toFixed(1) + '</p>' +
  '<time class="created" datetime="' + r.createdAt + '">' + r.createdAt.slice(0, 10) + '</time></li>';
const getJSON = (url) => fetch(url, { headers: PG.run ? { 'X-Run-Id': PG.run, Accept: 'application/json' } : { Accept: 'application/json' } }).then((r) => r.json());
`

function explainer(ctx) {
  const sc = ctx.sc
  const entry = ctx.root + sc.entryPath
  const variants = sc.variants
    ? `<p class="variants">Switch end behaviour: ${H_CODES.map((h) => `<a href="${esc(addParams(entry, { run: ctx.run, variant: h.toLowerCase() }))}">${h}</a>`).join(' ')} · <a href="${esc(addParams(entry, { run: ctx.run }))}">default</a></p>`
    : ''
  const end = (ctx.variant && sc.variants ? ctx.variant : sc.end) || ''
  return `<details class="pg-explainer" open>
<summary>${sc.id} · ${esc(sc.title)}</summary>
<p>${esc(sc.description)}</p>
<dl>
<dt>How to paginate</dt><dd>${esc(sc.howTo)}</dd>
<dt>End of data</dt><dd>${esc(end ? `${end}: ${END_TEXT[end]}` : sc.endText)}</dd>
<dt>Records</dt><dd><code>${esc(sc.recordsText)}</code></dd>
</dl>
<p><a href="${ctx.root}/_answer">Answer key</a> · <a href="${PREFIX}/_log/${sc.id}${ctx.run ? `?run=${encodeURIComponent(ctx.run)}` : ''}">Request log</a> · <a href="${esc(addParams(entry, { ...ctx.sticky, bare: '1' }))}">Hide this panel (?bare=1)</a></p>
${variants}
</details>`
}

export function cards(ctx, recs) {
  return recs
    .map(
      (r) => `<li class="card" data-id="${r.id}">
<a href="${esc(ctx.link('/item/' + r.id))}"><h3 class="title">${esc(r.title)}</h3></a>
<p class="category">${esc(r.category)}</p>
<p class="price" data-price="${r.price}">₹${r.price}</p>
<p class="rating" data-rating="${r.rating}">★ ${r.rating.toFixed(1)}</p>
<time class="created" datetime="${r.createdAt}">${r.createdAt.slice(0, 10)}</time>
</li>`
    )
    .join('\n')
}
export const list = (ctx, recs) => `<ul id="records" class="cards">\n${cards(ctx, recs)}\n</ul>`

function pageWindow(i, pages) {
  if (pages <= 7) return range(pages)
  const keep = [...new Set([0, 1, i - 1, i, i + 1, pages - 2, pages - 1])].filter((p) => p >= 0 && p < pages).sort((a, b) => a - b)
  const out = []
  keep.forEach((p, k) => {
    if (k && p - keep[k - 1] > 1) out.push(null)
    out.push(p)
  })
  return out
}

export const nav = (inner) => `<nav class="pagination" aria-label="Pagination">${inner}</nav>`

/** `url(i)` → scenario-relative href of 0-based page i. */
export function navBar(ctx, i, pages, url, { next = true, prev = true } = {}) {
  const parts = []
  if (prev && i > 0) parts.push(`<a class="prev" rel="prev" href="${esc(ctx.link(url(i - 1)))}">‹ Previous</a>`)
  for (const p of pageWindow(i, pages)) {
    if (p === null) parts.push('<span class="ellipsis">…</span>')
    else if (p === i) parts.push(`<span class="page current" aria-current="page">${p + 1}</span>`)
    else parts.push(`<a class="page" href="${esc(ctx.link(url(p)))}">${p + 1}</a>`)
  }
  if (next && i < pages - 1) parts.push(`<a class="next" rel="next" href="${esc(ctx.link(url(i + 1)))}">Next ›</a>`)
  return nav(parts.join(' '))
}

export const navNext = (href) => (href ? nav(`<a class="next" rel="next" href="${esc(href)}">Next ›</a>`) : '')

export const notFound = (ctx, format = 'html') =>
  format === 'json'
    ? json({ error: 'not_found', message: 'No such page' }, 404)
    : html(page(ctx, { title: '404 Not Found', body: '<h1>404 — Page not found</h1><p>There is nothing at this address.</p>' }), 404)

export const badRequest = (message) => json({ error: 'bad_request', message }, 400)

/* ── paged(): the counter-style scenario factory ───────────────────── */

/**
 * def.url(i, ctx?)  → scenario-relative URL of 0-based page i
 * def.parse(ctx)    → page index | undefined (not this route) | a response (redirect, 400…)
 * Optional hooks: routes, intercept, recordsFor, respond, navHtml, before, head, headers, pageSize(ctx), totalFor(ctx).
 */
export function paged(def) {
  const o = { total: 47, pageSize: 10, nav: 'bar', end: 'H02', format: 'html', variants: true, client: 'http', ...def }
  return {
    ...o,
    entryPath: o.entryPath ?? o.url(0),
    handle(ctx) {
      const own = o.routes?.(ctx)
      if (own) return own
      const i = o.parse(ctx)
      if (i === undefined || isResponse(i)) return i
      if (!Number.isInteger(i) || i < 0) return badRequest('page out of range')
      const out = o.intercept?.(ctx, i) ?? servePaged(ctx, o, i)
      const delay = o.delayFor?.(ctx, i)
      return delay ? { ...out, delay } : out
    },
    answer: (A, variant) => pagedAnswer(o, A, variant),
  }
}

const effectiveTotal = (o, end, ctx) => {
  const t = (ctx && o.totalFor?.(ctx)) ?? o.total
  return end === 'H12' ? Math.ceil(t / o.pageSize) * o.pageSize : t
}

function servePaged(ctx, o, i) {
  const end = (o.variants && ctx.variant) || o.end
  const ps = o.pageSizeFor?.(ctx) ?? o.pageSize
  if (isResponse(ps)) return ps
  const total = effectiveTotal(o, end, ctx)
  const pages = Math.ceil(total / ps)
  const recsFor = (p) => (o.recordsFor ? o.recordsFor(ctx, p * ps, ps, total) : records(ctx.sc.id, p * ps, ps, total))
  const render = (p, recs, extra = {}) =>
    (o.respond ?? respondHtml)(ctx, { o, i: p, pages, total, ps, recs, end, url: (k) => o.url(k, ctx), ...extra })
  if (i < pages) return render(i, recsFor(i))
  switch (end) {
    case 'H01': case 'H10': case 'H11': return notFound(ctx, o.format)
    case 'H03': return res(200, '', { 'Content-Type': o.format === 'json' ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8' })
    case 'H04': return render(pages - 1, recsFor(pages - 1))
    case 'H05': return render(0, recsFor(0))
    case 'H06': return redirect(ctx.link(o.url(0, ctx)), 302)
    case 'H07': return o.format === 'json' ? json({ error: 'gone' }, 410) : html(page(ctx, { title: '410 Gone', body: '<h1>410 — Gone</h1><p>This page no longer exists.</p>' }), 410)
    case 'H08': return json({ error: 'page_out_of_range', message: `Page ${i + 1} is out of range (1–${pages})`, maxPage: pages }, 400)
    case 'H09': return render(i, [], { noResults: true })
    default: return render(i, []) // H02, H12
  }
}

export function respondHtml(ctx, p) {
  const { o, i, pages, recs, end, url, noResults } = p
  let navigation = ''
  if (recs.length) {
    if (o.navHtml) navigation = o.navHtml(ctx, p)
    else if (o.nav === 'bar') navigation = navBar(ctx, i, pages, url)
    else if (o.nav === 'next') navigation = navNext(i < pages - 1 ? ctx.link(url(i + 1)) : null)
  }
  const announce = end === 'H10' || o.announce
  return html(
    page(ctx, {
      title: `${ctx.sc.title} — page ${i + 1}`,
      head: o.head?.(ctx, p) ?? '',
      body: `<h1>${esc(o.heading ?? ctx.sc.title)}</h1>
${announce ? `<p class="page-info">Page ${i + 1} of ${pages}</p>\n` : ''}${o.before?.(ctx, p) ?? ''}${list(ctx, recs)}
${noResults ? '<p class="no-results">No results found.</p>\n' : ''}${navigation}${o.after?.(ctx, p) ?? ''}`,
      script: o.script ?? '',
    }),
    200,
    o.headers?.(ctx, p) ?? {}
  )
}

const PROBE_STATUS = { H01: 404, H10: 404, H11: 404, H06: 302, H07: 410, H08: 400 }

function pagedAnswer(o, A, variant) {
  const end = (o.variants && variant) || o.end
  const total = effectiveTotal(o, end)
  const ps = o.pageSize
  const pages = Math.ceil(total / ps)
  const url = o.answerUrl ?? o.url
  const expected = range(pages).flatMap((i) => (o.answerHops ? o.answerHops(i).map(A.abs) : [A.abs(url(i))]))
  // With no links to follow and a full last page, the only way to see the end is to ask for the next page.
  if (o.nav === 'none' && total % ps === 0) expected.push(A.abs(url(pages)))
  return {
    totalRecords: total,
    pageSize: ps,
    entryUrl: A.abs(o.entryPath ?? url(0)),
    expectedRequests: expected,
    mustNotRequest: [A.abs(url(Math.max(pages * 2, pages + 4)))],
    endProbe: {
      request: A.abs(url(pages)),
      expectStatus: PROBE_STATUS[end] ?? 200,
      expectRecords: ['H04', 'H05', 'H06'].includes(end) ? 'repeat' : 'none',
    },
    expectedRecordIds: allIds(total),
    end,
  }
}
