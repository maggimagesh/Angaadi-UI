// Renders the Vision-theme catalogue art.
//
//   node scripts/vision-art/render.mjs [outDir] [filter]
//
// Needs the Vite dev server (`npm run dev`) and Playwright with Chromium
// (`npx playwright install chromium`). It is a build-time tool, not a runtime
// dependency, so Playwright is deliberately not in package.json.
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const origin = process.env.ART_ORIGIN ?? 'http://127.0.0.1:5173'
const outDir = path.resolve(process.argv[2] ?? 'public/images/catalog')
const filter = process.argv[3] ? new RegExp(process.argv[3]) : null

// wide art: one per department; square art: four colourways per product type
const ITEMS = ['phone', 'laptop', 'tv', 'headphones', 'watch', 'tablet', 'kitchen', 'fashion', 'beauty', 'books', 'sports', 'grocery']
const FILE_NAMES = { phone: 'smartphone', headphones: 'earphones', watch: 'smartwatch' }
const jobs = []
ITEMS.forEach((item) => {
  const base = FILE_NAMES[item] ?? item
  jobs.push({ file: `${base}.jpg`, item, variant: 0, shape: 'wide' })
  for (let v = 0; v < 4; v++) jobs.push({ file: `${base}-${v + 1}.jpg`, item, variant: v, shape: 'square' })
})

await mkdir(outDir, { recursive: true })
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage()
page.on('pageerror', (e) => console.error('pageerror', e.message))
page.on('console', (m) => { if (m.type() === 'error' && !/GroupMarkerNotSet/.test(m.text())) console.error('console:', m.text().slice(0, 400)) })

for (const job of jobs) {
  if (filter && !filter.test(job.file)) continue
  const url = `${origin}/scripts/vision-art/art.html?item=${job.item}&variant=${job.variant}&shape=${job.shape}`
  await page.goto(url)
  await page.waitForFunction(() => window.__artReady === true, null, { timeout: 120000 })
  const err = await page.evaluate(() => window.__artError)
  if (err) throw new Error(`${job.file}: ${err}`)
  const dataUrl = await page.evaluate(() => document.getElementById('stage').toDataURL('image/jpeg', 0.86))
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64')
  await writeFile(path.join(outDir, job.file), buf)
  console.log(`${job.file.padEnd(22)} ${(buf.length / 1024).toFixed(0)} KB`)
}
await browser.close()
