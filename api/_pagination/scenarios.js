/*
 * Pagination Playground — the catalogue. One entry per scenario; the home
 * page, /_scenarios, answer keys, docs and tests are all derived from it.
 *
 * Every scenario has: id, category, title, description, howTo, handle(ctx)
 * and answer(A, variant). Most are built with paged() from core.js.
 */
import {
  END_TEXT, H_CODES, addParams, allIds, badRequest, cards, createdAt, esc, hash32, html, isResponse, json,
  list, nav, navBar, navNext, notFound, page, paged, range, recordId, recordNumber, record, records, redirect,
  respondHtml, rng, text,
} from './core.js'

export const CATEGORIES = [
  ['url-parameter', 'A. URL parameter pagination'],
  ['path', 'B. Path-based pagination'],
  ['link-following', 'C. Link-following pagination'],
  ['cursor', 'D. Cursor / token pagination'],
  ['api', 'E. API / request-body pagination'],
  ['client-side', 'F. Client-side (JavaScript) pagination'],
  ['feeds', 'G. Feeds and other formats'],
  ['end-of-data', 'H. End-of-data behaviours'],
  ['faults', 'I. Faults, robustness and politeness'],
  ['combined', 'J. Combined, real-world scenarios'],
]

const HTML_REC = 'li.card[data-id] → .title, .category, .price[data-price], .rating[data-rating], time.created[datetime], a[href] (detail page)'
const jsonRec = (path, id = 'id') => `JSON ${path} → ${id}, title, category, price, rating, createdAt, url`

/* ── parsing helpers: each returns a 0-based page index, undefined (not this route) or a response ── */

const DIGITS = /^\d{1,7}$/

function pageNum(ctx, name, { first = 1, re = DIGITS } = {}) {
  const v = ctx.query.get(name)
  if (v === null) return 0
  if (!re.test(v)) return badRequest(`${name} must be a number`)
  const n = Number(v) - first
  return n < 0 ? badRequest(`${name} is out of range`) : n
}

function offsetNum(ctx, name, step = 10) {
  const v = ctx.query.get(name)
  if (v === null) return 0
  if (!DIGITS.test(v)) return badRequest(`${name} must be a number`)
  if (Number(v) % step) return badRequest(`${name} must be a multiple of ${step}`)
  return Number(v) / step
}

const onPath = (path, fn) => (ctx) => (ctx.path === path ? fn(ctx) : undefined)
const pathNum = (re) => (ctx) => {
  const m = ctx.path.match(re)
  return m ? Number(m[1]) - 1 : undefined
}
const firstResponse = (...vals) => vals.find(isResponse)

const shell = (ctx, { title, body, script = '' }) => html(page(ctx, { title, body, script }))

/** JSON page used by the client-side scenarios' XHR endpoints. */
function dataPage(ctx, path, total = 47, ps = 10) {
  const i = pageNum(ctx, 'page')
  if (isResponse(i)) return i
  const pages = Math.ceil(total / ps)
  return json({
    items: records(ctx.sc.id, i * ps, ps, total),
    page: i + 1,
    totalPages: pages,
    next: i + 1 < pages ? ctx.link(`${path}?page=${i + 2}`) : null,
  })
}

/* ── shapes shared by every category's "page 6 is 404" and never-ending scenarios ── */

const pageQuery = (path) => ({ url: (i) => `${path}?page=${i + 1}`, parse: onPath(path, (c) => pageNum(c, 'page')) })
/** 47 records, 5 pages; page 6 and beyond are a real 404 Not Found. */
const past404 = (def) => paged({ variants: false, end: 'H01', ...def })

const ENDLESS_TEXT = 'Never ends: every page has records and a way to the next one. Stop at your own page cap (100 pages at most).'
const endlessAnswer = (A, url, prefix = []) => ({
  totalRecords: null, endProbe: null, expectedRecordIds: null, expectedRecordCount: null,
  expectedRequests: [...prefix, ...range(5).map((i) => A.abs(url(i)))],
  mustNotRequest: [A.abs(url(100))],
  expectedBehaviour: 'The data never runs out. Collect at least 5 pages, then stop at a page cap of 100 or fewer.',
})
/** Every page has records and a next page, however far you go. */
const endless = (def) => ({
  ...paged({ variants: false, ...def, total: Infinity, end: null, extra: 95, endText: def.endText ?? ENDLESS_TEXT }),
  answer: (A) => endlessAnswer(A, def.url),
})

const S = []
const add = (sc) => S.push(sc)

/* ═════════ A. URL parameter pagination ═════════ */

const A = (id, title, description, howTo, url, parse, pagination, extra = {}) =>
  add(paged({ id, category: 'url-parameter', title, description, howTo, url, parse, pagination, kind: pagination.kind, ...extra }))

A('A01', 'Page number query param', 'A server-rendered listing paginated with ?page=N, starting at 1.',
  'Request /list?page=1 and increment page by 1. The pagination bar links the same URLs.',
  (i) => `/list?page=${i + 1}`, onPath('/list', (c) => pageNum(c, 'page')),
  { kind: 'page-query', param: 'page', firstValue: 1, step: 1 })

A('A02', 'Offset query param', 'The counter is a record offset, not a page number.',
  'Request /list?start=0 and add the page size (10) each time.',
  (i) => `/list?start=${i * 10}`, onPath('/list', (c) => offsetNum(c, 'start')),
  { kind: 'offset-query', param: 'start', firstValue: 0, step: 10 })

const limitOf = (c) => {
  const v = c.query.get('limit')
  if (v === null) return 10
  return DIGITS.test(v) && Number(v) > 0 ? Number(v) : badRequest('limit must be a positive number')
}
const offsetOf = (c) => Number(c.query.get('offset') ?? 0)
A('A03', 'Offset + limit', 'Offset and limit travel together. Any limit works (default 10); the bar keeps the limit you asked for.',
  'Request /list?offset=0&limit=10 and add limit to offset each time, keeping limit.',
  (i, c) => {
    const limit = c && !isResponse(limitOf(c)) ? limitOf(c) : 10
    // Links step by limit from the requested offset, so offset=10&limit=20 goes on to 30, not 20.
    // ponytail: for an unaligned offset the bar's page 1 is that offset, not 0.
    const shift = c ? offsetOf(c) % limit : 0
    return `/list?offset=${shift + i * limit}&limit=${limit}`
  },
  onPath('/list', (c) => {
    const limit = limitOf(c)
    if (isResponse(limit)) return limit
    const v = c.query.get('offset')
    if (v !== null && !DIGITS.test(v)) return badRequest('offset must be a number')
    return Math.floor(offsetOf(c) / limit)
  }),
  { kind: 'offset-limit-query', param: 'offset', firstValue: 0, step: 10, sizeParam: 'limit', defaultLimit: 10 },
  {
    pageSizeFor: limitOf,
    // Serve from the exact offset asked for, not the page boundary below it (H04/H05 re-serve other pages).
    recordsFor: (c, from, ps, total) => records(c.sc.id, Math.floor(offsetOf(c) / ps) * ps === from ? offsetOf(c) : from, ps, total),
  })

A('A04', 'Counter among other params', 'The page counter sits between other parameters; a correct scraper keeps their order.',
  'Request /search?q=shoes&page=1&sort=price and change only page, leaving q and sort where they are.',
  (i) => `/search?q=shoes&page=${i + 1}&sort=price`,
  onPath('/search', (c) => (c.query.get('q') ? pageNum(c, 'page') : badRequest('missing q'))),
  { kind: 'page-query', param: 'page', firstValue: 1, step: 1, preserveOrder: true })

A('A05', 'First page has no param', 'Page 1 is the bare search URL; ?page= only appears from page 2.',
  'Start at /search?q=shoes, then /search?q=shoes&page=2, &page=3 …',
  (i) => (i === 0 ? '/search?q=shoes' : `/search?q=shoes&page=${i + 1}`),
  onPath('/search', (c) => (c.query.get('q') ? pageNum(c, 'page') : badRequest('missing q'))),
  { kind: 'page-query', param: 'page', firstValue: 2, step: 1, firstPageUnnumbered: true })

A('A06', 'Bracket / nested param names', 'JSON:API-style bracketed names: page[number] and page[size].',
  'Request /list?page[number]=1&page[size]=10 and increment page[number].',
  (i) => `/list?page[number]=${i + 1}&page[size]=10`,
  onPath('/list', (c) => {
    const size = c.query.get('page[size]')
    if (size !== null && size !== '10') return badRequest('page[size] is fixed at 10')
    return pageNum(c, 'page[number]')
  }),
  { kind: 'page-query', param: 'page[number]', firstValue: 1, step: 1 })

A('A07', 'Dotted / prefixed param names', 'The counter is called filter.page (p_page is also accepted).',
  'Request /list?filter.page=1 and increment filter.page.',
  (i) => `/list?filter.page=${i + 1}`,
  onPath('/list', (c) => (c.query.has('p_page') && !c.query.has('filter.page') ? pageNum(c, 'p_page') : pageNum(c, 'filter.page'))),
  { kind: 'page-query', param: 'filter.page', firstValue: 1, step: 1, aliases: ['p_page'] })

A('A08', 'Two counters together', 'page and offset must move together; a mismatch is a 400.',
  'Request /list?page=1&offset=0; each step adds 1 to page and 10 to offset.',
  (i) => `/list?page=${i + 1}&offset=${i * 10}`,
  onPath('/list', (c) => {
    const p = pageNum(c, 'page')
    const o = offsetNum(c, 'offset')
    return firstResponse(p, o) ?? (p === o ? p : badRequest('page and offset disagree'))
  }),
  { kind: 'multi-counter', params: { page: { firstValue: 1, step: 1 }, offset: { firstValue: 0, step: 10 } } })

A('A09', 'Range window', 'A from/to window that slides by the page size.',
  'Request /list?from=0&to=10, then from=10&to=20 …',
  (i) => `/list?from=${i * 10}&to=${i * 10 + 10}`,
  onPath('/list', (c) => {
    const f = offsetNum(c, 'from')
    if (isResponse(f)) return f
    const to = c.query.get('to')
    return to === null || to === String(f * 10 + 10) ? f : badRequest('to must be from + 10')
  }),
  { kind: 'range-query', params: { from: { firstValue: 0, step: 10 }, to: { firstValue: 10, step: 10 } } })

A('A10', 'Zero-based page index', 'The first page is page=0.',
  'Request /list?page=0 and increment page.',
  (i) => `/list?page=${i}`, onPath('/list', (c) => pageNum(c, 'page', { first: 0 })),
  { kind: 'page-query', param: 'page', firstValue: 0, step: 1 })

A('A11', 'Zero-padded page numbers', 'Page numbers are always three digits; ?page=2 is a 404.',
  'Request /list?page=001, then 002, 003 … keeping the padding.',
  (i) => `/list?page=${String(i + 1).padStart(3, '0')}`,
  onPath('/list', (c) => {
    const v = c.query.get('page')
    return v !== null && !/^\d{3}$/.test(v) ? notFound(c) : pageNum(c, 'page')
  }),
  { kind: 'page-query', param: 'page', firstValue: '001', step: 1, zeroPadded: 3 })

A('A12', 'Case / format variations', 'The counter is the case-sensitive Page. Lowercase page is ignored (you get page 1 again). pg, p, pageNum and pageNo also work.',
  'Request /list?Page=1 and increment Page. Do not lowercase the name.',
  (i) => `/list?Page=${i + 1}`,
  onPath('/list', (c) => {
    for (const name of ['Page', 'pg', 'p', 'pageNum', 'pageNo']) if (c.query.has(name)) return pageNum(c, name)
    return 0
  }),
  { kind: 'page-query', param: 'Page', firstValue: 1, step: 1, aliases: ['pg', 'p', 'pageNum', 'pageNo'], caseSensitive: true })

A('A13', 'Semicolon / matrix params', 'The counter is a matrix parameter inside the path: /list;page=2.',
  'Request /list;page=1 and increment the matrix param.',
  (i) => `/list;page=${i + 1}`,
  (c) => {
    const m = c.path.match(/^\/list(?:;page=(\d{1,7}))?$/)
    return m ? (m[1] ? Number(m[1]) - 1 : 0) : undefined
  },
  { kind: 'matrix-param', param: 'page', firstValue: 1, step: 1 })

add(past404({
  id: 'A15', category: 'url-parameter', title: 'Page 6 returns 404', kind: 'page-query', ...pageQuery('/list'),
  description: 'A ?page=N listing with 5 pages. Typing ?page=6 (or higher) into the address bar gets a real 404 Not Found document.',
  howTo: 'Request /list?page=1 and increment page until the response is 404.',
  pagination: { param: 'page', firstValue: 1, step: 1 },
}))

add(endless({
  id: 'A16', category: 'url-parameter', title: 'Never-ending ?page=', kind: 'page-query-endless', ...pageQuery('/list'),
  description: 'Every ?page=N returns 10 records and a Next link, however high N goes. There is no last page.',
  howTo: 'Request /list?page=1 and increment page, but stop at your own page cap.',
  pagination: { param: 'page', firstValue: 1, step: 1, endless: true },
}))

function hashAppScript(dataPath, parseExpr, linkExpr) {
  return `
const list = document.getElementById('records');
const navEl = document.querySelector('nav.pagination');
const current = () => { ${parseExpr} };
const link = (k) => ${linkExpr};
async function render() {
  const p = current();
  const d = await getJSON(u('${dataPath}?page=' + p));
  list.innerHTML = d.items.map(card).join('');
  let h = '';
  for (let k = 1; k <= d.totalPages; k++) h += k === p ? '<span class="page current" aria-current="page">' + k + '</span> ' : '<a class="page" href="' + link(k) + '">' + k + '</a> ';
  if (p < d.totalPages) h += '<a class="next" rel="next" href="' + link(p + 1) + '">Next \\u203a</a>';
  navEl.innerHTML = h;
}
addEventListener('hashchange', render);
render();`
}

const spaBody = (title) => `<h1>${esc(title)}</h1>\n<ul id="records" class="cards"></ul>\n<nav class="pagination" aria-label="Pagination"></nav>\n<noscript>This page needs JavaScript.</noscript>`

add({
  id: 'A14', category: 'url-parameter', client: 'browser', total: 47, kind: 'fragment-param',
  title: 'Params in the fragment (SPA)',
  description: 'A JavaScript app keeps the page number in the URL fragment (#page=2 or #/list/2). The fragment is never sent to the server.',
  howTo: 'Open /app#page=1 in a browser and click the pager, or call the data endpoint /data?page=N directly.',
  endText: 'The pager has no Next link on page 5; /data?page=6 returns an empty items array.',
  recordsText: `${HTML_REC} (rendered by JavaScript); XHR: ${jsonRec('items[]')}`,
  pagination: { param: 'page', inFragment: true, formats: ['#page=N', '#/list/N'], xhr: '/data?page=N' },
  entryPath: '/app#page=1',
  handle(ctx) {
    if (ctx.path === '/app')
      return shell(ctx, {
        title: 'Fragment-routed list', body: spaBody('Fragment-routed list'),
        script: hashAppScript('/data', `const m = location.hash.match(/^#page=(\\d+)$/) || location.hash.match(/^#\\/list\\/(\\d+)$/); return m ? Math.max(1, +m[1]) : 1;`, `'#page=' + k`),
      })
    if (ctx.path === '/data') return dataPage(ctx, '/data')
  },
  answer: (A) => ({
    expectedRequests: [A.abs('/app'), ...range(5).map((i) => A.abs(`/data?page=${i + 1}`))],
    uiActions: [{ action: 'open', url: A.abs('/app#page=1') }, { action: 'click', selector: 'nav.pagination a.next', times: 4 }],
  }),
})

