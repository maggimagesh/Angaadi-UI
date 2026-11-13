/*
 * CRAWLER TEST FIXTURE: /loop-detected — a page that never finishes loading.
 *
 * The response is streamed and never completed while the page is open, so the
 * HTML parser never reaches the end of the document:
 *   - DOMContentLoaded and load never fire (document.readyState stays "loading")
 *   - the document request is always in flight, so the network is never idle
 *
 * A serverless function cannot hold a response open forever, so every
 * `cycleMs` the stream writes an inline script that navigates to the same URL.
 * The next response commits before this one is closed, which replaces the
 * document without it ever finishing. That repeats indefinitely; the iteration
 * count is kept in sessionStorage, so the URL stays clean.
 *
 * `/loop-detected/status` (or `?status=1`) answers 508 Loop Detected as JSON;
 * the page fetches it and shows the result.
 *
 * Shared by the Vercel function (api/loop-detected.js) and the Vite dev and
 * preview servers (vite.config.ts).
 */

// Vercel Hobby functions may be stopped after 10 s, so a cycle plus its grace
// period stays under that.
export const DEFAULTS = {
  cycleMs: Number(process.env.LOOP_CYCLE_MS) || 6000,
  heartbeatMs: 1000,
  graceMs: 3000,
}

export const LOOP_STATUS = {
  status: 'Loop Detected',
  code: 508,
  message: 'The server detected an infinite loop while processing the request.',
  hint: 'This page never finishes loading: no DOMContentLoaded, no load, no network idle.',
}

const PADDING = `<!--${' '.repeat(2048)}-->\n` // makes every browser render the first chunk at once

const HEAD = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Loop Detected</title>
<style>
  :root { color-scheme: light dark; --bg: #fff8f3; --text: #2a1d14; --muted: #6b5a4e; --card: #fff; --line: #ead9cc; --accent: #b4441f; --bad: #c0392b; }
  @media (prefers-color-scheme: dark) { :root { --bg: #1b1410; --text: #f4e9e1; --muted: #b9a596; --card: #261c16; --line: #3d2f26; --accent: #f08a5d; --bad: #ff7b6b; } }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  .container { min-height: 100vh; max-width: 720px; margin: 0 auto; padding: 32px 16px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 24px; text-align: center; }
  h1 { margin: 0; font-size: clamp(28px, 7vw, 44px); color: var(--accent); }
  .box { width: 100%; padding: 32px; border-radius: 16px; background: var(--card); border: 1px solid var(--line); }
  .iteration { font-size: 48px; font-weight: 800; margin-bottom: 12px; font-variant-numeric: tabular-nums; }
  .box p { margin: 0; color: var(--muted); }
  .api { width: 100%; text-align: left; padding: 24px; border-radius: 16px; background: var(--card); border: 1px solid var(--line); }
  .api h2 { margin: 0 0 12px; font-size: 20px; display: flex; align-items: center; gap: 8px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--bad); display: inline-block; }
  pre { margin: 0; overflow: auto; padding: 16px; border-radius: 8px; background: var(--bg); border: 1px solid var(--line); font-size: 13px; }
  .footer { font-size: 12px; text-transform: uppercase; letter-spacing: .14em; color: var(--muted); }
</style>
<script>
  (function () {
    var key = 'loopIterationCount', n = 0;
    try { n = parseInt(sessionStorage.getItem(key) || '0', 10) || 0; sessionStorage.setItem(key, String(n + 1)); } catch (e) {}
    window.__loopIteration = n;
  })();
  function __loopTick(s) { var el = document.getElementById('loop-elapsed'); if (el) el.textContent = String(s); }
  function __loopNext() { location.replace(location.href); }
</script>
</head>
<body>
${PADDING}<div class="container" data-testid="loop-detected">
  <h1>AUTOMATIC LOOP DETECTED</h1>
  <div class="box">
    <div class="iteration" id="loop-iteration">Iteration: 0</div>
    <script>document.getElementById('loop-iteration').textContent = 'Iteration: ' + window.__loopIteration;</script>
    <p>Clean URL Mode (no query params). Looping indefinitely&hellip; this load: <span id="loop-elapsed">0</span>s</p>
  </div>
  <div class="api" id="loop-api" hidden>
    <h2><span class="dot"></span><span id="loop-api-title">Last API Status:</span></h2>
    <pre id="loop-api-body"></pre>
  </div>
  <script>
    fetch('/loop-detected/status', { cache: 'no-store' })
      .then(function (r) { return r.json().then(function (d) { return { status: r.status, data: d }; }); })
      .catch(function (e) { return { status: 'error', data: { error: 'Failed to fetch API', details: String(e) } }; })
      .then(function (res) {
        document.getElementById('loop-api-title').textContent = 'Last API Status: ' + res.status;
        document.getElementById('loop-api-body').textContent = JSON.stringify(res.data, null, 2);
        document.getElementById('loop-api').hidden = false;
      });
  </script>
  <div class="footer">System Status: 508 Loop Detected | Mode: Autonomous | URL: Clean</div>
</div>
`

function isStatusRequest(req) {
  const url = new URL(req.url || '/', 'http://localhost')
  return /\/status\/?$/.test(url.pathname) || url.searchParams.has('status')
}

export function handle(req, res, options = {}) {
  const { cycleMs, heartbeatMs, graceMs } = { ...DEFAULTS, ...options }

  if (isStatusRequest(req)) {
    res.statusCode = 508
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.end(JSON.stringify(LOOP_STATUS))
    return
  }

  res.statusCode = 200
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store, no-transform')
  res.setHeader('X-Accel-Buffering', 'no') // stop proxies from holding chunks back
  res.setHeader('X-Robots-Tag', 'noindex')
  res.write(HEAD)

  const started = Date.now()
  let tick = 0
  let navigated = false
  const timer = setInterval(() => {
    const elapsed = Date.now() - started
    tick += 1
    res.write(`<script>__loopTick(${tick})</script>\n`)
    if (!navigated && elapsed >= cycleMs) {
      navigated = true
      res.write('<script>__loopNext()</script>\n')
    }
    // Only reached if the next request never arrives (e.g. JavaScript is off).
    if (elapsed >= cycleMs + graceMs) stop(true)
  }, heartbeatMs)

  function stop(end) {
    clearInterval(timer)
    if (end && !res.writableEnded) res.end('</body></html>')
  }
  // The browser dropped the connection because the next load replaced this one.
  req.on('close', () => stop(false))
  res.on('close', () => stop(false))
}
