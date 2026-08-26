import { useState, useEffect, useRef } from 'react'
import { products } from '../data/products'
import '../styles/infinite-scroll.css'
import { SHADOW_CARD_CSS } from '../styles/shadowCards'

const BATCH_SIZE = 12

/* ── Inline shadow CSS (same as ShadowDomPage) ─────────────── */
const shadowCSS = `
  .shadow-scroll-wrap { max-height: 70vh; overflow-y: auto; }
${SHADOW_CARD_CSS}`

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
        <div class="is-card-rating"><span class="stars">${stars}</span><span class="count">(${reviewCount.toLocaleString('en-IN')})</span></div>
        <div class="is-card-pricing"><span class="is-card-price">₹${product.price.toLocaleString('en-IN')}</span><span class="is-card-old-price">₹${originalPrice.toLocaleString('en-IN')}</span></div>
        ${product.freeDelivery ? '<span class="is-card-delivery">🚚 Free Delivery</span>' : ''}
      </div>
    </article>`
}

/* ── Inline Shadow DOM infinite scroll component ──────────── */
function InlineShadowScroll() {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let shadow: ShadowRoot
    try { shadow = host.attachShadow({ mode: 'open' }) } catch { shadow = host.shadowRoot!; if (!shadow) return; shadow.innerHTML = '' }

    const style = document.createElement('style')
    style.textContent = shadowCSS
    shadow.appendChild(style)

    const scrollWrap = document.createElement('div')
    scrollWrap.className = 'shadow-scroll-wrap'
    shadow.appendChild(scrollWrap)

    const badge = document.createElement('span')
    badge.className = 'shadow-badge'
    badge.textContent = '0 products loaded'
    scrollWrap.appendChild(badge)

    const grid = document.createElement('div')
    grid.className = 'is-product-grid'
    scrollWrap.appendChild(grid)

    const sentinel = document.createElement('div')
    sentinel.className = 'is-sentinel'
    scrollWrap.appendChild(sentinel)

    let count = 0, loading = false
    function renderBatch() {
      loading = true
      sentinel.innerHTML = '<div class="is-spinner"></div><span>Loading…</span>'
      setTimeout(() => {
        const frag = document.createDocumentFragment()
        for (let i = 0; i < BATCH_SIZE; i++) {
          const idx = count + i
          const w = document.createElement('div')
          w.innerHTML = cardHTML(products[idx % products.length], idx)
          frag.appendChild(w.firstElementChild!)
        }
        grid.appendChild(frag)
        count += BATCH_SIZE
        badge.textContent = `${count} products loaded`
        sentinel.innerHTML = ''
        loading = false
      }, 400)
    }
    renderBatch()

    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting && !loading) renderBatch() }, { root: scrollWrap, rootMargin: '300px' })
    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [])

  return <div className="combined-shadow-host" ref={hostRef} style={{ minHeight: '500px', borderRadius: 'var(--radius-md)' }} />
}

/* ── Main combined page ───────────────────────────────────── */
type Tab = 'scroll' | 'iframe' | 'shadow'

export default function ShadowIframePage() {
  const [activeTab, setActiveTab] = useState<Tab>('scroll')

  return (
    <main className="app-main combined-page">
      <div className="combined-header">
        <h1>All-in-One Demo</h1>
        <p>Infinite Scroll · Iframe · Shadow DOM — Combined on a single page</p>
      </div>

      <div className="combined-tabs">
        {([
          ['scroll', '↕ Infinite Scroll'],
          ['iframe',  '⧉ Iframe'],
          ['shadow',  '◉ Shadow DOM'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            className={`combined-tab ${activeTab === key ? 'active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="combined-panel">
        {activeTab === 'scroll' && (
          <div className="combined-panel-card">
            <div className="combined-panel-label"><span className="dot purple" /> Direct Infinite Scroll</div>
            <iframe
              src="/infinite-scroll"
              title="Infinite Scroll (direct)"
              style={{ width: '100%', minHeight: '70vh', border: 'none', borderRadius: 'var(--radius-md)' }}
            />
          </div>
        )}

        {activeTab === 'iframe' && (
          <div className="combined-panel-card">
            <div className="combined-panel-label"><span className="dot blue" /> Iframe Embed</div>
            <iframe
              src="/infinite-scroll"
              title="Infinite Scroll (iframe)"
              style={{ width: '100%', minHeight: '70vh', border: 'none', borderRadius: 'var(--radius-md)' }}
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        )}

        {activeTab === 'shadow' && (
          <div className="combined-panel-card">
            <div className="combined-panel-label"><span className="dot green" /> Shadow DOM</div>
            <InlineShadowScroll />
          </div>
        )}
      </div>
    </main>
  )
}