/* ═════════ B. Path-based pagination ═════════ */

const B = (id, title, description, howTo, url, parse, pagination, extra = {}) =>
  add(paged({ id, category: 'path', title, description, howTo, url, parse, pagination, kind: pagination.kind, ...extra }))

B('B01', 'Last path segment', 'The page number is the last path segment.',
  'Request /listing/1, /listing/2 …', (i) => `/listing/${i + 1}`, pathNum(/^\/listing\/(\d{1,7})$/),
  { kind: 'path-segment', position: 'last', firstValue: 1, step: 1 })

B('B02', '"page" keyword segment (WordPress)', 'Page 1 is /blog/; later pages are /blog/page/N/. /blog/page/1/ and slash-less URLs redirect (301).',
  'Start at /blog/, then /blog/page/2/, /blog/page/3/ … with the trailing slash.',
  (i) => (i === 0 ? '/blog/' : `/blog/page/${i + 1}/`),
  (c) => {
    if (c.path === '/blog') return redirect(c.link('/blog/'), 301)
    if (c.path === '/blog/') return 0
    const m = c.path.match(/^\/blog\/page\/(\d{1,7})(\/?)$/)
    if (!m) return undefined
    const n = Number(m[1])
    if (n === 1) return redirect(c.link('/blog/'), 301)
    if (!m[2]) return redirect(c.link(`/blog/page/${n}/`), 301)
    return n - 1
  },
  { kind: 'path-keyword', keyword: 'page', firstValue: 2, step: 1, firstPageUnnumbered: true, trailingSlash: true })

B('B03', 'Middle segment', 'The counter sits in the middle of the path: /listing/2/jobs.',
  'Request /listing/1/jobs, /listing/2/jobs …', (i) => `/listing/${i + 1}/jobs`, pathNum(/^\/listing\/(\d{1,7})\/jobs$/),
  { kind: 'path-segment', position: 'middle', firstValue: 1, step: 1 })

B('B04', 'Other numbers in the path', 'Category 17 is not the counter; only the number after /page/ is. Other categories are 404.',
  'Request /c/17/page/1 and increment only the last number.',
  (i) => `/c/17/page/${i + 1}`,
  (c) => {
    const m = c.path.match(/^\/c\/(\d{1,7})\/page\/(\d{1,7})$/)
    if (!m) return undefined
    return m[1] === '17' ? Number(m[2]) - 1 : notFound(c)
  },
  { kind: 'path-keyword', keyword: 'page', firstValue: 1, step: 1, distractors: ['17'] })

B('B05', 'First page unnumbered', 'Page 1 is /catalog; page 2 is /catalog/2. /catalog/1 redirects to /catalog.',
  'Start at /catalog, then /catalog/2 …',
  (i) => (i === 0 ? '/catalog' : `/catalog/${i + 1}`),
  (c) => {
    if (c.path === '/catalog') return 0
    const m = c.path.match(/^\/catalog\/(\d{1,7})$/)
    if (!m) return undefined
    return m[1] === '1' ? redirect(c.link('/catalog'), 301) : Number(m[1]) - 1
  },
  { kind: 'path-segment', firstValue: 2, step: 1, firstPageUnnumbered: true })

B('B06', 'Number in the file name', 'Pages are static-looking files: /jobs/2.html.',
  'Request /jobs/1.html, /jobs/2.html …', (i) => `/jobs/${i + 1}.html`, pathNum(/^\/jobs\/(\d{1,7})\.html$/),
  { kind: 'file-name', template: '/jobs/{n}.html', firstValue: 1, step: 1 })

B('B07', 'index.html → index_2.html', 'The first page is index.html; later ones are index_N.html.',
  'Start at /index.html, then /index_2.html …',
  (i) => (i === 0 ? '/index.html' : `/index_${i + 1}.html`),
  (c) => {
    if (c.path === '/index.html') return 0
    const m = c.path.match(/^\/index_(\d{1,7})\.html$/)
    if (!m) return undefined
    return m[1] === '1' ? redirect(c.link('/index.html'), 301) : Number(m[1]) - 1
  },
  { kind: 'file-name', template: '/index_{n}.html', firstValue: 2, step: 1, firstPageUnnumbered: true })

B('B08', 'Zero-padded file names', 'File names are padded to three digits; /jobs/2.html is a 404.',
  'Request /jobs/001.html, /jobs/002.html …',
  (i) => `/jobs/${String(i + 1).padStart(3, '0')}.html`,
  (c) => {
    if (/^\/jobs\/\d{3}\.html$/.test(c.path)) return Number(c.path.slice(6, 9)) - 1
    return /^\/jobs\/\d+\.html$/.test(c.path) ? notFound(c) : undefined
  },
  { kind: 'file-name', template: '/jobs/{nnn}.html', firstValue: '001', step: 1, zeroPadded: 3 })

B('B09', 'Path + query together', 'Both the path segment and ?start= carry the position, and they must agree.',
  'Request /listing/1?start=0, /listing/2?start=10 …',
  (i) => `/listing/${i + 1}?start=${i * 10}`,
  (c) => {
    const m = c.path.match(/^\/listing\/(\d{1,7})$/)
    if (!m) return undefined
    const s = offsetNum(c, 'start')
    if (isResponse(s)) return s
    const i = Number(m[1]) - 1
    return !c.query.has('start') || s === i ? i : badRequest('path page and start disagree')
  },
  { kind: 'path-and-query', params: { path: { firstValue: 1, step: 1 }, start: { firstValue: 0, step: 10 } } })

B('B10', 'Trailing slash significance', '/page/2/ is the page; /page/2 answers with a 301 to the slash version.',
  'Request /page/1/, /page/2/ … with the trailing slash.',
  (i) => `/page/${i + 1}/`,
  (c) => {
    const m = c.path.match(/^\/page\/(\d{1,7})(\/?)$/)
    if (!m) return undefined
    return m[2] ? Number(m[1]) - 1 : redirect(c.link(`/page/${m[1]}/`), 301)
  },
  { kind: 'path-segment', firstValue: 1, step: 1, trailingSlash: true })

const WORDS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty']
B('B11', 'Slug-based pages', 'Pages are named, not numbered (/archive/page-two). There is nothing to increment; follow the Next link.',
  'Start at /archive/page-one and follow a.next until it disappears.',
  (i) => `/archive/page-${WORDS[i] ?? i + 1}`,
  (c) => {
    const m = c.path.match(/^\/archive\/page-([a-z0-9]{1,12})$/)
    if (!m) return undefined
    const k = WORDS.indexOf(m[1])
    return k >= 0 ? k : /^\d+$/.test(m[1]) ? Number(m[1]) - 1 : notFound(c)
  },
  { kind: 'slug-path', followLinks: true }, { nav: 'next', end: 'H01' })

const listingPath = { url: (i) => `/listing/${i + 1}`, parse: pathNum(/^\/listing\/(\d{1,7})$/) }
add(past404({
  id: 'B12', category: 'path', title: 'Path page 6 returns 404', kind: 'path-segment', ...listingPath,
  description: 'Pages are /listing/1 … /listing/5. Typing /listing/6 (or higher) gets a real 404 Not Found document.',
  howTo: 'Request /listing/1, /listing/2 … until the response is 404.',
  pagination: { position: 'last', firstValue: 1, step: 1 },
}))

add(endless({
  id: 'B13', category: 'path', title: 'Never-ending path pages', kind: 'path-segment-endless', ...listingPath,
  description: 'Every /listing/N returns 10 records and a Next link, however high N goes.',
  howTo: 'Request /listing/1, /listing/2 …, but stop at your own page cap.',
  pagination: { position: 'last', firstValue: 1, step: 1, endless: true },
}))

/*
 * B14: the type number picks the end behaviour, by T % 3, so no type matches two rules:
 *   0 (3, 6, 9 …)  5 pages, then 404        1 (1, 4, 7 …)  5 pages, then 200 with no records
 *   2 (2, 5, 8 …)  pages never end
 * Record k of type T is p-T00000k (T × 1,000,000 + k), unique across every type.
 */
const TPE_MAX_TYPE = 999
const TPE_MAX_PAGE = 99_999 // keeps ids under 10 digits; effectively endless
const TPE_RULE = ['404 after page 5', 'empty 200 page after page 5', 'never ends']
const TPE_RULES = { 'T%3=0': '404 after page 5', 'T%3=1': 'empty 200 after page 5', 'T%3=2': 'endless' }
const tpeRecords = (sc, t, i, total) => records(sc, i * 10, 10, total).map((r, k) => {
  const n = t * 1_000_000 + i * 10 + k + 1
  return { ...record(sc, n), id: recordId(n), url: r.url.replace(r.id, recordId(n)) }
})
/** url(T, i) → scenario URL of type T, 0-based page i; typeOf(ctx) → T | undefined (not this route) | a response. */
const typedPages = ({ url, typeOf, typeText, ...def }) => add({
  kind: 'type-and-page', total: Infinity, extra: 200,
  description: `Types ${typeText} 1, 2 … (up to 999), each with its own page=N. The type number decides how it ends: T divisible by 3 has 5 pages, then 404; T % 3 = 1 has 5 pages, then a 200 page with no records; T % 3 = 2 never ends.`,
  howTo: `For each type T, request ${url('T', 0)} and increment page until 404, an empty page, or your page cap. Then move to type T+1 until your type cap. Type 1000 and above are 404.`,
  endText: 'Per type: T % 3 = 0 → 404 after page 5; T % 3 = 1 → empty 200 after page 5; T % 3 = 2 → endless.', recordsText: HTML_REC,
  entryPath: url(1, 0),
  ...def,
  handle(ctx) {
    const t = typeOf(ctx)
    if (t === undefined || isResponse(t)) return t
    const i = pageNum(ctx, 'page')
    if (isResponse(i)) return i
    if (t < 1) return notFound(ctx)
    if (i >= TPE_MAX_PAGE) return badRequest(`page must be at most ${TPE_MAX_PAGE}`)
    const rule = t % 3
    if (rule === 0 && i >= 5) return notFound(ctx)
    const pages = rule === 2 ? Infinity : 5
    const recs = i < pages ? tpeRecords(ctx.sc.id, t, i, rule === 2 ? Infinity : 47) : []
    const types = nav('Types: ' + [...range(9).map((k) => k + 1), ...(t > 9 ? [t] : []), ...(t + 1 > 9 && t < TPE_MAX_TYPE ? [t + 1] : [])].map((k) =>
      k === t ? `<span class="type current" aria-current="true">${k}</span>` : `<a class="type" href="${esc(ctx.link(url(k, 0)))}">${k}</a>`).join(' '))
    return html(page(ctx, {
      title: `Type ${t} — page ${i + 1}`,
      body: `<h1>Type ${t} — page ${i + 1}</h1>\n<p class="page-info">Type ${t} (T % 3 = ${rule}): ${TPE_RULE[rule]}</p>\n${types}\n${list(ctx, recs)}\n${recs.length ? navBar(ctx, i, pages, (k) => url(t, k)) : ''}`,
    }))
  },
  answer: (A) => ({
    totalRecords: null, expectedRecordIds: null, expectedRecordCount: null,
    expectedRequests: [1, 2, 3].flatMap((t) => range(5).map((i) => A.abs(url(t, i)))),
    endProbe: { request: A.abs(url(3, 5)), expectStatus: 404, expectRecords: 'none' },
    mustNotRequest: [A.abs(url(2, 100)), A.abs(url(1, 6))],
    expectedBehaviour: 'Types 1–3 cover all three rules: type 1 ends with an empty 200 page 6, type 2 never ends, type 3 is 404 on page 6. Stop each endless type at a page cap (100 at most) and stop types at your own type cap. Never ask for page 7 of a type that already returned an empty page 6.',
  }),
})

typedPages({
  id: 'B14', category: 'path', title: 'Two-level pagination: /tpe/T?page=P, behaviour by type', typeText: '/tpe/T,',
  url: (t, i) => `/tpe/${t}?page=${i + 1}`,
  typeOf: (c) => {
    const m = c.path.match(/^\/tpe\/(\d{1,3})$/)
    return m ? Number(m[1]) : /^\/tpe\/\d+$/.test(c.path) ? notFound(c) : undefined
  },
  pagination: { type: { path: '/tpe/{T}', firstValue: 1, max: TPE_MAX_TYPE }, page: { param: 'page', firstValue: 1 }, rules: TPE_RULES },
})

typedPages({
  id: 'A17', category: 'url-parameter', title: 'Type and page both as query params: /list?type=T&page=P', typeText: '?type=T,',
  url: (t, i) => `/list?type=${t}&page=${i + 1}`,
  typeOf: onPath('/list', (c) => {
    const v = c.query.get('type')
    if (v === null) return 1
    return /^\d{1,3}$/.test(v) ? Number(v) : /^\d+$/.test(v) ? notFound(c) : badRequest('type must be a number')
  }),
  pagination: { type: { param: 'type', firstValue: 1, max: TPE_MAX_TYPE }, page: { param: 'page', firstValue: 1 }, rules: TPE_RULES },
})

/* ═════════ C. Link-following pagination ═════════ */

const C = (id, title, description, howTo, extra) =>
  add(paged({ id, category: 'link-following', title, description, howTo, url: (i) => `/list?page=${i + 1}`, parse: onPath('/list', (c) => pageNum(c, 'page')), kind: 'next-link', ...extra }))

C('C01', '"Next ›" link', 'Each page has a single <a class="next"> link. It is absent on the last page.',
  'Start at /articles?page=1 and follow a.next until there is none.',
  { url: (i) => `/articles?page=${i + 1}`, parse: onPath('/articles', (c) => pageNum(c, 'page')), nav: 'next', end: 'H01', pagination: { selector: 'a.next' } })

C('C02', 'Numbered pagination bar', 'A full bar (1 2 3 … 12 Next) with an ellipsis and a styled current page. 115 records, so 12 pages.',
  'Follow a.next, or collect every a.page link, until the bar has no Next.',
  { total: 115, pagination: { selector: 'nav.pagination a.page, nav.pagination a.next', current: '.current[aria-current=page]' } })

C('C03', 'rel="next" in <link> and <a>', 'No visible pager. The next page is announced in <head> with <link rel="next"> and in the body with <a rel="next">.',
  'Follow link[rel=next] (head) or a[rel=next] (body).',
  {
    nav: 'custom', pagination: { selector: 'link[rel=next], a[rel=next]' },
    head: (c, { i, pages, url }) =>
      (i > 0 ? `<link rel="prev" href="${esc(c.base + c.link(url(i - 1)))}">\n` : '') + (i < pages - 1 ? `<link rel="next" href="${esc(c.base + c.link(url(i + 1)))}">\n` : ''),
    navHtml: (c, { i, pages, url }) => (i < pages - 1 ? `<p class="more"><a rel="next" href="${esc(c.link(url(i + 1)))}">More results</a></p>` : ''),
  })

