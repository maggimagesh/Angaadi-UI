#!/usr/bin/env node
/*
 * Regenerates docs/pagination-playground/answers/<ID>.json and CATALOGUE.md
 * from the scenario catalogue. URLs use BASE_URL (default: a placeholder).
 *
 *   BASE_URL=https://angaadi.dev node scripts/gen-pagination-docs.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { answerKey } from '../api/_pagination/app.js'
import { CATALOGUE_VERSION, END_TEXT } from '../api/_pagination/core.js'
import { CATEGORIES, SCENARIOS } from '../api/_pagination/scenarios.js'

const base = (process.env.BASE_URL || 'https://{BASE_URL}').replace(/\/+$/, '')
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'pagination-playground')
mkdirSync(path.join(out, 'answers'), { recursive: true })

const md = [`# Pagination Playground catalogue\n\nGenerated from \`api/_pagination/scenarios.js\` (catalogue ${CATALOGUE_VERSION}). Do not edit by hand; run \`node scripts/gen-pagination-docs.mjs\`.\n\nBase URL: \`${base}\`. Every scenario lives under \`/pagination/s/<ID>/\`; its answer key is at \`/pagination/s/<ID>/_answer\`.\n`]
for (const [cat, label] of CATEGORIES) {
  md.push(`\n## ${label}\n`)
  for (const sc of SCENARIOS.filter((s) => s.category === cat)) {
    const key = answerKey(sc, base)
    writeFileSync(path.join(out, 'answers', `${sc.id}.json`), JSON.stringify(key, null, 2) + '\n')
    const examples = key.expectedRequests.slice(0, 3).map((e) => (typeof e === 'string' ? `GET ${e}` : `${e.method} ${e.url} ${e.body}`))
    md.push(`### ${sc.id} · ${sc.title}

${sc.description}

- **Client:** ${sc.client === 'browser' ? 'browser (JavaScript required for the UI; XHR endpoints are plain HTTP)' : 'HTTP'}
- **Entry:** \`${key.entryUrl}\`
- **How to paginate:** ${sc.howTo}
- **Example requests:**
${examples.map((e) => `  - \`${e}\``).join('\n')}
- **End of data:** ${sc.end ? `${sc.end}: ${END_TEXT[sc.end]}` : sc.endText}${sc.variants ? ' (switchable with `?variant=h01…h12`)' : ''}
- **Records:** ${sc.recordsText}
- **Expected:** ${key.expectedRequests.length} requests, ${key.expectedRecordIds ? `${key.expectedRecordIds.length} records` : `${key.expectedRecordCount ?? "unbounded"} records (count only)`}, up to ${key.extraRequestsAllowed} extra requests allowed
`)
  }
}
writeFileSync(path.join(out, 'CATALOGUE.md'), md.join('\n'))
console.log(`wrote ${SCENARIOS.length} answer keys and CATALOGUE.md to ${path.relative(process.cwd(), out)}`)
