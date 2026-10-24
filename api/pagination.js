/*
 * CRAWLER TEST FIXTURE: /pagination/** (Pagination Playground)
 *
 * Vercel serverless function behind the /pagination rewrites in vercel.json
 * (they sit before the SPA catch-all so they win). Every scenario is served
 * server-side, so status codes, redirects, Link headers and POST bodies are
 * real, not simulated by the SPA. The implementation lives in api/_pagination/
 * (underscore = not a function of its own); `npm run dev` serves the same
 * handler through a Vite middleware.
 */
import { handle } from './_pagination/app.js'

export default function handler(req, res) {
  return handle(req, res)
}