const linkHeader = (c, { i, pages, url }) => {
  const rel = (k, name) => `<${c.base}${c.link(url(k))}>; rel="${name}"`
  const out = []
  if (i < pages - 1) out.push(rel(i + 1, 'next'))
  out.push(rel(pages - 1, 'last'), rel(0, 'first'))
  if (i > 0 && i < pages) out.push(rel(i - 1, 'prev'))
  return out.join(', ')
}
C('C04', 'HTTP Link header (GitHub style)', 'A JSON array API. The next page is only in the Link response header.',
  'Request /api/items?page=1&per_page=10 and follow rel="next" in the Link header until it is missing.',
  {
    format: 'json', nav: 'none', url: (i) => `/api/items?page=${i + 1}&per_page=10`, kind: 'link-header',
    parse: onPath('/api/items', (c) => (c.query.get('per_page') && c.query.get('per_page') !== '10' ? badRequest('per_page is fixed at 10') : pageNum(c, 'page'))),
    respond: (c, p) => json(p.recs, 200, { Link: linkHeader(c, p) }),
    recordsText: jsonRec('[] (array root)'), pagination: { header: 'Link', rel: 'next' },
  })

C('C05', 'Next link disabled instead of removed', 'On the last page the Next link stays, as <a class="next disabled" href="#">.',
  'Follow a.next, but stop when it has the disabled class or href="#".',
  {
    nav: 'custom', pagination: { selector: 'a.next:not(.disabled)', disabledMarker: 'a.next.disabled[href="#"]' },
    navHtml: (c, { i, pages, url }) =>
      nav(
        (i > 0 ? `<a class="prev" rel="prev" href="${esc(c.link(url(i - 1)))}">‹ Previous</a> ` : '<a class="prev disabled" href="#" aria-disabled="true">‹ Previous</a> ') +
          `<span class="page current" aria-current="page">${i + 1}</span> ` +
          (i < pages - 1 ? `<a class="next" rel="next" href="${esc(c.link(url(i + 1)))}">Next ›</a>` : '<a class="next disabled" href="#" aria-disabled="true">Next ›</a>')
      ),
  })

C('C06', 'Relative, protocol-relative and absolute next links', 'Each page writes its Next href differently: "2", "../list/3", "//host/…/list/4", then "https://host/…/list/5".',
  'Follow a.next and resolve each href against the current page URL.',
  {
    url: (i) => `/list/${i + 1}`, parse: pathNum(/^\/list\/(\d{1,7})$/), nav: 'custom', pagination: { selector: 'a.next', hrefForms: ['relative', 'dot-dot', 'protocol-relative', 'absolute'] },
    navHtml: (c, { i, pages }) => {
      if (i >= pages - 1) return ''
      const n = i + 2
      const forms = [`${n}`, `../list/${n}`, `//${c.host}${c.root}/list/${n}`, `${c.base}${c.root}/list/${n}`]
      return navNext(addParams(forms[i % 4], c.sticky))
    },
  })

C('C07', 'Next link with tracking params', 'Next links carry utm_source and utm_medium. The server ignores them; the answer key accepts URLs with or without them.',
  'Follow a.next. Keeping or stripping the utm_* params are both correct.',
  {
    nav: 'custom', ignoreParams: ['utm_source', 'utm_medium'], pagination: { selector: 'a.next', ignorableParams: ['utm_source', 'utm_medium'] },
    navHtml: (c, { i, pages }) => navNext(i < pages - 1 ? c.link(`/list?page=${i + 2}&utm_source=newsletter&utm_medium=pager`) : null),
  })

C('C08', '"Previous" only on the last page', 'A normal bar, except the last page shows only "‹ Previous". A scraper that clicks the bar\'s last link will go backwards.',
  'Follow a.next; never treat the last link in the bar as "next".',
  {
    nav: 'custom', pagination: { selector: 'a.next' },
    navHtml: (c, { i, pages, url }) => (i === pages - 1 ? nav(`<a class="prev" rel="prev" href="${esc(c.link(url(i - 1)))}">‹ Previous</a>`) : navBar(c, i, pages, url)),
  })

C('C09', 'Next link to a different host', 'Page 3\'s Next link points to catalogue.example.com, a different host. The answer key treats it as out of scope, so the crawl ends after page 3.',
  'Follow a.next while it stays on the same host.',
  {
    nav: 'custom', variants: false, pagination: { selector: 'a.next', scope: 'same-host' },
    navHtml: (c, { i, pages, url }) =>
      navNext(i === 2 ? `https://catalogue.example.com${c.root}/list?page=4` : i < pages - 1 ? c.link(url(i + 1)) : null),
    answerPatch: (a, A) => ({
      ...a, expectedRequests: a.expectedRequests.slice(0, 3), expectedRecordIds: allIds(30), endProbe: null,
      mustNotRequest: [A.abs('/list?page=4')],
      expectedBehaviour: 'Stop at page 3: its Next link leaves the site (catalogue.example.com). Pages 4–5 exist on this host but are only linked from the other host.',
    }),
  })

add(past404({
  id: 'C10', category: 'link-following', title: 'Next link on the last page leads to a 404', kind: 'next-link', ...pageQuery('/articles'),
  description: 'Every page, the last one included, has a Next link. On page 5 it points to page 6, which is a real 404 Not Found.',
  howTo: 'Follow a.next from /articles?page=1 and stop when it leads to a 404.',
  nav: 'custom', pagination: { selector: 'a.next' },
  navHtml: (c, { i, url }) => navNext(c.link(url(i + 1))),
}))

add(endless({
  id: 'C11', category: 'link-following', title: 'Next link that never runs out', kind: 'next-link-endless', ...pageQuery('/articles'),
  description: 'Every page has records and an a.next link to the following page, forever.',
  howTo: 'Follow a.next from /articles?page=1, but stop at your own page cap.',
  nav: 'next', pagination: { selector: 'a.next', endless: true },
}))

/* ═════════ D. Cursor / token pagination ═════════ */

function cursorScenario(def) {
  const o = { total: 47, pageSize: 10, client: 'http', variants: false, category: 'cursor', ...def }
  const offsets = range(Math.ceil(o.total / o.pageSize)).map((k) => k * o.pageSize)
  const pathname = o.path.split('?')[0]
  const reqUrl = (tok) => (tok === null ? o.path : addParams(o.path, { [o.param]: tok }))
  return {
    ...o,
    entryPath: o.entryPath ?? o.path,
    handle(ctx) {
      if (ctx.path !== pathname) return o.routes?.(ctx)
      if (o.method && ctx.method !== o.method) return json({ error: 'method_not_allowed' }, 405, { Allow: o.method })
      const bad = o.check?.(ctx)
      if (bad) return bad
      const raw = ctx.query.get(o.param)
      let off = 0
      if (raw !== null) {
        off = o.decode(raw, ctx, offsets)
        if (isResponse(off)) return off
        if (off === undefined) return badRequest('invalid cursor')
      }
      const recs = records(ctx.sc.id, off, o.pageSize, o.total)
      const next = off + o.pageSize < o.total ? o.encode(off + o.pageSize) : null
      return o.respond(ctx, recs, next, (tok) => ctx.base + ctx.link(reqUrl(tok)))
    },
    answer: (A) => ({
      entryUrl: A.abs(o.entryPath ?? o.path),
      expectedRequests: [...(o.answerPrefix?.(A) ?? []), ...offsets.map((off) => A.abs(reqUrl(off === 0 ? null : o.encode(off))))],
      cursors: offsets.slice(1).map(o.encode),
    }),
  }
}

const opaque = (id, off) => 'c' + hash32(`${id}:cursor:${off}`).toString(36).padStart(7, '0')
const opaqueDecode = (id) => (raw, _ctx, offsets) => offsets.find((off) => opaque(id, off) === raw)
const b64url = (s) => Buffer.from(s).toString('base64url')

add(cursorScenario({
  id: 'D01', title: 'Opaque cursor in JSON', kind: 'cursor', path: '/items', param: 'cursor',
  description: 'Each response returns next_cursor, an opaque token. Send it back as ?cursor=.',
  howTo: 'GET /items, then GET /items?cursor=<next_cursor> until next_cursor is null.',
  endText: 'next_cursor is null on the last page.', recordsText: jsonRec('data[]'),
  pagination: { field: 'next_cursor', param: 'cursor' },
  encode: (off) => opaque('D01', off), decode: opaqueDecode('D01'),
  respond: (c, recs, next) => json({ data: recs, next_cursor: next }),
}))

add(cursorScenario({
  id: 'D02', title: 'Base64 cursor (decodable, still opaque)', kind: 'cursor', path: '/items', param: 'cursor',
  description: 'The cursor is base64url JSON such as {"offset":10}. You can decode it, but treat it as opaque. Offsets that are not on a page boundary are rejected.',
  howTo: 'GET /items, then GET /items?cursor=<cursor.next> until cursor.next is null.',
  endText: 'cursor.next is null on the last page.', recordsText: jsonRec('items[]'),
  pagination: { field: 'cursor.next', param: 'cursor', encoding: 'base64url(JSON)' },
  encode: (off) => b64url(JSON.stringify({ offset: off })),
  decode: (raw) => {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(raw)) return undefined
    try {
      const { offset } = JSON.parse(Buffer.from(raw, 'base64url').toString())
      return Number.isInteger(offset) && offset >= 0 && offset <= 47 && offset % 10 === 0 ? offset : undefined
    } catch { return undefined }
  },
  respond: (c, recs, next) => json({ items: recs, cursor: { next } }),
}))

add(cursorScenario({
  id: 'D03', title: 'after / before keyset', kind: 'keyset', path: '/items', param: 'after',
  description: 'Keyset pagination (Stripe style): pass the id of the last record you received as ?after=.',
  howTo: 'GET /items, then GET /items?after=<last id> while has_more is true.',
  endText: 'has_more is false on the last page.', recordsText: jsonRec('data[]'),
  pagination: { param: 'after', valueFrom: 'id of the last record', hasMore: 'has_more' },
  encode: (off) => recordId(off),
  decode: (raw) => {
    const n = recordNumber(raw)
    return n >= 1 && n <= 47 ? n : undefined
  },
  respond: (c, recs, next) => json({ object: 'list', data: recs, has_more: next !== null }),
}))

const EPOCH_MS = Date.UTC(2024, 0, 1)
add(cursorScenario({
  id: 'D04', title: 'Timestamp keyset', kind: 'keyset-timestamp', path: '/items', param: 'since',
  description: 'Records are ordered by createdAt. Pass the createdAt of the last record as ?since= (exclusive).',
  howTo: 'GET /items, then GET /items?since=<next_since> until next_since is null.',
  endText: 'next_since is null on the last page.', recordsText: jsonRec('data[]'),
  pagination: { param: 'since', valueFrom: 'createdAt of the last record (ISO 8601, exclusive)' },
  encode: (off) => createdAt(off),
  decode: (raw) => {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(raw) || Number.isNaN(Date.parse(raw))) return undefined
    return Math.min(47, Math.max(0, Math.floor((Date.parse(raw) - EPOCH_MS) / 3600_000) + 1))
  },
  respond: (c, recs, next) => json({ data: recs, next_since: next }),
}))

add(cursorScenario({
  id: 'D05', title: 'Cursor in a response header', kind: 'cursor-header', path: '/items', param: 'cursor',
  description: 'The body is a bare JSON array. The next cursor is only in the X-Next-Cursor header.',
  howTo: 'GET /items, then GET /items?cursor=<X-Next-Cursor> until the header is missing.',
  endText: 'No X-Next-Cursor header on the last page.', recordsText: jsonRec('[] (array root)'),
  pagination: { header: 'X-Next-Cursor', param: 'cursor' },
  encode: (off) => opaque('D05', off), decode: opaqueDecode('D05'),
  respond: (c, recs, next) => json(recs, 200, next ? { 'X-Next-Cursor': next } : {}),
}))

add(cursorScenario({
  id: 'D06', title: 'Cursor in the HTML', kind: 'cursor-html', path: '/list', param: 'cursor',
  description: 'The cursor is in the page: a hidden <input name="cursor"> in the "Load more" form, and a data-next attribute on the list.',
  howTo: 'GET /list, read input[name=cursor] (or #records[data-next]) and GET /list?cursor=<value>. Stop when neither is present.',
  endText: 'The last page has no form and no data-next attribute.', recordsText: HTML_REC,
  pagination: { selectors: ['form#more input[name=cursor]', '#records[data-next]'], param: 'cursor' },
  encode: (off) => opaque('D06', off), decode: opaqueDecode('D06'),
  respond: (c, recs, next) => {
    const hidden = Object.entries(c.sticky).filter(([, v]) => v).map(([k, v]) => `<input type="hidden" name="${k}" value="${esc(v)}">`).join('')
    const ul = next ? list(c, recs).replace('<ul id="records" class="cards">', `<ul id="records" class="cards" data-next="${next}">`) : list(c, recs)
    const form = next ? `\n<form id="more" method="get" action="${c.root}/list"><input type="hidden" name="cursor" value="${next}">${hidden}<button type="submit" class="load-more">Load more</button></form>` : ''
    return html(page(c, { title: 'Cursor in the HTML', body: `<h1>Cursor in the HTML</h1>\n${ul}${form}` }))
  },
}))

add(cursorScenario({
  id: 'D07', title: 'Expiring cursor', kind: 'cursor-expiring', path: '/items', param: 'cursor',
  description: 'Each cursor can be used twice per run. The third use returns 410 Gone, so a scraper must not replay cursors carelessly.',
  howTo: 'GET /items, then GET /items?cursor=<next_cursor>. Use each cursor once. On 410, restart from /items.',
  endText: 'next_cursor is null on the last page. A replayed cursor returns 410 Gone after two uses.', recordsText: jsonRec('data[]'),
  pagination: { field: 'next_cursor', param: 'cursor', maxUses: 2, expiredStatus: 410 },
  encode: (off) => opaque('D07', off),
  decode: (raw, ctx, offsets) => {
    const off = offsets.find((o) => opaque('D07', o) === raw)
    if (off === undefined) return undefined
    const uses = (ctx.state.uses ??= {})
    uses[raw] = (uses[raw] ?? 0) + 1
    return uses[raw] > 2 ? json({ error: 'cursor_expired', message: 'This cursor has expired (2 uses per run). Restart from the first page.' }, 410) : off
  },
  respond: (c, recs, next) => json({ data: recs, next_cursor: next }),
}))

