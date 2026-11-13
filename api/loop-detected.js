/*
 * CRAWLER TEST FIXTURE: /loop-detected (and /loop-detected/status)
 *
 * Vercel serverless function behind the /loop-detected rewrites in vercel.json
 * (they sit before the SPA catch-all so they win). The implementation lives in
 * api/_loop/app.js; `npm run dev` and `npm run preview` serve the same handler
 * through a Vite middleware.
 */
import { handle } from './_loop/app.js'

export default function handler(req, res) {
  return handle(req, res)
}
