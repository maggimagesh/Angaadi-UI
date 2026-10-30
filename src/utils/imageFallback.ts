import { placeholderFor } from '../data/catalog'

/* Catalogue photos come from the API and some URLs are dead (example.com
   placeholders, expired CDN links). Rather than leave a broken-image icon in
   a well, any <img> that fails to load once is swapped for the house render
   that matches what it shows. `error` does not bubble, so the listener is
   registered on the capture phase of the document. */

const OWN_PREFIXES = ['/images/catalog/', '/images/studio/', '/logo/', 'data:']

function nameFor(img: HTMLImageElement): string {
  if (img.alt) return img.alt
  const host = img.closest('a, article, li, [role="listitem"], tr, div')
  return (host?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 120)
}

export function installImageFallback(): void {
  document.addEventListener(
    'error',
    (event) => {
      const img = event.target
      if (!(img instanceof HTMLImageElement)) return
      const src = img.getAttribute('src') ?? ''
      if (!src || img.dataset.fallback || OWN_PREFIXES.some((p) => src.startsWith(p))) return
      img.dataset.fallback = 'true'
      img.removeAttribute('srcset')
      img.src = placeholderFor({ name: nameFor(img) })
    },
    true,
  )
}