const pageCursor = (off) => b64url(JSON.stringify({ page: off / 10 + 1 }))
add(cursorScenario({
  id: 'D09', title: 'Cursor for page 6 returns 404', kind: 'cursor', path: '/items', param: 'cursor',
  description: 'The cursor is base64url JSON {"page":N}. next_cursor is null after page 5, and a hand-made cursor for page 6 or later gets 404 Not Found.',
  howTo: 'GET /items, then GET /items?cursor=<next_cursor> until next_cursor is null.',
  endText: 'next_cursor is null on page 5; a cursor for {"page":6} returns 404.', recordsText: jsonRec('data[]'),
  pagination: { field: 'next_cursor', param: 'cursor', encoding: 'base64url(JSON {page})' },
  encode: pageCursor,
  decode: (raw, ctx) => {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(raw)) return undefined
    try {
      const n = JSON.parse(Buffer.from(raw, 'base64url').toString())?.page
      if (!Number.isInteger(n) || n < 1) return undefined
      return n > 5 ? notFound(ctx, 'json') : (n - 1) * 10
    } catch { return undefined }
  },
  respond: (c, recs, next) => json({ data: recs, next_cursor: next }),
  answerPatch: (a, A) => ({ ...a, endProbe: { request: A.abs(`/items?cursor=${pageCursor(50)}`), expectStatus: 404, expectRecords: 'none' } }),
}))

const offsetCursor = (off) => b64url(`offset:${off}`)
const d10Url = (i) => (i === 0 ? '/items' : `/items?cursor=${offsetCursor(i * 10)}`)
add({
  id: 'D10', category: 'cursor', title: 'Never-ending cursor', kind: 'cursor-endless', total: Infinity, extra: 95, endText: ENDLESS_TEXT,
  description: 'next_cursor is never null: every response hands you 10 records and another cursor.',
  howTo: 'GET /items, then GET /items?cursor=<next_cursor>, but stop at your own page cap.',
  recordsText: jsonRec('data[]'), pagination: { field: 'next_cursor', param: 'cursor', endless: true },
  entryPath: '/items',
  handle(ctx) {
    if (ctx.path !== '/items') return
    const raw = ctx.query.get('cursor')
    const m = raw === null ? [, '0'] : /^[A-Za-z0-9_-]{1,32}$/.test(raw) && Buffer.from(raw, 'base64url').toString().match(/^offset:(\d{1,8})$/)
    if (!m || Number(m[1]) % 10) return badRequest('invalid cursor')
    const off = Number(m[1])
    return json({ data: records('D10', off, 10, Infinity), next_cursor: offsetCursor(off + 10) })
  },
  answer: (A) => endlessAnswer(A, d10Url),
})

/** Bijective base 26: 1 → a, 26 → z, 27 → aa, 28 → ab … */
const toLetters = (n) => {
  let s = ''
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(97 + ((n - 1) % 26)) + s
  return s
}
const fromLetters = (s) => [...s].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 96, 0)
add(endless({
  id: 'D11', category: 'cursor', title: 'Letter page tokens a, b … z, aa, ab … forever', kind: 'letter-token-endless', nav: 'next',
  url: (i) => `/list?page=${toLetters(i + 1)}`,
  parse: onPath('/list', (c) => {
    const v = c.query.get('page')
    if (v === null) return 0
    return /^[a-z]{1,6}$/.test(v) ? fromLetters(v) - 1 : badRequest('page must be 1–6 lowercase letters')
  }),
  description: 'The page token is letters, not a number: ?page=a, b … z, then aa, ab … az, ba … and it never ends. Each page has a Next link to the following token.',
  howTo: 'Request /list?page=a and follow a.next (or count in base 26: z → aa), but stop at your own page cap.',
  pagination: { param: 'page', firstValue: 'a', sequence: 'bijective base 26 (a…z, aa, ab…)', endless: true },
}))

const relayCursor = (n) => b64url(`cursor:${n}`)
const RELAY_QUERY = 'query Products($first: Int!, $after: String) { products(first: $first, after: $after) { edges { cursor node { id title category price rating createdAt url } } pageInfo { hasNextPage endCursor } } }'

function readJsonBody(ctx) {
  if (ctx.method !== 'POST') return json({ error: 'method_not_allowed', message: 'POST a JSON body' }, 405, { Allow: 'POST' })
  try {
    const b = JSON.parse(ctx.body || 'null')
    return b && typeof b === 'object' && !Array.isArray(b) ? b : badRequest('body must be a JSON object')
  } catch { return badRequest('body must be valid JSON') }
}
const intIn = (v, lo, hi, dflt) => (v === undefined || v === null ? dflt : Number.isInteger(v) && v >= lo && v <= hi ? v : NaN)

add({
  id: 'D08', category: 'cursor', title: 'GraphQL Relay connection', kind: 'relay-connection', total: 47,
  description: 'POST /graphql with first/after variables. The response is a Relay connection: edges, plus pageInfo { hasNextPage, endCursor }.',
  howTo: 'POST {"query": …, "variables": {"first": 10}}, then repeat with "after": pageInfo.endCursor while hasNextPage is true.',
  endText: 'pageInfo.hasNextPage is false on the last page.', recordsText: jsonRec('data.products.edges[].node'),
  pagination: { endpoint: '/graphql', variables: ['first', 'after'], pageInfo: ['hasNextPage', 'endCursor'] },
  entryPath: '/graphql',
  handle(ctx) {
    if (ctx.path !== '/graphql') return
    const b = readJsonBody(ctx)
    if (isResponse(b)) return b
    const v = b.variables ?? {}
    const first = intIn(v.first, 1, 50, 10)
    let off = 0
    if (v.after !== undefined && v.after !== null) {
      const m = typeof v.after === 'string' && /^[A-Za-z0-9_-]{1,32}$/.test(v.after) ? Buffer.from(v.after, 'base64url').toString().match(/^cursor:(\d{1,3})$/) : null
      off = m ? Number(m[1]) : NaN
    }
    if (Number.isNaN(first) || Number.isNaN(off) || off > 47) return json({ errors: [{ message: 'Invalid first/after variables' }] })
    const recs = records('D08', off, first, 47)
    const edges = recs.map((node, k) => ({ cursor: relayCursor(off + k + 1), node }))
    return json({ data: { products: { totalCount: 47, edges, pageInfo: { hasNextPage: off + first < 47, endCursor: edges.at(-1)?.cursor ?? null } } } })
  },
  answer: (A) => ({
    expectedRequests: range(5).map((k) => ({
      method: 'POST', url: A.abs('/graphql'), contentType: 'application/json',
      body: JSON.stringify({ query: RELAY_QUERY, variables: k === 0 ? { first: 10 } : { first: 10, after: relayCursor(k * 10) } }),
    })),
    cursors: range(4).map((k) => relayCursor((k + 1) * 10)),
    notes: 'GraphQL requests are compared on their variables only. The server returns every node field whatever the selection set.',
  }),
})

/* ═════════ E. API / request-body pagination ═════════ */

add({
  id: 'E01', category: 'api', title: 'POST form body page=2', kind: 'post-form', total: 47,
  description: 'Page 1 is a normal GET. Every later page is a form POST of page=N to the same URL; there are no GET links.',
  howTo: 'GET /search, then submit form.pager: POST /search with application/x-www-form-urlencoded body page=2, 3 …',
  endText: 'The last page has no form; POSTing past the end returns an empty list.', recordsText: HTML_REC,
  pagination: { method: 'POST', contentType: 'application/x-www-form-urlencoded', field: 'page', firstValue: 2 },
  entryPath: '/search',
  handle(ctx) {
    if (ctx.path !== '/search') return
    let i = 0
    if (ctx.method === 'POST') {
      const v = new URLSearchParams(ctx.body).get('page') ?? ''
      if (!/^\d{1,7}$/.test(v) || Number(v) < 1) return badRequest('page must be a positive integer')
      i = Number(v) - 1
    }
    const recs = records('E01', i * 10, 10, 47)
    const form = recs.length && i < 4
      ? `\n<form class="pager" method="post" action="${esc(ctx.link('/search'))}"><input type="hidden" name="page" value="${i + 2}"><button type="submit" class="next">Next page ›</button></form>` : ''
    return html(page(ctx, { title: `Search — page ${i + 1}`, body: `<h1>Search results</h1>\n<p class="page-info">Page ${i + 1}</p>\n${list(ctx, recs)}${form}` }))
  },
  answer: (A) => {
    const post = (n) => ({ method: 'POST', url: A.abs('/search'), contentType: 'application/x-www-form-urlencoded', body: `page=${n}` })
    return { expectedRequests: [A.abs('/search'), ...[2, 3, 4, 5].map(post)], endProbe: { request: post(6), expectStatus: 200, expectRecords: 'none' } }
  },
})

const jsonPost = (A, path, body) => ({ method: 'POST', url: A.abs(path), contentType: 'application/json', body: JSON.stringify(body) })

add({
  id: 'E02', category: 'api', title: 'POST JSON body { page, size }', kind: 'post-json', total: 47,
  description: 'A search API that takes the page in a JSON request body.',
  howTo: 'POST /api/search with {"page": 1, "size": 10}, then increment page while hasMore is true.',
  endText: 'hasMore is false on the last page; later pages return items: [].', recordsText: jsonRec('items[]'),
  pagination: { method: 'POST', body: { page: 'firstValue 1', size: 'max 50' }, hasMore: 'hasMore' },
  entryPath: '/api/search',
  handle(ctx) {
    if (ctx.path !== '/api/search') return
    const b = readJsonBody(ctx)
    if (isResponse(b)) return b
    const p = intIn(b.page, 1, 1e6, 1)
    const size = intIn(b.size, 1, 50, 10)
    if (Number.isNaN(p) || Number.isNaN(size)) return badRequest('page must be ≥ 1 and size 1–50')
    return json({ items: records('E02', (p - 1) * size, size, 47), page: p, size, hasMore: p * size < 47 })
  },
  answer: (A) => ({
    expectedRequests: [1, 2, 3, 4, 5].map((p) => jsonPost(A, '/api/search', { page: p, size: 10 })),
    endProbe: { request: jsonPost(A, '/api/search', { page: 6, size: 10 }), expectStatus: 200, expectRecords: 'none' },
  }),
})

add({
  id: 'E03', category: 'api', title: 'GraphQL offset / limit variables', kind: 'graphql-offset', total: 47,
  description: 'POST /graphql with offset and limit variables. totalCount tells you when to stop.',
  howTo: 'POST {"query": …, "variables": {"offset": 0, "limit": 10}} and add 10 to offset until offset ≥ totalCount.',
  endText: 'Stop when offset reaches data.products.totalCount (47).', recordsText: jsonRec('data.products.items[]'),
  pagination: { endpoint: '/graphql', variables: ['offset', 'limit'], total: 'data.products.totalCount' },
  entryPath: '/graphql',
  handle(ctx) {
    if (ctx.path !== '/graphql') return
    const b = readJsonBody(ctx)
    if (isResponse(b)) return b
    const v = b.variables ?? {}
    const off = intIn(v.offset, 0, 1e6, 0)
    const limit = intIn(v.limit, 1, 50, 10)
    if (Number.isNaN(off) || Number.isNaN(limit)) return json({ errors: [{ message: 'offset must be ≥ 0 and limit 1–50' }] })
    return json({ data: { products: { totalCount: 47, items: records('E03', off, limit, 47) } } })
  },
  answer: (A) => ({
    expectedRequests: range(5).map((k) => jsonPost(A, '/graphql', { query: 'query Products($offset: Int!, $limit: Int!) { products(offset: $offset, limit: $limit) { totalCount items { id title price } } }', variables: { offset: k * 10, limit: 10 } })),
    notes: 'GraphQL requests are compared on their variables only.',
  }),
})

const E = (id, title, description, howTo, extra) =>
  add(paged({ id, category: 'api', title, description, howTo, format: 'json', nav: 'none', end: 'H02', ...extra }))

E('E04', 'Page size negotiation', 'Ask for size=100 and you get 25: the server caps the page size and reports the real size in meta.size.',
  'Request /api/items?page=1&size=100, read meta.size, and keep requesting pages until page × meta.size ≥ meta.total.',
  {
    pageSize: 25, total: 47, url: (i) => `/api/items?page=${i + 1}&size=100`, kind: 'page-size-capped',
    parse: onPath('/api/items', (c) => pageNum(c, 'page')),
    pageSizeFor: (c) => {
      const v = c.query.get('size')
      if (v === null) return 10
      return DIGITS.test(v) && Number(v) > 0 ? Math.min(25, Number(v)) : badRequest('size must be a positive number')
    },
    respond: (c, p) => json({ data: p.recs, meta: { page: p.i + 1, requestedSize: Number(c.query.get('size') ?? 10), size: p.ps, total: p.total } }),
    recordsText: jsonRec('data[]'), pagination: { param: 'page', sizeParam: 'size', maxSize: 25, actualSize: 'meta.size' },
  })

E('E05', 'Total count provided', 'meta.total, meta.totalPages and the X-Total-Count header tell you exactly how many pages there are.',
  'Request /api/items?page=1 and continue up to meta.totalPages.',
  {
    end: 'H10', url: (i) => `/api/items?page=${i + 1}`, parse: onPath('/api/items', (c) => pageNum(c, 'page')), kind: 'page-query-with-total',
    respond: (c, p) => json({ data: p.recs, meta: { page: p.i + 1, perPage: p.ps, total: p.total, totalPages: p.pages } }, 200, { 'X-Total-Count': String(p.total) }),
    recordsText: jsonRec('data[]'), pagination: { param: 'page', total: ['meta.total', 'X-Total-Count'], totalPages: 'meta.totalPages' },
  })

E('E06', 'Total count absent', 'No totals and no next links: only an empty items array says you are done. 50 records, so the last full page is no clue.',
  'Request /api/items?page=1, 2 … until items is empty.',
  {
    end: 'H12', total: 50, url: (i) => `/api/items?page=${i + 1}`, parse: onPath('/api/items', (c) => pageNum(c, 'page')), kind: 'page-query-no-total',
    respond: (c, p) => json({ items: p.recs }), recordsText: jsonRec('items[]'), pagination: { param: 'page', stopWhen: 'items is empty' },
  })

const absPage = (c, p, k) => c.base + c.link(p.url(k))
E('E07', 'JSON:API style', 'JSON:API document: data[] resources, links.next / links.last, meta.page.',
  'Request /api/products?page[number]=1&page[size]=10 and follow links.next until it is null.',
  {
    url: (i) => `/api/products?page[number]=${i + 1}&page[size]=10`, kind: 'json-api',
    parse: onPath('/api/products', (c) => (c.query.get('page[size]') && c.query.get('page[size]') !== '10' ? badRequest('page[size] is fixed at 10') : pageNum(c, 'page[number]'))),
    respond: (c, p) => json({
      data: p.recs.map(({ id, ...attributes }) => ({ type: 'products', id, attributes, links: { self: c.base + c.link('/item/' + id) } })),
      links: { self: absPage(c, p, p.i), first: absPage(c, p, 0), prev: p.i > 0 ? absPage(c, p, p.i - 1) : null, next: p.i < p.pages - 1 ? absPage(c, p, p.i + 1) : null, last: absPage(c, p, p.pages - 1) },
      meta: { page: { number: p.i + 1, size: p.ps, total: p.total, totalPages: p.pages } },
    }, 200, { 'Content-Type': 'application/vnd.api+json' }),
    recordsText: jsonRec('data[]', 'id (fields under attributes)'), pagination: { next: 'links.next', last: 'links.last' },
  })

