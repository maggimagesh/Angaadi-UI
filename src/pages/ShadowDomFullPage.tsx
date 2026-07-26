import { useEffect, useRef } from 'react'
import { products } from '../data/products'
import '../styles/infinite-scroll.css'

const BATCH_SIZE = 12

/**
 * Build the HTML for a product card string (for raw DOM injection into shadow root).
 */
function cardHTML(product: typeof products[0], key: number) {
  const discount = ((key * 7 + 3) % 20) + 5
  const originalPrice = Math.round(product.price / (1 - discount / 100))
  const reviewCount = ((key * 13 + 200) % 3000) + 200
  const stars = '★'.repeat(Math.floor(product.rating)) + '☆'.repeat(5 - Math.floor(product.rating))

  return `
    <article class="is-product-card">
      <div class="is-card-image">
        <img src="${product.image}" alt="${product.title}" loading="lazy" />
        ${discount > 10 ? `<span class="is-card-badge">${discount}% OFF</span>` : ''}
        <span class="is-card-stock-badge ${product.stock === 'In Stock' ? 'in-stock' : 'out-of-stock'}">${product.stock}</span>
      </div>
      <div class="is-card-body">
        <p class="is-card-brand">${product.brand}</p>
        <h3 class="is-card-title">${product.title}</h3>
        <div class="is-card-rating">
          <span class="stars">${stars}</span>
          <span class="count">(${reviewCount.toLocaleString('en-IN')})</span>
        </div>
        <div class="is-card-pricing">
          <span class="is-card-price">₹${product.price.toLocaleString('en-IN')}</span>
          <span class="is-card-old-price">₹${originalPrice.toLocaleString('en-IN')}</span>
        </div>
        ${product.freeDelivery ? '<span class="is-card-delivery">🚚 Free Delivery</span>' : ''}
      </div>
    </article>
  `
}

/**
 * CSS injected into the shadow root — same visual tokens as infinite-scroll.css
 */
const shadowCSS = `
  :host {
    display: block;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  .shadow-scroll-wrap {
    padding: 1.5rem;
    scroll-behavior: smooth;
  }
  .is-product-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.25rem;
  }
  .is-product-card {
    background: #fff;
    border-radius: 0;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0,0,0,.08), 0 0 0 1px rgba(0,0,0,.04);
    transition: transform .25s ease, box-shadow .25s ease;
    display: flex;
    flex-direction: column;
  }
  .is-product-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 28px rgba(103,80,164,.12), 0 0 0 1px rgba(103,80,164,.08);
  }
  .is-card-image {
    position: relative;
    aspect-ratio: 1;
    background: #f8f8fa;
    overflow: hidden;
  }
  .is-card-image img {
    width: 100%; height: 100%;
    object-fit: contain;
    padding: 1rem;
    transition: transform .4s ease;
  }
  .is-product-card:hover .is-card-image img { transform: scale(1.05); }
  .is-card-badge {
    position: absolute; top: 10px; left: 10px;
    background: linear-gradient(135deg,#ef4444,#dc2626);
    color: #fff; padding: 4px 10px; border-radius: 0;
    font-size: .7rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
  }
  .is-card-stock-badge {
    position: absolute; bottom: 10px; right: 10px;
    padding: 3px 8px; border-radius: 0;
    font-size: .7rem; font-weight: 600;
  }
  .is-card-stock-badge.in-stock   { background: #dcfce7; color: #166534; }
  .is-card-stock-badge.out-of-stock{ background: #fee2e2; color: #991b1b; }
  .is-card-body { padding: 1rem; display: flex; flex-direction: column; gap: .375rem; flex: 1; }
  .is-card-brand { font-size: .7rem; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: #6750a4; margin: 0; }
  .is-card-title { font-size: .9375rem; font-weight: 600; color: #1a1a2e; margin: 0; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .is-card-rating { display: flex; align-items: center; gap: .375rem; font-size: .8125rem; }
  .is-card-rating .stars { color: #f59e0b; letter-spacing: -1px; }
  .is-card-rating .count { color: #94a3b8; font-size: .75rem; }
  .is-card-pricing { display: flex; align-items: baseline; gap: .5rem; margin-top: auto; padding-top: .5rem; }
  .is-card-price { font-size: 1.25rem; font-weight: 800; color: #1a1a2e; }
  .is-card-old-price { font-size: .8125rem; color: #94a3b8; text-decoration: line-through; }
  .is-card-delivery { font-size: .75rem; color: #059669; font-weight: 500; }
  .is-sentinel { display: flex; justify-content: center; align-items: center; padding: 2.5rem 0; gap: .75rem; }
  .is-spinner { width: 28px; height: 28px; border: 3px solid #e2d8f8; border-top-color: #6750a4; border-radius: 0; animation: spin .7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .is-sentinel span { font-size: .9375rem; color: #6750a4; font-weight: 500; }
  .shadow-badge { display: inline-flex; align-items: center; gap: .375rem; background: rgba(103,80,164,.1); color: #6750a4; padding: .375rem .875rem; border-radius: 0; font-size: .8125rem; font-weight: 600; margin-bottom: 1.25rem; }
  @media (max-width: 1200px) { .is-product-grid { grid-template-columns: repeat(3,1fr); } }
  @media (max-width: 768px)  { .is-product-grid { grid-template-columns: repeat(2,1fr); gap: .75rem; } }
  @media (max-width: 480px)  { .is-product-grid { grid-template-columns: 1fr; } }

  /* ── Entire Page Elements ──────────────────────────────────────── */
  .shadow-dom-page {
    min-height: calc(100vh - var(--header-height, 64px));
    background: #f0fff4;
    display: flex;
    flex-direction: column;
  }
  .shadow-dom-header {
    background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 50%, #43a047 100%);
    padding: 1.75rem 1.5rem;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .shadow-dom-header::after {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 70% 40%, rgba(255, 255, 255, 0.08) 0%, transparent 60%);
  }
  .shadow-dom-header h1 {
    color: #fff;
    font-size: 1.75rem;
    font-weight: 800;
    margin: 0 0 0.375rem;
    position: relative;
    z-index: 1;
  }
  .shadow-dom-header p {
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.9375rem;
    margin: 0;
    position: relative;
    z-index: 1;
  }
  .shadow-dom-container {
    flex: 1;
    padding: 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }
`

