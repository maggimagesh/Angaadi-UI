/*
 * CRAWLER TEST FIXTURE — /bad-request  and  /bad-request/<n>
 *
 * Vercel serverless function (same mechanism as api/slow-loading.js). The SPA
 * catch-all in vercel.json serves every route as the index.html shell with
 * HTTP 200, so a React route can never make the *document* response a 400 — it
 * can only 200, then fire an in-app fetch that 400s. A crawler (or curl) that
 * opens the URL directly, without running JS, would just see the 200 shell.
 *
 * This function fixes that by serving the pages server-side:
 *   • GET /bad-request        -> 200, HTML catalogue of 100 same-origin links
 *                                to /bad-request/<1..100> (links live in the
 *                                raw HTML so static + dynamic crawls match).
 *   • GET /bad-request/<n>     -> 400 Bad Request, as the actual document
 *                                status. No JS, no in-app fetch — opening the
 *                                URL directly throws 400.
 *
 * Wired up by the /bad-request and /bad-request/:id rewrites in vercel.json,
 * which must sit BEFORE the SPA catch-all so they win.
 */

const LINK_COUNT = 100
const methods = ['GET', 'POST', 'HEAD', 'PUT', 'DELETE']

const STYLE = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
         font-size: 14px; line-height: 1.65; color: #1c1b1f; background: #f7f2f9; }
  .top-band { background: #b3261e; color: #fff; text-align: center; padding: 7px 16px; font-size: 13px; }
  .wrap { max-width: 960px; margin: 0 auto; padding: 24px 16px 64px; }
  h1 { font-size: 22px; margin-bottom: 6px; }
  h2 { font-size: 16px; margin: 22px 0 8px; padding-bottom: 3px; border-bottom: 2px solid #f9dedc; }
  p { margin: 8px 0; }
  .meta { color: #4a4458; font-size: 13px; margin-bottom: 4px; }
  .endpoints { list-style: none; }
  .ep { padding: 4px 0; border-bottom: 1px solid #e4d9ea; }
  .m { display: inline-block; min-width: 52px; font-weight: 700; color: #b3261e; }
  a { color: #6750a4; font-weight: 600; text-decoration: none; }
  .note { color: #4a4458; font-style: italic; margin-left: 6px; font-size: 12px; }
  .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-weight: 700; color: #fff; background: #b3261e; }
  hr { border: none; border-top: 1px solid #d8cfe5; margin: 16px 0; }
`

function shell(title, inner) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex" />
  <title>${title}</title>
  <style>${STYLE}</style>
</head>
<body>
  <div class="top-band">Angaadi Research Portal &nbsp;|&nbsp; Crawler QA &nbsp;|&nbsp; HTTP 400 Fixture</div>
  <div class="wrap">
${inner}
  </div>
</body>
</html>
`
}

function linkRow(n) {
  const href = `/bad-request/${n}`
  const method = methods[n % methods.length]
  return (
    `        <li class="ep">` +
    `<code class="m">${method}</code> ` +
    `<a href="${href}">${href}</a>` +
    `<span class="note">— UI endpoint #${n}, opens directly to <strong>400 Bad Request</strong></span>` +
    `</li>`
  )
}

function indexHtml() {
  const sections = []
  for (let s = 0; s < LINK_COUNT / 10; s++) {
    const rows = []
    for (let i = 1; i <= 10; i++) rows.push(linkRow(s * 10 + i))
    sections.push(
      `      <section class="batch">\n` +
        `        <h2>Batch ${s + 1} · endpoints ${s * 10 + 1}–${s * 10 + 10}</h2>\n` +
        `        <ul class="endpoints">\n${rows.join('\n')}\n        </ul>\n` +
        `      </section>`
    )
  }
  const inner =
    `    <p class="meta"><strong>Fixture:</strong> /bad-request &nbsp;·&nbsp; ` +
    `<strong>Links:</strong> ${LINK_COUNT} &nbsp;·&nbsp; <strong>Each opens to:</strong> 400 Bad Request</p>\n` +
    `    <h1>HTTP 400 Bad Request — Crawler Error-Handling Fixture</h1>\n` +
    `    <p>This page embeds ${LINK_COUNT} same-origin links, each pointing at ` +
    `<code>/bad-request/&lt;n&gt;</code>. Opening any of them directly returns ` +
    `<strong>HTTP 400 Bad Request</strong> as the document status — no JavaScript ` +
    `and no in-app fetch required, so static and dynamic crawls behave identically.</p>\n` +
    `    <hr />\n` +
    sections.join('\n')
  return shell('HTTP 400 Bad Request — Crawler Error-Handling Fixture', inner)
}

function detailHtml(id) {
  const n = Number(id)
  const method = methods[((Number.isFinite(n) ? n : 0) % methods.length + methods.length) % methods.length] || 'GET'
  const inner =
    `    <p class="meta"><a href="/bad-request">← Back to fixture index</a></p>\n` +
    `    <h1>Bad Request endpoint #${id}</h1>\n` +
    `    <p class="meta">UI endpoint: <code>/bad-request/${id}</code></p>\n` +
    `    <p class="meta">Nominal method: <code>${method}</code></p>\n` +
    `    <hr />\n` +
    `    <p><span class="badge">400 Bad Request</span></p>\n` +
    `    <p>This endpoint always responds <strong>400 Bad Request</strong> as the ` +
    `actual document status, for any HTTP method and any <code>&lt;n&gt;</code>. ` +
    `It exists so a crawler under test records a terminal, non-retryable client ` +
    `error without retry storms.</p>`
  return shell(`400 Bad Request — endpoint #${id}`, inner)
}

export default function handler(req, res) {
  const raw = req.query.id
  const id = Array.isArray(raw) ? raw[0] : raw

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')

  const isDetail = id !== undefined && id !== ''

  // HEAD: status only, no body.
  if (req.method === 'HEAD') {
    res.status(isDetail ? 400 : 200).end()
    return
  }

  if (isDetail) {
    res.status(400).send(detailHtml(id))
  } else {
    res.status(200).send(indexHtml())
  }
}