E('E08', 'HAL style', 'HAL document: _embedded.products and _links.next.href.',
  'Request /api/products?page=1 and follow _links.next.href until _links.next is absent.',
  {
    url: (i) => `/api/products?page=${i + 1}`, parse: onPath('/api/products', (c) => pageNum(c, 'page')), kind: 'hal',
    respond: (c, p) => {
      const l = { self: { href: absPage(c, p, p.i) }, first: { href: absPage(c, p, 0) }, last: { href: absPage(c, p, p.pages - 1) } }
      if (p.i > 0 && p.i < p.pages) l.prev = { href: absPage(c, p, p.i - 1) }
      if (p.i < p.pages - 1) l.next = { href: absPage(c, p, p.i + 1) }
      return json({ _links: l, _embedded: { products: p.recs }, page: { size: p.ps, number: p.i + 1, totalElements: p.total, totalPages: p.pages } }, 200, { 'Content-Type': 'application/hal+json' })
    },
    recordsText: jsonRec('_embedded.products[]'), pagination: { next: '_links.next.href' },
  })

E('E09', 'OData style', 'OData collection: value[], @odata.nextLink, $top and $skip.',
  'Request /odata/Products?$top=10 and follow @odata.nextLink until it is absent.',
  {
    url: (i) => (i === 0 ? '/odata/Products?$top=10' : `/odata/Products?$top=10&$skip=${i * 10}`), kind: 'odata',
    parse: onPath('/odata/Products', (c) => (c.query.get('$top') && c.query.get('$top') !== '10' ? badRequest('$top is fixed at 10') : offsetNum(c, '$skip'))),
    respond: (c, p) => {
      const body = { '@odata.context': `${c.base}${c.root}/odata/$metadata#Products`, value: p.recs }
      if (p.i < p.pages - 1) body['@odata.nextLink'] = absPage(c, p, p.i + 1)
      return json(body)
    },
    recordsText: jsonRec('value[]'), pagination: { next: '@odata.nextLink', params: ['$top', '$skip'] },
  })

add({
  id: 'E10', category: 'api', title: 'Elasticsearch-like search_after', kind: 'search-after', total: 47,
  description: 'POST /_search with a sort and search_after set to the sort values of the last hit.',
  howTo: 'POST {"size": 10, "sort": [{"id": "asc"}]}, then add "search_after": <last hit sort> until hits.hits is empty.',
  endText: 'hits.hits is empty: one extra request after the last record.', recordsText: jsonRec('hits.hits[]', '_id (record under _source)'),
  pagination: { endpoint: '/_search', method: 'POST', field: 'search_after', valueFrom: 'hits.hits[-1].sort' },
  entryPath: '/_search',
  handle(ctx) {
    if (ctx.path !== '/_search') return
    const b = readJsonBody(ctx)
    if (isResponse(b)) return b
    const size = intIn(b.size, 1, 50, 10)
    let off = 0
    if (b.search_after !== undefined) {
      const n = Array.isArray(b.search_after) && b.search_after.length === 1 ? recordNumber(String(b.search_after[0])) : NaN
      off = n >= 1 && n <= 47 ? n : NaN
    }
    if (Number.isNaN(size) || Number.isNaN(off)) return json({ error: { type: 'parse_exception', reason: 'size must be 1–50; search_after must be [<id>]' }, status: 400 }, 400)
    const hits = records('E10', off, size, 47).map((r) => ({ _index: 'products', _id: r.id, _score: null, _source: r, sort: [r.id] }))
    return json({ took: 1, timed_out: false, hits: { total: { value: 47, relation: 'eq' }, max_score: null, hits } })
  },
  answer: (A) => ({
    expectedRequests: [null, 10, 20, 30, 40, 47].map((n) => jsonPost(A, '/_search', n === null ? { size: 10, sort: [{ id: 'asc' }] } : { size: 10, sort: [{ id: 'asc' }], search_after: [recordId(n)] })),
  }),
})

add(past404({
  id: 'E11', category: 'api', title: 'API page 6 returns 404', kind: 'page-query', format: 'json', nav: 'none', ...pageQuery('/api/items'),
  description: 'A JSON API with 5 pages. GET /api/items?page=6 (or higher) answers 404 Not Found with a JSON error body.',
  howTo: 'Request /api/items?page=1 and increment page while hasMore is true. Page 6 is 404.',
  respond: (c, p) => json({ data: p.recs, page: p.i + 1, hasMore: p.i < p.pages - 1 }),
  recordsText: jsonRec('data[]'), pagination: { param: 'page', hasMore: 'hasMore' },
}))

add(endless({
  id: 'E12', category: 'api', title: 'Never-ending API (hasMore is always true)', kind: 'page-query-endless', format: 'json', nav: 'none', ...pageQuery('/api/items'),
  description: 'hasMore is always true and next always names the following page.',
  howTo: 'Request /api/items?page=1 and follow next, but stop at your own page cap.',
  respond: (c, p) => json({ data: p.recs, page: p.i + 1, hasMore: true, next: absPage(c, p, p.i + 1) }),
  recordsText: jsonRec('data[]'), pagination: { param: 'page', next: 'next', endless: true },
}))

/* ═════════ F. Client-side (JavaScript) pagination ═════════ */

const F = (sc) => add({ category: 'client-side', client: 'browser', total: 47, ...sc })

const FEED_BODY = '<h1>Infinite scroll</h1>\n<ul id="records" class="cards"></ul>\n<div id="sentinel" aria-live="polite">Loading…</div>'
const FEED_SCRIPT = `
const listEl = document.getElementById('records');
const sentinel = document.getElementById('sentinel');
let next = u('/feed.json?page=1'), busy = false;
const io = new IntersectionObserver(async (entries) => {
  if (!entries[0].isIntersecting || busy || !next) return;
  busy = true;
  const d = await getJSON(next);
  listEl.insertAdjacentHTML('beforeend', d.items.map(card).join(''));
  next = d.next; busy = false;
  if (!next) { io.disconnect(); sentinel.textContent = 'You have reached the end.'; sentinel.classList.add('end'); }
  else { io.unobserve(sentinel); io.observe(sentinel); }
});
io.observe(sentinel);`

const SPA_SCRIPT = `
const listEl = document.getElementById('records');
const navEl = document.querySelector('nav.pagination');
const cur = () => Math.max(1, parseInt(new URLSearchParams(location.search).get('page'), 10) || 1);
const href = (k) => addq('?page=' + k);
async function show(p, push) {
  const d = await getJSON(u('/api/list?page=' + p));
  listEl.innerHTML = d.items.map(card).join('');
  let h = '';
  for (let k = 1; k <= d.totalPages; k++) h += k === p ? '<span class="page current" aria-current="page">' + k + '</span> ' : '<a class="page" href="' + href(k) + '" data-page="' + k + '">' + k + '</a> ';
  if (p < d.totalPages) h += '<a class="next" rel="next" href="' + href(p + 1) + '" data-page="' + (p + 1) + '">Next \\u203a</a>';
  navEl.innerHTML = h;
  if (push) history.pushState({ p }, '', href(p));
}
navEl.addEventListener('click', (e) => { const a = e.target.closest('a[data-page]'); if (!a) return; e.preventDefault(); show(+a.dataset.page, true); });
addEventListener('popstate', () => show(cur(), false));
show(cur(), false);`

F({
  id: 'F01', title: '"Load more" button', kind: 'load-more',
  description: 'Page 1 is server-rendered. Clicking .load-more fetches JSON from /more?page=N and appends the cards.',
  howTo: 'Click button.load-more until it disappears, or GET the XHR endpoint in its data-next attribute and follow "next".',
  endText: 'The button is removed once the response has next: null.', recordsText: `${HTML_REC}; XHR: ${jsonRec('items[]')}`,
  pagination: { button: 'button.load-more', xhr: '/more?page=N', next: 'next (also data-next on the button)' },
  entryPath: '/list',
  handle(ctx) {
    if (ctx.path === '/more') return dataPage(ctx, '/more')
    if (ctx.path !== '/list') return
    return shell(ctx, {
      title: 'Load more', body: `<h1>Load more</h1>\n${list(ctx, records('F01', 0, 10, 47))}\n<button type="button" class="load-more" data-next="${esc(ctx.link('/more?page=2'))}">Load more</button>`,
      script: `
const btn = document.querySelector('.load-more');
btn.addEventListener('click', async () => {
  btn.disabled = true;
  const d = await getJSON(btn.dataset.next);
  document.getElementById('records').insertAdjacentHTML('beforeend', d.items.map(card).join(''));
  if (d.next) { btn.dataset.next = d.next; btn.disabled = false; } else btn.remove();
});`,
    })
  },
  answer: (A) => ({
    expectedRequests: [A.abs('/list'), ...[2, 3, 4, 5].map((n) => A.abs(`/more?page=${n}`))],
    uiActions: [{ action: 'click', selector: 'button.load-more', times: 4, until: 'button.load-more is gone' }],
  }),
})

F({
  id: 'F02', title: 'Infinite scroll (IntersectionObserver)', kind: 'infinite-scroll',
  description: 'Nothing is server-rendered. A #sentinel element at the bottom triggers a fetch of /feed.json?page=N each time it scrolls into view.',
  howTo: 'Scroll to the bottom repeatedly until #sentinel says "You have reached the end." The XHR endpoint is /feed.json?page=N.',
  endText: '#sentinel gets class "end" and the observer disconnects when next is null.', recordsText: `${HTML_REC} (rendered by JavaScript); XHR: ${jsonRec('items[]')}`,
  pagination: { sentinel: '#sentinel', xhr: '/feed.json?page=N', endMarker: '#sentinel.end' },
  entryPath: '/feed',
  handle(ctx) {
    if (ctx.path === '/feed.json') return dataPage(ctx, '/feed.json')
    if (ctx.path !== '/feed') return
    return shell(ctx, {
      title: 'Infinite scroll', body: FEED_BODY, script: FEED_SCRIPT,
    })
  },
  answer: (A) => ({
    expectedRequests: [A.abs('/feed'), ...range(5).map((i) => A.abs(`/feed.json?page=${i + 1}`))],
    uiActions: [{ action: 'scroll', target: 'bottom', times: 5, until: '#sentinel.end is visible' }],
  }),
})

F({
  id: 'F03', title: 'Client-rendered pagination bar (pushState)', kind: 'spa-pushstate',
  description: 'An SPA renders the list and the bar from /api/list?page=N. Clicking a page uses history.pushState, so the URL changes without a page load.',
  howTo: 'Open /spa and click nav.pagination a.next. Without JavaScript, /spa?page=N is only an empty shell. The data is at /api/list?page=N.',
  endText: 'No a.next on the last page (totalPages = 5).', recordsText: `${HTML_REC} (rendered by JavaScript); XHR: ${jsonRec('items[]')}`,
  pagination: { xhr: '/api/list?page=N', history: 'pushState ?page=N' },
  entryPath: '/spa',
  handle(ctx) {
    if (ctx.path === '/api/list') return dataPage(ctx, '/api/list')
    if (ctx.path !== '/spa') return
    return shell(ctx, { title: 'SPA pagination', body: spaBody('SPA pagination'), script: SPA_SCRIPT })
  },
  answer: (A) => ({
    expectedRequests: [A.abs('/spa'), ...range(5).map((i) => A.abs(`/api/list?page=${i + 1}`))],
    uiActions: [{ action: 'click', selector: 'nav.pagination a.next', times: 4 }],
  }),
})

F({
  id: 'F04', title: 'Hash-routed SPA', kind: 'spa-hash',
  description: 'The route lives in the hash: #/page/2. The server only ever sees /app.',
  howTo: 'Open /app#/page/1 and follow the #/page/N links, or call /api/list?page=N.',
  endText: 'No a.next on page 5.', recordsText: `${HTML_REC} (rendered by JavaScript); XHR: ${jsonRec('items[]')}`,
  pagination: { route: '#/page/N', xhr: '/api/list?page=N' },
  entryPath: '/app#/page/1',
  handle(ctx) {
    if (ctx.path === '/api/list') return dataPage(ctx, '/api/list')
    if (ctx.path !== '/app') return
    return shell(ctx, {
      title: 'Hash-routed SPA', body: spaBody('Hash-routed SPA'),
      script: hashAppScript('/api/list', `const m = location.hash.match(/^#\\/page\\/(\\d+)$/); return m ? Math.max(1, +m[1]) : 1;`, `'#/page/' + k`),
    })
  },
  answer: (A) => ({
    expectedRequests: [A.abs('/app'), ...range(5).map((i) => A.abs(`/api/list?page=${i + 1}`))],
    uiActions: [{ action: 'open', url: A.abs('/app#/page/1') }, { action: 'click', selector: 'nav.pagination a.next', times: 4 }],
  }),
})

F({
  id: 'F05', title: 'Embedded JSON blob, paginated client-side', kind: 'embedded-json',
  description: 'All 47 records ship in <script id="__DATA__" type="application/json">. The visible list shows 10 at a time.',
  howTo: 'Read the __DATA__ blob (one request), or click the page buttons.',
  endText: 'Everything is in the first response; the buttons only change what is visible.', recordsText: 'script#__DATA__ JSON items[] → id, title, …; visible: li.card[data-id]',
  pagination: { blob: 'script#__DATA__', buttons: 'nav.pagination button[data-page]' },
  entryPath: '/list',
  handle(ctx) {
    if (ctx.path !== '/list') return
    const blob = JSON.stringify({ items: records('F05', 0, 47, 47) }).replace(/</g, '\\u003c')
    return shell(ctx, {
      title: 'Embedded data', body: `<h1>Embedded data</h1>\n<script id="__DATA__" type="application/json">${blob}</script>\n<ul id="records" class="cards"></ul>\n<nav class="pagination" aria-label="Pagination"></nav>`,
      script: `
const all = JSON.parse(document.getElementById('__DATA__').textContent).items;
const listEl = document.getElementById('records'), navEl = document.querySelector('nav.pagination');
const pages = Math.ceil(all.length / 10);
function show(p) {
  listEl.innerHTML = all.slice((p - 1) * 10, p * 10).map(card).join('');
  let h = '';
  for (let k = 1; k <= pages; k++) h += '<button type="button" data-page="' + k + '"' + (k === p ? ' class="current" aria-current="page"' : '') + '>' + k + '</button> ';
  if (p < pages) h += '<button type="button" class="next" data-page="' + (p + 1) + '">Next \\u203a</button>';
  navEl.innerHTML = h;
}
navEl.addEventListener('click', (e) => { const b = e.target.closest('button[data-page]'); if (b) show(+b.dataset.page); });
show(1);`,
    })
  },
  answer: (A) => ({ expectedRequests: [A.abs('/list')], uiActions: [{ action: 'click', selector: 'nav.pagination button.next', times: 4 }] }),
})

