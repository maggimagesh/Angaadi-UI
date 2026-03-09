/**
 * Generate 100 static HTML files for crawler testing.
 *
 * CRITICAL REQUIREMENT:
 * The EXTRACTED TEXT SIZE (i.e. size of the HTML data when converted to pure text)
 * must be exactly the target size (e.g. 5 MB). The raw file size on disk will be
 * slightly larger due to the HTML tags.
 *
 * Output: public/5mb-{1..100}/index.html
 * Accessible at: /5mb-1/ through /5mb-100/
 *
 * Usage: node scripts/generate-5mb-pages.cjs
 */

const fs = require('fs');
const path = require('path');

const TOTAL_PAGES = 100;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

function getTargetBytes(pageNum) {
  if (pageNum <= 70) {
    const min = 4_800_000;
    const max = 5_100_000;
    return min + Math.floor((max - min) * ((pageNum - 1) / 69));
  } else {
    const min = 4_000_000;
    const max = 4_800_000;
    return min + Math.floor((max - min) * ((pageNum - 71) / 29));
  }
}

// Pre-build a pure text filler block of ~5.2 MB
console.log('Pre-building pure text filler content...');
const LOREM = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra. Praesent dapibus, neque id cursus faucibus, tortor neque egestas augue, eu vulputate magna eros eu erat. Aliquam erat volutpat. Nam dui mi, tincidunt quis, accumsan porttitor, facilisis luctus, metus. Phasellus ultrices nulla quis nibh. Quisque a lectus. Donec consectetuer ligula vulputate sem tristique cursus. ';

const FILLER_TARGET = 5_200_000;
const reps = Math.ceil(FILLER_TARGET / LOREM.length);
const FILLER_BLOCK = LOREM.repeat(reps);
console.log(`Filler block ready: ${(Buffer.byteLength(FILLER_BLOCK, 'utf8') / 1_000_000).toFixed(2)} MB\n`);

function getExtractedTextLength(html) {
  // Strip all HTML tags
  let text = html.replace(/<[^>]+>/g, '');
  // Unescape standard entities we used
  text = text.replace(/&bull;/g, '-');
  text = text.replace(/&copy;/g, 'C');
  return Buffer.byteLength(text, 'utf8');
}

function buildNav(skipPage) {
  let nav = '<nav id="page-navigation">\n<h2>All Pages</h2>\n<ul>\n';
  for (let i = 1; i <= TOTAL_PAGES; i++) {
    if (i !== skipPage) {
      nav += `  <li><a href="/5mb-${i}/">5MB Test Page ${i}</a></li>\n`;
    }
  }
  nav += '</ul>\n</nav>\n';
  return nav;
}

function buildShell(pageNum) {
  const targetTextBytes = getTargetBytes(pageNum);

  const header = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>5MB Test Page ${pageNum} of ${TOTAL_PAGES}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:1200px;margin:0 auto;padding:24px;background:#f9fafb;color:#1f2937;line-height:1.6}
    h1{font-size:2rem;color:#111827;margin-bottom:8px}
    h2{font-size:1.5rem;color:#374151;margin:24px 0 12px}
    p{margin-bottom:12px}
    nav ul{column-count:4;list-style:none;padding:0}
    nav ul li{margin-bottom:4px}
    nav ul li a{color:#2563eb;text-decoration:none}
    nav ul li a:hover{text-decoration:underline}
    table{width:100%;border-collapse:collapse;margin-bottom:24px}
    table th{background:#e5e7eb;padding:8px;text-align:left}
    table td{padding:8px;border-bottom:1px solid #e5e7eb}
    ol,ul{padding-left:24px}
    li{margin-bottom:6px}
    section{margin-bottom:32px}
    .filler-text { word-wrap: break-word; color: #4b5563; font-size: 0.95rem; }
  </style>
</head>
<body>
  <header>
    <h1>5MB HTML Test Page ${pageNum}</h1>
    <p>Page ${pageNum} of ${TOTAL_PAGES} &bull; Target Extracted Text: ${(targetTextBytes / 1_000_000).toFixed(2)} MB</p>
  </header>
`;

  const nav = buildNav(pageNum);

  let content = '';
  content += `<section id="about"><h2>About Page ${pageNum}</h2>`;
  content += `<p>Test page ${pageNum}/${TOTAL_PAGES} for web crawler testing.</p></section>\n`;

  content += '<section id="data"><h2>Data Table</h2><table border="1" cellpadding="8" cellspacing="0"><thead><tr><th>ID</th><th>Name</th><th>Value</th></tr></thead><tbody>\n';
  for (let r = 1; r <= 50; r++) {
    content += `<tr><td>${r}</td><td>Item ${r}-${pageNum}</td><td>${(r * pageNum * 3.14).toFixed(2)}</td></tr>\n`;
  }
  content += '</tbody></table></section>\n';

  const footer = `</main>\n<footer><p>&copy; 2026 Angaadi Crawler Test. Page ${pageNum}/${TOTAL_PAGES}.</p></footer>\n</body></html>`;

  return { header, nav, content, footer, targetTextBytes };
}

// ==================== GENERATE ====================

console.log('Generating 100 static HTML pages based on EXTRACTED TEXT SIZE...\n');
const startTime = Date.now();
const results = [];

for (let i = 1; i <= TOTAL_PAGES; i++) {
  const { header, nav, content, footer, targetTextBytes } = buildShell(i);

  const shellHtml = header + nav + '<main>\n' + content + footer;
  const currentTextLen = getExtractedTextLength(shellHtml);
  
  // How much pure text do we need to add to hit the target text size?
  const textNeeded = Math.max(0, targetTextBytes - currentTextLen);

  // Take the exact amount of pure text needed
  const rawFillerText = FILLER_BLOCK.substring(0, textNeeded);

  // We wrap it in a div tag so it looks decent in browser and won't affect the extracted text length much
  // (The tags themselves are stripped when evaluating extracted text)
  const fillerHtml = `\n<section id="crawler-content"><h2>Crawler Payload</h2>\n<div class="filler-text">\n${rawFillerText}\n</div>\n</section>\n`;

  // Assemble full HTML
  const finalHtmlParts = header + nav + '<main>\n' + content + fillerHtml + footer;

  // Double check our logic
  const actualExtractedTextLen = getExtractedTextLength(finalHtmlParts);
  const rawHtmlSize = Buffer.byteLength(finalHtmlParts, 'utf8');

  // Write to disk
  const dirPath = path.join(PUBLIC_DIR, `5mb-${i}`);
  fs.mkdirSync(dirPath, { recursive: true });
  fs.writeFileSync(path.join(dirPath, 'index.html'), finalHtmlParts, 'utf8');

  results.push({ page: i, textLen: actualExtractedTextLen, htmlSize: rawHtmlSize });

  if (i % 10 === 0 || i <= 3 || i === 70 || i === 71) {
    console.log(`  Page ${String(i).padStart(3)}: Extracted Text = ${(actualExtractedTextLen / 1_000_000).toFixed(3)} MB | Raw HTML File = ${(rawHtmlSize / 1_000_000).toFixed(3)} MB`);
  }
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

console.log('\n' + '='.repeat(60));
const inRange = results.filter(r => r.textLen >= 4_800_000 && r.textLen <= 5_100_000).length;
const below = results.filter(r => r.textLen < 4_800_000).length;
console.log(`  Extracted Text 4.8-5.1 MB: ${inRange}`);
console.log(`  Extracted Text ≤ 4.8 MB:   ${below}`);
console.log(`  Time: ${elapsed}s`);
console.log(`  Endpoints: /5mb-1/ to /5mb-100/`);
console.log('='.repeat(60));
