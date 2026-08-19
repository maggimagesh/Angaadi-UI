export function buildPlaceholderDataUri(label: string, width = 600, height = 600): string {
  // Pastel sky well with pastel-dark-blue ink, matching --color-sky-200 /
  // --color-text. Inlined because this string is baked into a data: URI.
  const bg = '#e3f1fb'
  const fg = '#24344e'
  const raw = label.length > 24 ? label.slice(0, 24) + '…' : label
  const safe = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="${bg}"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="${fg}" font-size="28" font-family="ui-sans-serif, system-ui, -apple-system" font-weight="600">${safe}</text>
</svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}