F({
  id: 'F06', title: 'Virtualised list', kind: 'virtualised', total: 100,
  description: '100 rows, but the DOM only holds the rows visible in the 400px scroll container (plus a few spare). Rows are recycled as you scroll.',
  howTo: 'Scroll .virtual-viewport to the bottom, collecting li.card as rows appear, or GET /rows.json (all rows in one response).',
  endText: 'The scroll container reaches its end (scrollTop + clientHeight = scrollHeight) after 100 rows.', recordsText: `${HTML_REC} (only visible rows are in the DOM); XHR: ${jsonRec('items[]')}`,
  pagination: { container: '.virtual-viewport', rowHeight: 48, xhr: '/rows.json' },
  entryPath: '/list',
  handle(ctx) {
    if (ctx.path === '/rows.json') return json({ items: records('F06', 0, 100, 100), total: 100 })
    if (ctx.path !== '/list') return
    return shell(ctx, {
      title: 'Virtualised list', body: '<h1>Virtualised list</h1>\n<div class="virtual-viewport" tabindex="0" aria-label="Product list"><ul id="records" class="cards"></ul></div>',
      script: `
const ROW = 48, vp = document.querySelector('.virtual-viewport'), listEl = document.getElementById('records');
let rows = [];
function paint() {
  const first = Math.max(0, Math.floor(vp.scrollTop / ROW) - 2);
  const last = Math.min(rows.length, Math.ceil((vp.scrollTop + vp.clientHeight) / ROW) + 2);
  listEl.innerHTML = rows.slice(first, last).map((r, k) => card(r).replace('<li class="card"', '<li class="card" style="top:' + (first + k) * ROW + 'px"')).join('');
}
getJSON(u('/rows.json')).then((d) => { rows = d.items; listEl.style.height = rows.length * ROW + 'px'; paint(); });
vp.addEventListener('scroll', paint);`,
    })
  },
  answer: (A) => ({ expectedRequests: [A.abs('/list'), A.abs('/rows.json')], uiActions: [{ action: 'scroll', target: '.virtual-viewport', until: 'scrollTop + clientHeight >= scrollHeight' }] }),
})

F({
  id: 'F07', title: '"Show N more" with a variable increment', kind: 'show-more-variable', total: 100,
  description: 'Each click loads more than the last: 10, then 20, then 50 at a time. The button label shows the next amount.',
  howTo: 'Click button.show-more until it disappears, or follow /more?offset=…&limit=… using the "next" object in each response.',
  endText: 'The response has next: null and the button is removed.', recordsText: `${HTML_REC}; XHR: ${jsonRec('items[]')}`,
  pagination: { button: 'button.show-more', xhr: '/more?offset=O&limit=L', increments: [10, 20, 50, 50] },
  entryPath: '/list',
  handle(ctx) {
    if (ctx.path === '/more') {
      const off = ctx.query.get('offset') ?? '0'
      const lim = ctx.query.get('limit') ?? '10'
      if (!DIGITS.test(off) || !/^\d{1,2}$/.test(lim) || Number(lim) < 1 || Number(lim) > 50) return badRequest('offset ≥ 0, limit 1–50')
      const o = Number(off), l = Number(lim)
      const nextOff = o + l
      return json({ items: records('F07', o, l, 100), next: nextOff < 100 ? { offset: nextOff, limit: l < 20 ? 20 : 50 } : null })
    }
    if (ctx.path !== '/list') return
    return shell(ctx, {
      title: 'Show more', body: `<h1>Show more</h1>\n${list(ctx, records('F07', 0, 10, 100))}\n<button type="button" class="show-more" data-offset="10" data-limit="10">Show 10 more</button>`,
      script: `
const btn = document.querySelector('.show-more');
btn.addEventListener('click', async () => {
  btn.disabled = true;
  const d = await getJSON(u('/more?offset=' + btn.dataset.offset + '&limit=' + btn.dataset.limit));
  document.getElementById('records').insertAdjacentHTML('beforeend', d.items.map(card).join(''));
  if (!d.next) return btn.remove();
  btn.dataset.offset = d.next.offset; btn.dataset.limit = d.next.limit;
  btn.textContent = 'Show ' + d.next.limit + ' more'; btn.disabled = false;
});`,
    })
  },
  answer: (A) => ({
    expectedRequests: [A.abs('/list'), ...[[10, 10], [20, 20], [40, 50], [90, 50]].map(([o, l]) => A.abs(`/more?offset=${o}&limit=${l}`))],
    uiActions: [{ action: 'click', selector: 'button.show-more', times: 4, until: 'button.show-more is gone' }],
  }),
})

F({
  id: 'F08', title: 'SPA: typing ?page=6 gets a 404 document', kind: 'spa-pushstate',
  description: 'The F03 pushState SPA, but the server checks ?page= on the document itself. /spa?page=1 … ?page=5 load the app; /spa?page=6 (or higher) is a real 404 Not Found document, and so is /api/list?page=6.',
  howTo: 'Open /spa and click nav.pagination a.next, or GET /api/list?page=N. Typing /spa?page=6 in the address bar shows 404.',
  endText: 'No a.next on page 5; /spa?page=6 and /api/list?page=6 return 404.', recordsText: `${HTML_REC} (rendered by JavaScript); XHR: ${jsonRec('items[]')}`,
  pagination: { xhr: '/api/list?page=N', history: 'pushState ?page=N' },
  entryPath: '/spa',
  handle(ctx) {
    if (ctx.path !== '/spa' && ctx.path !== '/api/list') return
    const i = pageNum(ctx, 'page')
    if (isResponse(i)) return i
    if (ctx.path === '/api/list') return i >= 5 ? notFound(ctx, 'json') : dataPage(ctx, '/api/list')
    return i >= 5 ? notFound(ctx) : shell(ctx, { title: 'SPA pagination', body: spaBody('SPA pagination'), script: SPA_SCRIPT })
  },
  answer: (A) => ({
    expectedRequests: [A.abs('/spa'), ...range(5).map((i) => A.abs(`/api/list?page=${i + 1}`))],
    endProbe: { request: A.abs('/spa?page=6'), expectStatus: 404, expectRecords: 'none' },
    uiActions: [{ action: 'click', selector: 'nav.pagination a.next', times: 4 }],
  }),
})

F({
  id: 'F09', title: 'Infinite scroll that never ends', kind: 'infinite-scroll-endless', total: Infinity, extra: 95, endText: ENDLESS_TEXT,
  description: 'The F02 infinite scroll, but /feed.json always returns another next link, so the sentinel never says "end".',
  howTo: 'Scroll /feed (or follow next from /feed.json?page=1), but stop at your own page cap.',
  recordsText: `${HTML_REC} (rendered by JavaScript); XHR: ${jsonRec('items[]')}`,
  pagination: { sentinel: '#sentinel', xhr: '/feed.json?page=N', endless: true },
  entryPath: '/feed',
  handle(ctx) {
    if (ctx.path === '/feed.json') {
      const i = pageNum(ctx, 'page')
      return isResponse(i) ? i : json({ items: records('F09', i * 10, 10, Infinity), page: i + 1, next: ctx.link(`/feed.json?page=${i + 2}`) })
    }
    if (ctx.path === '/feed') return shell(ctx, { title: 'Infinite scroll', body: FEED_BODY, script: FEED_SCRIPT })
  },
  answer: (A) => ({
    ...endlessAnswer(A, (i) => `/feed.json?page=${i + 1}`, [A.abs('/feed')]),
    uiActions: [{ action: 'scroll', target: 'bottom', times: 5, until: 'your page cap' }],
  }),
})

/* ═════════ G. Feeds and other formats ═════════ */

const xmlEsc = esc

add(paged({
  id: 'G01', category: 'feeds', title: 'Atom feed with rel="next" (RFC 5005)', kind: 'paged-feed', end: 'H01', nav: 'none',
  description: 'A paged Atom feed. Each document links rel="next", "prev", "first" and "last".',
  howTo: 'GET /feed.xml?page=1 and follow <link rel="next"> until there is none.',
  recordsText: 'Atom feed/entry → id (urn:…:p-000001), title, link[href], updated', pagination: { next: 'feed > link[rel=next]' },
  url: (i) => `/feed.xml?page=${i + 1}`, parse: onPath('/feed.xml', (c) => pageNum(c, 'page')),
  respond: (c, p) => {
    const l = (k, rel) => `  <link rel="${rel}" href="${xmlEsc(absPage(c, p, k))}"/>\n`
    const entries = p.recs.map((r) => `  <entry>\n    <id>urn:pagination-playground:${r.id}</id>\n    <title>${xmlEsc(r.title)}</title>\n    <link href="${xmlEsc(c.base + c.link('/item/' + r.id))}"/>\n    <updated>${r.createdAt}</updated>\n    <category term="${xmlEsc(r.category)}"/>\n    <summary>₹${r.price} · ★ ${r.rating}</summary>\n  </entry>\n`).join('')
    const body = `<?xml version="1.0" encoding="utf-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom">\n  <id>urn:pagination-playground:G01:page:${p.i + 1}</id>\n  <title>Pagination Playground — G01</title>\n  <updated>2024-01-02T22:00:00Z</updated>\n${l(p.i, 'self')}${l(0, 'first')}${l(p.pages - 1, 'last')}${p.i > 0 && p.i < p.pages ? l(p.i - 1, 'prev') : ''}${p.i < p.pages - 1 ? l(p.i + 1, 'next') : ''}${entries}</feed>\n`
    return text(body, 'application/atom+xml; charset=utf-8')
  },
}))

