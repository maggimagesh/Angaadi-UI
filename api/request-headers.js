/*
 * /request-headers — the HTTP request headers your browser sent, as one plain
 * HTML table. After manytools.org/http-html-text/http-request-headers.
 *
 * Vercel serverless function (same mechanism as api/bad-request.js). The SPA
 * catch-all would otherwise serve the React shell, which needs JavaScript and
 * shows a loader before anything appears. This function answers the page
 * request itself, so the table lists the headers of that navigation and is in
 * the raw HTML: no app chrome, and the table needs no JavaScript.
 *
 * Below it, a browser fingerprint after CreepJS (api/_fingerprint.js) is
 * filled in by one inline script; it never delays the table and sends nothing.
 *
 * Wired up by the /request-headers rewrite in vercel.json, which must sit
 * BEFORE the SPA catch-all so it wins.
 */

import { randomBytes } from 'node:crypto'
import { FINGERPRINT_SCRIPT } from './_fingerprint.js'

const STYLE = `
  :root { color-scheme: light dark; }
  body { margin: 16px; font: 14px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #8888; padding: 6px 10px; text-align: left; vertical-align: top; }
  thead th { background: #8882; }
  td { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; overflow-wrap: anywhere; }
  h2 { font-size: 16px; margin: 28px 0 8px; }
  h2 .hash { font-size: 12px; font-weight: 400; opacity: .65; }
  #fingerprint tbody th { width: 30%; }
  td.flag { color: #d33; font-weight: 600; }
`

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Vercel's edge forwards the request headers in a different order on every
// request (and lowercased), and adds its own. So the table shows the browser's
// headers in the order Chrome sends them, then the standard proxy headers, and
// leaves Vercel's internal ones out: some of them are credentials
// (x-vercel-oidc-token, x-vercel-proxy-signature) that must never be echoed.
const HIDDEN_HEADER = /^(x-vercel-|x-middleware-|x-matched-path$|x-invoke-|x-now-|strict-transport-security$|referrer-policy$|x-content-type-options$)/i

const BROWSER_ORDER = [
  'host', 'connection', 'cache-control', 'pragma', 'sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform',
  'upgrade-insecure-requests', 'user-agent', 'accept', 'sec-fetch-site', 'sec-fetch-mode', 'sec-fetch-user',
  'sec-fetch-dest', 'sec-fetch-storage-access', 'referer', 'accept-encoding', 'accept-language', 'cookie',
  'if-none-match', 'if-modified-since', 'priority',
]

const PROXY_HEADER = /^(x-forwarded-|x-real-ip$|forwarded$|via$|true-client-ip$|cf-|fly-)/i

function headerRank(name) {
  const lower = name.toLowerCase()
  if (PROXY_HEADER.test(lower)) return 2000
  const i = BROWSER_ORDER.indexOf(lower)
  return i === -1 ? 1000 : i
}

/** [name, value] pairs, internal headers removed, in a stable order. */
export function headerPairs(req) {
  const pairs = []
  if (Array.isArray(req.rawHeaders) && req.rawHeaders.length > 0) {
    for (let i = 0; i + 1 < req.rawHeaders.length; i += 2) {
      pairs.push([req.rawHeaders[i], req.rawHeaders[i + 1]])
    }
  } else {
    for (const [name, value] of Object.entries(req.headers || {})) {
      if (value === undefined) continue
      for (const item of Array.isArray(value) ? value : [value]) pairs.push([name, item])
    }
  }
  return pairs
    .filter(([name]) => !HIDDEN_HEADER.test(name))
    .map((pair, index) => ({ pair, index }))
    .sort((a, b) =>
      headerRank(a.pair[0]) - headerRank(b.pair[0]) ||
      // Same rank: unknown or proxy headers alphabetically; repeats keep their order.
      a.pair[0].toLowerCase().localeCompare(b.pair[0].toLowerCase()) ||
      a.index - b.index
    )
    .map(({ pair }) => pair)
}

export function renderPage(pairs, nonce = '') {
  const rows = pairs
    .map(
      ([name, value]) =>
        `<tr data-header="${escapeHtml(name.toLowerCase())}"><th scope="row">${escapeHtml(name)}</th><td>${escapeHtml(value)}</td></tr>`
    )
    .join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>HTTP request headers</title>
<style>${STYLE}</style>
</head>
<body>
<table id="request-headers-table" data-testid="request-headers-table">
<thead><tr><th scope="col">HTTP header</th><th scope="col">Value</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>
<div id="fingerprint" data-testid="fingerprint"></div>
<noscript><p>Turn on JavaScript to see the browser fingerprint below the headers.</p></noscript>
<script nonce="${escapeHtml(nonce)}">${FINGERPRINT_SCRIPT}</script>
</body>
</html>`
}

export default function handler(req, res) {
  // Personal to each visitor (IP, cookies), so nothing may cache it.
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  // Only this response's own inline script runs (plus the Blob worker it
  // spawns), and connect-src 'none' guarantees the fingerprint never leaves
  // the browser.
  const nonce = randomBytes(16).toString('base64')
  res.setHeader(
    'Content-Security-Policy',
    `default-src 'none'; script-src 'nonce-${nonce}'; worker-src blob:; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`
  )

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    res.status(405).send('Method not allowed')
    return
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8')

  if (req.method === 'HEAD') {
    res.status(200).end()
    return
  }

  res.status(200).send(renderPage(headerPairs(req), nonce))
}