export default function ShadowDomFullPage() {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    // Attach shadow root (only once)
    let shadow: ShadowRoot
    try {
      shadow = host.attachShadow({ mode: 'open' })
    } catch {
      // already attached (StrictMode double-mount) — use existing
      shadow = host.shadowRoot!
      if (!shadow) return
      shadow.innerHTML = ''
    }

    // inject style
    const style = document.createElement('style')
    style.textContent = shadowCSS
    shadow.appendChild(style)

    // main page wrapper
    const mainWrap = document.createElement('main')
    mainWrap.className = 'app-main shadow-dom-page'
    shadow.appendChild(mainWrap)

    // header
    const header = document.createElement('div')
    header.className = 'shadow-dom-header'
    header.innerHTML = `
      <h1>Shadow DOM — Full Encapsulation</h1>
      <p>The **entire page** (including this header) is rendered inside an encapsulated Shadow DOM.</p>
    `
    mainWrap.appendChild(header)

    // Main layout container
    const container = document.createElement('div')
    container.className = 'shadow-dom-container'
    mainWrap.appendChild(container)

    // scrollable wrapper
    const scrollWrap = document.createElement('div')
    scrollWrap.className = 'shadow-scroll-wrap'
    container.appendChild(scrollWrap)

    // badge
    const badge = document.createElement('span')
    badge.className = 'shadow-badge'
    badge.textContent = '0 products loaded'
    scrollWrap.appendChild(badge)

    // grid
    const grid = document.createElement('div')
    grid.className = 'is-product-grid'
    scrollWrap.appendChild(grid)

    // sentinel
    const sentinel = document.createElement('div')
    sentinel.className = 'is-sentinel'
    scrollWrap.appendChild(sentinel)

    let count = 0
    let loading = false

    function renderBatch() {
      loading = true
      sentinel.innerHTML = '<div class="is-spinner"></div><span>Loading more products…</span>'
      setTimeout(() => {
        const fragment = document.createDocumentFragment()
        for (let i = 0; i < BATCH_SIZE; i++) {
          const idx = count + i
          const product = products[idx % products.length]
          const wrapper = document.createElement('div')
          wrapper.innerHTML = cardHTML(product, idx)
          fragment.appendChild(wrapper.firstElementChild!)
        }
        grid.appendChild(fragment)
        count += BATCH_SIZE
        badge.textContent = `${count} products loaded`
        sentinel.innerHTML = ''
        loading = false
      }, 400)
    }

    // initial batch
    renderBatch()

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loading) renderBatch()
      },
      { rootMargin: '800px' }
    )
    observer.observe(sentinel)

    return () => observer.disconnect()
  }, [])

  return (
    <div ref={hostRef} style={{ display: 'block', width: '100%' }} />
  )
}