add({
  id: 'G02', category: 'feeds', title: 'XML sitemap index → paged sitemaps', kind: 'sitemap-index', total: 47,
  description: 'A sitemap index lists 5 child sitemaps. Each child lists 10 detail-page URLs.',
  howTo: 'GET /sitemap.xml, then each <sitemap><loc> it lists.',
  endText: 'The index lists exactly 5 sitemaps; /sitemap-6.xml is 404.', recordsText: 'urlset/url/loc → detail URLs ending in the record id',
  pagination: { index: '/sitemap.xml', children: 'sitemapindex/sitemap/loc' },
  entryPath: '/sitemap.xml',
  handle(ctx) {
    const xml = (b) => text(`<?xml version="1.0" encoding="UTF-8"?>\n${b}`, 'application/xml; charset=utf-8')
    if (ctx.path === '/sitemap.xml')
      return xml(`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${range(5).map((k) => `  <sitemap><loc>${xmlEsc(ctx.base + ctx.link(`/sitemap-${k + 1}.xml`))}</loc></sitemap>`).join('\n')}\n</sitemapindex>\n`)
    const m = ctx.path.match(/^\/sitemap-(\d{1,3})\.xml$/)
    if (!m) return
    const k = Number(m[1]) - 1
    if (k < 0 || k >= 5) return notFound(ctx)
    return xml(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${records('G02', k * 10, 10, 47).map((r) => `  <url><loc>${xmlEsc(ctx.base + ctx.link('/item/' + r.id))}</loc><lastmod>${r.createdAt}</lastmod></url>`).join('\n')}\n</urlset>\n`)
  },
  answer: (A) => ({
    expectedRequests: [A.abs('/sitemap.xml'), ...range(5).map((k) => A.abs(`/sitemap-${k + 1}.xml`))],
    endProbe: { request: A.abs('/sitemap-6.xml'), expectStatus: 404, expectRecords: 'none' },
  }),
})

const csvCell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))
const CSV_COLS = ['id', 'title', 'category', 'price', 'rating', 'createdAt', 'url']
const csvPage = (c, p) => text([CSV_COLS.join(','), ...p.recs.map((r) => CSV_COLS.map((k) => csvCell(r[k])).join(','))].join('\n') + '\n', 'text/csv; charset=utf-8')
const CSV_RECORDS = 'CSV columns id,title,category,price,rating,createdAt,url (header row first)'
add(paged({
  id: 'G03', category: 'feeds', title: 'CSV export with ?page=', kind: 'csv', nav: 'none',
  description: 'A CSV export, 10 rows per page, with a header row on every page.',
  howTo: 'GET /export.csv?page=1, 2 … until a page has only the header row.',
  recordsText: 'CSV columns id,title,category,price,rating,createdAt,url (header row first)', pagination: { param: 'page', stopWhen: 'only the header row' },
  ...pageQuery('/export.csv'), respond: csvPage,
}))

add(paged({
  id: 'G04', category: 'feeds', title: 'HTML fragment endpoint', kind: 'html-fragment', nav: 'none', end: 'H03',
  description: 'A "see more" API that returns bare <li class="card"> elements: no <html>, no <body>, no list wrapper.',
  howTo: 'GET /fragment?page=1, 2 … until the body is empty. X-Next-Page names the next page while there is one.',
  recordsText: 'bare li.card[data-id] fragments', pagination: { param: 'page', header: 'X-Next-Page', stopWhen: 'empty body' },
  url: (i) => `/fragment?page=${i + 1}`, parse: onPath('/fragment', (c) => pageNum(c, 'page')),
  respond: (c, p) => html(p.recs.length ? cards(c, p.recs) + '\n' : '', 200, p.i < p.pages - 1 ? { 'X-Next-Page': String(p.i + 2) } : {}),
}))

add(past404({
  id: 'G05', category: 'feeds', title: 'CSV export: page 6 returns 404', kind: 'csv', nav: 'none', ...pageQuery('/export.csv'), respond: csvPage,
  description: 'A 5-page CSV export. /export.csv?page=6 (or higher) is a real 404 Not Found.',
  howTo: 'GET /export.csv?page=1, 2 … until the response is 404.',
  recordsText: CSV_RECORDS, pagination: { param: 'page', stopWhen: '404' },
}))

add(endless({
  id: 'G06', category: 'feeds', title: 'Never-ending CSV export', kind: 'csv-endless', nav: 'none', ...pageQuery('/export.csv'), respond: csvPage,
  description: 'Every /export.csv?page=N has 10 data rows. No page is ever header-only.',
  howTo: 'GET /export.csv?page=1, 2 …, but stop at your own page cap.',
  recordsText: CSV_RECORDS, pagination: { param: 'page', endless: true },
}))

/* ═════════ H. End-of-data behaviours ═════════ */

const H_TITLES = {
  H01: '404 past the last page', H02: '200 with an empty list', H03: '200 with an empty body', H04: 'Last page repeated',
  H05: 'First page returned (silent reset)', H06: 'Redirect to page 1', H07: '410 Gone', H08: '400 "page out of range" JSON',
  H09: 'Soft 404 ("No results")', H10: 'Total pages announced, then 404', H11: 'Partial last page, nothing after', H12: 'Exactly full last page, then empty',
}
for (const code of H_CODES)
  add(paged({
    id: code, category: 'end-of-data', title: H_TITLES[code], kind: 'page-query', end: code, nav: 'none', variants: false,
    total: code === 'H12' ? 50 : 47,
    description: `A plain ?page=N listing with no pagination links. The end is signalled like this: ${END_TEXT[code]}.`,
    howTo: 'Request /list?page=1 and increment page until you see the end signal. Then stop.',
    pagination: { param: 'page', firstValue: 1, step: 1 },
    url: (i) => `/list?page=${i + 1}`, parse: onPath('/list', (c) => pageNum(c, 'page')),
  }))

add(past404({
  id: 'H13', category: 'end-of-data', title: 'Pagination bar, then 404 for a typed-in page 6', kind: 'page-query', ...pageQuery('/list'),
  description: 'A normal numbered bar that stops at 5. Typing ?page=6 (or higher) into the address bar gets a real 404 Not Found document.',
  howTo: 'Follow the bar from /list?page=1, or increment page until the response is 404.',
  pagination: { param: 'page', firstValue: 1, step: 1 },
}))

add(endless({
  id: 'H14', category: 'end-of-data', title: 'No end at all', kind: 'page-query-endless', nav: 'none', ...pageQuery('/list'),
  description: 'A plain ?page=N listing with no links that never sends any end signal: every page has 10 records.',
  howTo: 'Request /list?page=1 and increment page. Only your own page cap stops you.',
  pagination: { param: 'page', firstValue: 1, step: 1, endless: true },
}))

/* ═════════ I. Faults, robustness and politeness ═════════ */

const I = (id, title, description, howTo, extra) =>
  add(paged({ id, category: 'faults', title, description, howTo, kind: 'page-query', url: (i) => `/list?page=${i + 1}`, parse: onPath('/list', (c) => pageNum(c, 'page')), ...extra }))

const errorPage = (ctx, status, heading, msg, headers = {}) =>
  html(page(ctx, { title: `${status} ${heading}`, body: `<h1>${status} — ${esc(heading)}</h1><p>${esc(msg)}</p>` }), status, headers)

I('I01', 'One transient 500', 'Page 3 fails with 500 the first time it is requested in a run, then works.',
  'Paginate /list?page=N. When you get a 500, retry once.',
  {
    intercept: (c, i) => (i === 2 && !c.state.failed ? ((c.state.failed = true), errorPage(c, 500, 'Internal Server Error', 'Transient failure. Try again.')) : undefined),
    answerPatch: (a) => ({ ...a, expectedBehaviour: 'Retry page 3 once after the 500. All 47 records are collectable.' }),
  })

I('I02', 'Permanent 500 on one page', 'Page 3 always returns 500. Pages 4 and 5 still work and are linked from the bar on page 2.',
  'Paginate. Give up on page 3 after a retry or two, and carry on to page 4.',
  {
    intercept: (c, i) => (i === 2 ? errorPage(c, 500, 'Internal Server Error', 'This page is broken.') : undefined),
    answerPatch: (a) => ({ ...a, expectedRecordIds: allIds(47, range(10).map((k) => 21 + k)), expectedBehaviour: 'Skip page 3 (records p-000021…p-000030 are unavailable). Pages 4–5 must still be collected.' }),
  })

I('I03', '429 with Retry-After', 'More than 2 requests per second in a run returns 429 with Retry-After: 1.',
  'Paginate at most 2 requests per second, or honour Retry-After when you get a 429.',
  {
    extra: 10,
    intercept: (c) => {
      const now = Date.now()
      c.state.hits = (c.state.hits ?? []).filter((t) => now - t < 1000)
      if (c.state.hits.length >= 2) return errorPage(c, 429, 'Too Many Requests', 'Slow down: 2 requests per second per run.', { 'Retry-After': '1' })
      c.state.hits.push(now)
    },
    answerPatch: (a) => ({ ...a, expectedBehaviour: 'Honour Retry-After (1 s) on 429 and retry the same page. Retries count towards extraRequestsAllowed.' }),
  })

I('I04', '503 maintenance, first request only', 'The first request of a run returns 503 with Retry-After: 2. Everything after that works.',
  'Wait the Retry-After seconds, retry, then paginate normally.',
  {
    intercept: (c) => (!c.state.seen ? ((c.state.seen = true), errorPage(c, 503, 'Service Unavailable', 'Down for maintenance.', { 'Retry-After': '2' })) : undefined),
    answerPatch: (a) => ({ ...a, expectedBehaviour: 'Honour Retry-After: 2 on the first 503, then continue.' }),
  })

I('I05', 'Slow pages', 'Every page takes 1.5 s by default. Add ?delay=ms (0–8000) to the entry URL to change it; the delay is carried into every link.',
  'Paginate with a timeout above the delay, and in parallel if you like.',
  {
    delayFor: (c) => (c.sticky.delay ? Number(c.sticky.delay) : 1500),
    pagination: { param: 'page', delayMs: 1500, delayParam: 'delay (0–8000)' },
  })

const I06_DELAYS = [0, 2500, 0, 1200, 300]
I('I06', 'Out-of-order latency', `Page latencies differ: ${I06_DELAYS.map((d, k) => `page ${k + 1} ${d} ms`).join(', ')}. Parallel fetches complete out of order.`,
  'Fetch pages in parallel, then reassemble them in page order.',
  { delayFor: (c, i) => I06_DELAYS[i] ?? 0, pagination: { param: 'page', delaysMs: I06_DELAYS } })

I('I07', 'Duplicates across pages (item inserted)', 'Once page 1 has been served in a run, a new item (p-000000) is inserted at the top. Everything shifts down one place, so page 2 starts with p-000010 again.',
  'Paginate and de-duplicate by id.',
  {
    totalFor: (c) => (c.state.shifted ? 48 : 47),
    recordsFor: (c, from, ps, total) => {
      if (!c.state.shifted) {
        if (from === 0) c.state.shifted = true
        return records('I07', from, ps, 47)
      }
      return range(ps).map((j) => from + j).filter((k) => k < total).map((k) => record('I07', k))
    },
    answerPatch: (a) => ({ ...a, expectedBehaviour: 'p-000010 is served twice (end of page 1, start of page 2). Collect each id once; p-000000 only appears if page 1 is re-fetched.' }),
  })

I('I08', 'Missing records across pages (item deleted)', 'Once page 1 has been served in a run, p-000003 is deleted. Everything shifts up one place, so p-000011 is never on any page you request next.',
  'Paginate. Note that offset pagination silently skips p-000011 here.',
  {
    totalFor: (c) => (c.state.shifted ? 46 : 47),
    recordsFor: (c, from, ps, total) => {
      if (!c.state.shifted) {
        if (from === 0) c.state.shifted = true
        return records('I08', from, ps, 47)
      }
      return range(ps).map((j) => from + j).filter((k) => k < total).map((k) => record('I08', k < 2 ? k + 1 : k + 2))
    },
    answerPatch: (a) => ({ ...a, expectedRecordIds: allIds(47, [11]), missedRecordIds: ['p-000011'], expectedBehaviour: 'p-000011 shifts onto page 1 after page 1 was fetched, so a single forward pass misses it.' }),
  })

function shuffled(total, seed) {
  const ids = range(total).map((k) => k + 1)
  const r = rng(seed)
  for (let k = ids.length - 1; k > 0; k--) {
    const j = Math.floor(r() * (k + 1))
    ;[ids[k], ids[j]] = [ids[j], ids[k]]
  }
  return ids
}
I('I09', 'Unstable ordering unless sort is given', 'Without a sort param every request reshuffles the list, so pages overlap and miss records. With ?sort=id the order is stable.',
  'Add sort=id: /list?sort=id&page=N.',
  {
    url: (i, c) => (c?.query.get('sort') === 'id' ? `/list?sort=id&page=${i + 1}` : `/list?page=${i + 1}`),
    answerUrl: (i) => `/list?sort=id&page=${i + 1}`, entryPath: '/list?page=1',
    parse: onPath('/list', (c) => (c.query.has('sort') && c.query.get('sort') !== 'id' ? badRequest('sort must be id') : pageNum(c, 'page'))),
    recordsFor: (c, from, ps, total) => {
      if (c.query.get('sort') === 'id') return records('I09', from, ps, total)
      c.state.n = (c.state.n ?? 0) + 1
      return shuffled(total, hash32(`${c.run}:${c.state.n}`)).slice(from, from + ps).map((n) => record('I09', n))
    },
    pagination: { param: 'page', stabiliser: 'sort=id' },
    answerPatch: (a) => ({ ...a, expectedBehaviour: 'Use sort=id. Unsorted pages are reshuffled on every request.' }),
  })

I('I10', 'Redirect chain', '/list?page=2 → 301 /list/2 → 301 /list/2/. The bar still links the old ?page= form.',
  'Follow redirects (two hops per page).',
  {
    end: 'H01',
    parse: (c) => {
      if (c.path === '/list') {
        const i = pageNum(c, 'page')
        return isResponse(i) ? i : redirect(c.link(`/list/${i + 1}`), 301)
      }
      const m = c.path.match(/^\/list\/(\d{1,7})(\/?)$/)
      if (!m) return undefined
      return m[2] ? Number(m[1]) - 1 : redirect(c.link(`/list/${m[1]}/`), 301)
    },
    answerHops: (i) => [`/list?page=${i + 1}`, `/list/${i + 1}`, `/list/${i + 1}/`],
    answerPatch: (a, A) => ({ ...a, endProbe: { request: A.abs('/list/6/'), expectStatus: 404, expectRecords: 'none' }, expectedBehaviour: 'Follow both 301 hops for every page.' }),
  })

I('I11', 'Redirect loop on one page', 'Page 3 bounces forever between /list?page=3 and /list?page=3&loop=1 (302).',
  'Cap redirect hops, give up on page 3, and continue to page 4 from the bar.',
  {
    extra: 12,
    intercept: (c, i) => (i === 2 ? redirect(c.link(c.query.has('loop') ? '/list?page=3' : '/list?page=3&loop=1'), 302) : undefined),
    answerPatch: (a) => ({ ...a, expectedRecordIds: allIds(47, range(10).map((k) => 21 + k)), expectedBehaviour: 'Detect the loop (or cap hops), skip page 3 and collect pages 4–5.' }),
  })

I('I12', 'Very large page count (10,000 pages)', '100,000 records, 10 per page. Use this to test your page caps and limits; nobody should crawl all of it by accident.',
  'Paginate with a page cap.',
  {
    total: 100000, end: 'H01',
    answerPatch: (a, A) => ({
      ...a, expectedRequests: [A.abs('/list?page=1'), A.abs('/list?page=10000')], expectedRecordIds: null, expectedRecordCount: 100000,
      notes: 'A full crawl is 10,000 requests. expectedRequests lists only the first and last pages, and expectedRecordIds is replaced by expectedRecordCount. Record ids run from p-000001 to p-100000.',
    }),
  })

let filler
const FILLER = () => (filler ??= `<div class="filler" hidden aria-hidden="true">${'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod. '.repeat(70000)}</div>`)
I('I13', 'Huge page (5 MB HTML)', 'Page 2 is about 5 MB: a normal page plus a hidden filler block outside the record list.',
  'Paginate with a response size limit high enough, or handle the oversized page.',
  { after: (c, p) => (p.i === 1 ? '\n' + FILLER() : ''), pagination: { param: 'page', hugePage: 2, approxBytes: 5_000_000 } })

I('I14', 'Malformed HTML on one page', 'Page 3 has unclosed tags, stray closing tags and no </body>. Lenient parsers still find every record.',
  'Paginate with an HTML parser that tolerates broken markup.',
  {
    respond: (c, p) => {
      if (p.i !== 2) return respondHtml(c, p)
      const items = p.recs.map((r) => `<li class="card" data-id="${r.id}"><a href="${esc(c.link('/item/' + r.id))}"><h3 class="title">${esc(r.title)}</a><p class="price" data-price="${r.price}">₹${r.price}<p class="category">${esc(r.category)}`).join('\n')
      return html(`<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8"><title>Malformed page 3</title></head>\n<body><div class="wrap"><main id="main"><h1>Malformed page<ul id="records" class="cards">\n${items}\n</span></div>${navBar(c, p.i, p.pages, p.url)}</table>\n`)
    },
  })

I('I15', 'Cookie/session required', 'Page 1 sets a pg_session cookie. Pages 2+ return 403 without it.',
  'Keep cookies from page 1 for the rest of the crawl.',
  {
    headers: (c, p) => (p.i === 0 ? { 'Set-Cookie': `pg_session=s${hash32(c.run)}; Path=${c.root}; SameSite=Lax; HttpOnly` } : {}),
    intercept: (c, i) => (i > 0 && c.cookies.pg_session !== `s${hash32(c.run)}` ? errorPage(c, 403, 'Forbidden', 'Session required: open page 1 first so the pg_session cookie is set.') : undefined),
    pagination: { param: 'page', cookie: 'pg_session (set by page 1)' },
  })

I('I16', 'Required request header', 'A JSON API that returns 401 unless you send X-Requested-With: XMLHttpRequest (or X-Api-Key: playground-demo-key).',
  'Send the header on every request: /api/items?page=N.',
  {
    format: 'json', nav: 'none', url: (i) => `/api/items?page=${i + 1}`, parse: onPath('/api/items', (c) => pageNum(c, 'page')),
    requestHeaders: { 'X-Requested-With': 'XMLHttpRequest' },
    intercept: (c) => (c.headers['x-requested-with'] === 'XMLHttpRequest' || c.headers['x-api-key'] === 'playground-demo-key' ? undefined : json({ error: 'unauthorized', message: 'Send X-Requested-With: XMLHttpRequest or X-Api-Key: playground-demo-key' }, 401)),
    respond: (c, p) => json({ data: p.recs, page: p.i + 1, totalPages: p.pages }), recordsText: jsonRec('data[]'),
  })

I('I17', 'robots.txt disallows pages above 5', '100 records, 10 pages. /robots.txt disallows /pagination/s/I17/list?page=6 to page=10, even though the bar links them.',
  'Read /robots.txt and skip disallowed URLs.',
  {
    total: 100, end: 'H01',
    answerPatch: (a, A) => ({
      ...a, expectedRequests: a.expectedRequests.slice(0, 5), expectedRecordIds: allIds(50), endProbe: null,
      mustNotRequest: [6, 7, 8, 9, 10].map((n) => A.abs(`/list?page=${n}`)), robotsTxt: '/robots.txt',
      expectedBehaviour: 'Respect robots.txt: collect pages 1–5 (50 records) only.',
    }),
  })

I('I18', 'Canonical URL differs from the requested URL', 'Bar links carry ref= and sessionid= params. Each page declares the clean URL in <link rel="canonical">.',
  'Follow the bar. Either use the canonical URL or ignore ref and sessionid.',
  {
    entryPath: '/list?page=1&ref=home', ignoreParams: ['ref', 'sessionid'],
    head: (c, p) => `<link rel="canonical" href="${esc(c.base + c.root + p.url(p.i))}">\n`,
    navHtml: (c, p) => navBar(c, p.i, p.pages, (k) => `/list?page=${k + 1}&ref=pager&sessionid=abc123`),
    pagination: { param: 'page', canonical: 'link[rel=canonical]', ignorableParams: ['ref', 'sessionid'] },
  })

I('I19', 'Mixed http/https and www links', 'The bar mixes http://, https://www. and relative links to the same pages.',
  'Normalise links to the entry URL\'s scheme and host before de-duplicating.',
  {
    navHtml: (c, p) => {
      const host = c.host.replace(/^www\./, '')
      const mixed = { ...c, link: (rel) => { const n = Number(rel.match(/page=(\d+)/)[1]); const l = c.link(rel); return n % 3 === 0 ? `http://${host}${l}` : n % 3 === 1 ? `https://www.${host}${l}` : l } }
      return navBar(mixed, p.i, p.pages, p.url)
    },
    pagination: { param: 'page', mixedOrigins: ['http://host', 'https://www.host', 'relative'] },
    answerPatch: (a) => ({ ...a, notes: 'Requests are compared on path and query only. The www. host may not resolve: normalise to the entry host.' }),
  })

const I20_Q = 'chaussures été'
I('I20', 'Non-ASCII / encoded params', 'The query is ?q=chaussures%20%C3%A9t%C3%A9. Double-encoding or mangling it returns 0 results.',
  'Keep q exactly as encoded in the entry URL while changing page.',
  {
    url: (i) => `/search?q=${encodeURIComponent(I20_Q)}&page=${i + 1}`,
    parse: onPath('/search', (c) =>
      c.query.get('q') === I20_Q ? pageNum(c, 'page') : html(page(c, { title: 'No results', body: `<h1>Search</h1>\n<p class="no-results">0 results for “${esc(c.query.get('q') ?? '')}”.</p>` }))),
    pagination: { param: 'page', q: I20_Q, encoded: encodeURIComponent(I20_Q) },
  })

I('I21', 'Bar advertises page 6, which is 404', 'The bar and "Page X of 6" promise six pages, but only 5 exist: /list?page=6 is a real 404 Not Found.',
  'Follow the bar; treat the 404 on page 6 as the end, not as a failure to retry.',
  {
    end: 'H01', variants: false, nav: 'custom',
    before: (c, { i, pages }) => `<p class="page-info">Page ${i + 1} of ${pages + 1}</p>\n`,
    navHtml: (c, { i, pages, url }) => navBar(c, i, pages + 1, url),
  })

add(endless({
  id: 'I22', category: 'faults', title: 'Never-ending pages that repeat', kind: 'page-query-cycle', nav: 'next', ...pageQuery('/list'),
  description: 'Page 6 is page 1 again, page 7 is page 2 … forever, each with a Next link. Only the 47 records of pages 1–5 exist.',
  howTo: 'Paginate and stop when a whole page brings no new ids (or at your page cap).',
  recordsFor: (c, from, ps) => records('I22', ((from / ps) % 5) * ps, ps, 47),
  pagination: { param: 'page', cycleLength: 5, endless: true },
  answerPatch: (a) => ({ ...a, expectedRecordIds: allIds(47), expectedBehaviour: 'Pages repeat every 5. Stop once a page brings no new ids; page 6 is the earliest sensible stop.' }),
}))

/* ═════════ J. Combined, real-world scenarios ═════════ */

const SORTS = {
  price_asc: (a, b) => a.price - b.price || a.id.localeCompare(b.id),
  price_desc: (a, b) => b.price - a.price || a.id.localeCompare(b.id),
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
}
const sortedJ01 = (sort) => records('J01', 0, 47, 47).sort(SORTS[sort])

add(paged({
  id: 'J01', category: 'combined', title: 'E-commerce category with filters, sort and detail pages', kind: 'listing-detail',
  description: 'A category page with a brand filter, a sort selector and a numbered bar. Each card links to a detail page (article.detail).',
  howTo: 'Start at /category/shoes?brand=acme&sort=price_asc&page=1, follow the bar, and open every card\'s detail link.',
  recordsText: `listing: ${HTML_REC}; detail: article.detail[data-id] → h1, .price, .description, dl.specs`,
  pagination: { param: 'page', keep: ['brand', 'sort'], detail: '.card a[href]' },
  url: (i, c) => `/category/shoes?brand=${c?.query.get('brand') ?? 'acme'}&sort=${c?.query.get('sort') ?? 'price_asc'}&page=${i + 1}`,
  parse: onPath('/category/shoes', (c) => {
    if (c.query.has('sort') && !SORTS[c.query.get('sort')]) return badRequest('sort must be price_asc, price_desc or newest')
    if (c.query.has('brand') && !/^[a-z]{1,20}$/.test(c.query.get('brand'))) return badRequest('invalid brand')
    return pageNum(c, 'page')
  }),
  recordsFor: (c, from, ps) => sortedJ01(c.query.get('sort') ?? 'price_asc').slice(from, from + ps),
  before: (c) => {
    const sort = c.query.get('sort') ?? 'price_asc', brand = c.query.get('brand') ?? 'acme'
    const opt = (v, label, cur) => `<option value="${v}"${v === cur ? ' selected' : ''}>${label}</option>`
    const hidden = Object.entries(c.sticky).filter(([, v]) => v).map(([k, v]) => `<input type="hidden" name="${k}" value="${esc(v)}">`).join('')
    return `<form class="filters" method="get" action="${c.root}/category/shoes">
<label>Brand <select name="brand">${opt('acme', 'Acme', brand)}${opt('zenith', 'Zenith', brand)}</select></label>
<label>Sort by <select name="sort">${opt('price_asc', 'Price: low to high', sort)}${opt('price_desc', 'Price: high to low', sort)}${opt('newest', 'Newest', sort)}</select></label>
<input type="hidden" name="page" value="1">${hidden}<button type="submit">Apply</button>
</form>\n`
  },
  answerPatch: (a, A) => ({
    ...a, expectedRequests: [...a.expectedRequests, ...sortedJ01('price_asc').map((r) => A.abs('/item/' + r.id))],
    expectedBehaviour: 'Collect the 5 listing pages, then the 47 detail pages linked from the cards.',
  }),
}))

add({
  id: 'J02', category: 'combined', title: 'Job board: offset API returning HTML fragments', kind: 'see-more-fragments', total: 47, client: 'http',
  description: 'The board renders 10 jobs. "See more jobs" calls /jobs/more?offset=N, which returns bare <li class="card"> fragments plus an X-Next-Offset header.',
  howTo: 'GET /jobs, then GET /jobs/more?offset=10, 20 … following X-Next-Offset until it is missing (X-Has-More: false).',
  endText: 'The last fragment response has X-Has-More: false and no X-Next-Offset.', recordsText: `${HTML_REC} (page and fragments)`,
  pagination: { button: 'button.see-more', xhr: '/jobs/more?offset=N', header: 'X-Next-Offset' },
  entryPath: '/jobs',
  handle(ctx) {
    if (ctx.path === '/jobs/more') {
      const k = offsetNum(ctx, 'offset')
      if (isResponse(k)) return k
      const off = k * 10
      const more = off + 10 < 47
      return html(cards(ctx, records('J02', off, 10, 47)), 200, more ? { 'X-Next-Offset': String(off + 10), 'X-Has-More': 'true' } : { 'X-Has-More': 'false' })
    }
    if (ctx.path !== '/jobs') return
    return shell(ctx, {
      title: 'Jobs', body: `<h1>Latest jobs</h1>\n${list(ctx, records('J02', 0, 10, 47))}\n<button type="button" class="see-more" data-offset="10">See more jobs</button>`,
      script: `
const btn = document.querySelector('.see-more');
btn.addEventListener('click', async () => {
  btn.disabled = true;
  const r = await fetch(u('/jobs/more?offset=' + btn.dataset.offset), { headers: PG.run ? { 'X-Run-Id': PG.run } : {} });
  document.getElementById('records').insertAdjacentHTML('beforeend', await r.text());
  const next = r.headers.get('X-Next-Offset');
  if (next) { btn.dataset.offset = next; btn.disabled = false; } else btn.remove();
});`,
    })
  },
  answer: (A) => ({ expectedRequests: [A.abs('/jobs'), ...[10, 20, 30, 40].map((o) => A.abs(`/jobs/more?offset=${o}`))], uiActions: [{ action: 'click', selector: 'button.see-more', times: 4 }] }),
})

add(paged({
  id: 'J03', category: 'combined', title: 'News archive: date path + "Older posts"', kind: 'date-path', end: 'H01', nav: 'custom',
  description: 'A monthly archive at /2024/05/ with WordPress-style /page/N/ and an "Older posts ›" link. The year and month are not counters.',
  howTo: 'Start at /2024/05/ and follow a.older until it disappears.',
  pagination: { selector: 'a.older', template: '/2024/05/page/{n}/' },
  url: (i) => (i === 0 ? '/2024/05/' : `/2024/05/page/${i + 1}/`),
  parse: (c) => {
    if (c.path === '/2024/05') return redirect(c.link('/2024/05/'), 301)
    if (c.path === '/2024/05/') return 0
    const m = c.path.match(/^\/2024\/05\/page\/(\d{1,7})\/$/)
    if (!m) return undefined
    return m[1] === '1' ? redirect(c.link('/2024/05/'), 301) : Number(m[1]) - 1
  },
  heading: 'Archive: May 2024',
  navHtml: (c, { i, pages, url }) =>
    nav((i > 0 ? `<a class="newer" rel="prev" href="${esc(c.link(url(i - 1)))}">‹ Newer posts</a> ` : '') + (i < pages - 1 ? `<a class="older" rel="next" href="${esc(c.link(url(i + 1)))}">Older posts ›</a>` : '')),
}))

add(paged({
  id: 'J04', category: 'combined', title: 'Forum thread: pages, last-page jump and per-page selector', kind: 'forum-thread', end: 'H01', nav: 'custom',
  description: 'A 47-post thread. The bar has a "Last »" jump, and a selector switches between 10, 20 and 50 posts per page (?per=).',
  howTo: 'Start at /thread/42?page=1 and follow the bar. Or pick per=50 to fetch the whole thread in one page.',
  pagination: { param: 'page', perPageParam: 'per', perPageOptions: [10, 20, 50], last: 'a.last' },
  url: (i, c) => {
    const per = c?.query.get('per')
    return per && per !== '10' ? `/thread/42?page=${i + 1}&per=${per}` : `/thread/42?page=${i + 1}`
  },
  parse: onPath('/thread/42', (c) => pageNum(c, 'page')),
  pageSizeFor: (c) => {
    const per = c.query.get('per') ?? '10'
    return ['10', '20', '50'].includes(per) ? Number(per) : badRequest('per must be 10, 20 or 50')
  },
  heading: 'Thread #42: Which kurta fabric breathes best?',
  navHtml: (c, { i, pages, url }) => {
    const per = (n) => `<a class="per-page" href="${esc(c.link(`/thread/42?page=1${n === 10 ? '' : `&per=${n}`}`))}">${n}</a>`
    return navBar(c, i, pages, url) + (i < pages - 1 ? nav(`<a class="last" href="${esc(c.link(url(pages - 1)))}">Last »</a>`) : '') + `<p class="per-page-selector">Posts per page: ${per(10)} ${per(20)} ${per(50)}</p>`
  },
  answerPatch: (a, A) => ({ ...a, alternatives: [{ description: 'One page with per=50', expectedRequests: [A.abs('/thread/42?page=1&per=50')] }] }),
}))

add(cursorScenario({
  id: 'J05', category: 'combined', client: 'browser', title: 'Search results: cursor API behind infinite scroll', kind: 'cursor-infinite-scroll',
  path: '/search/api?q=lamp', param: 'cursor', entryPath: '/search?q=lamp',
  description: 'The results page infinite-scrolls. Behind it, /search/api?q=lamp&cursor=… returns { results, nextCursor }.',
  howTo: 'Scroll /search?q=lamp to the end, or call /search/api?q=lamp and follow nextCursor until it is null.',
  endText: 'nextCursor is null; #sentinel gets class "end".', recordsText: `${HTML_REC} (rendered by JavaScript); XHR: ${jsonRec('results[]')}`,
  pagination: { xhr: '/search/api?q=lamp&cursor=…', field: 'nextCursor', sentinel: '#sentinel' },
  check: (c) => (c.query.get('q') === 'lamp' ? undefined : badRequest('q must be lamp')),
  encode: (off) => opaque('J05', off), decode: opaqueDecode('J05'),
  respond: (c, recs, next, nextUrl) => json({ results: recs, nextCursor: next, next: next ? nextUrl(next) : null }),
  answerPrefix: (A) => [A.abs('/search?q=lamp')],
  routes: (ctx) =>
    ctx.path === '/search'
      ? shell(ctx, {
          title: 'Search: lamp', body: '<h1>Results for “lamp”</h1>\n<ul id="records" class="cards"></ul>\n<div id="sentinel" aria-live="polite">Loading…</div>',
          script: `
const listEl = document.getElementById('records'), sentinel = document.getElementById('sentinel');
let next = u('/search/api?q=lamp'), busy = false;
const io = new IntersectionObserver(async (entries) => {
  if (!entries[0].isIntersecting || busy || !next) return;
  busy = true;
  const d = await getJSON(next);
  listEl.insertAdjacentHTML('beforeend', d.results.map(card).join(''));
  next = d.next; busy = false;
  if (!next) { io.disconnect(); sentinel.textContent = 'No more results.'; sentinel.classList.add('end'); }
  else { io.unobserve(sentinel); io.observe(sentinel); }
});
io.observe(sentinel);`,
        })
      : undefined,
}))

add(past404({
  id: 'J06', category: 'combined', title: 'Search results with sort: page 6 returns 404', kind: 'page-query',
  description: 'A search for "kurta" sorted by newest, with a numbered bar. q and sort must be kept; ?page=6 (or higher) is a real 404 Not Found document.',
  howTo: 'Start at /search?q=kurta&sort=newest&page=1, follow the bar, and keep q and sort. Page 6 is 404.',
  pagination: { param: 'page', keep: ['q', 'sort'] },
  url: (i) => `/search?q=kurta&sort=newest&page=${i + 1}`,
  parse: onPath('/search', (c) => (c.query.get('q') === 'kurta' && c.query.get('sort') === 'newest' ? pageNum(c, 'page') : badRequest('q must be kurta and sort newest'))),
}))

add(endless({
  id: 'J07', category: 'combined', title: 'News feed whose "Older posts" never runs out', kind: 'path-keyword-endless', nav: 'custom',
  url: (i) => `/news/page/${i + 1}/`, parse: pathNum(/^\/news\/page\/(\d{1,7})\/$/),
  description: 'A news feed at /news/page/N/ where every page has an "Older posts ›" link, forever.',
  howTo: 'Start at /news/page/1/ and follow a.older, but stop at your own page cap.',
  heading: 'Latest news', pagination: { selector: 'a.older', template: '/news/page/{n}/', endless: true },
  navHtml: (c, { i, url }) => nav(`<a class="older" rel="next" href="${esc(c.link(url(i + 1)))}">Older posts ›</a>`),
}))

/* ── finalise ───────────────────────────────────────────────────────── */

for (const sc of S) {
  sc.variants ??= false
  sc.client ??= 'http'
  sc.total ??= 47
  sc.entryPath ??= '/'
  sc.recordsText ??= sc.format === 'json' ? jsonRec('data[]') : HTML_REC
  sc.endText ??= sc.end ? END_TEXT[sc.end] : ''
}

export const SCENARIOS = S
export const BY_ID = Object.fromEntries(S.map((s) => [s.id, s]))
