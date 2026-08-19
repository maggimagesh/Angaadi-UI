import { useState, useEffect, useRef } from 'react'
import { products } from '../data/products'
import '../styles/infinite-scroll.css'

const BATCH_SIZE = 12

/* ── Inline shadow CSS (same as ShadowDomPage) ─────────────── */
const shadowCSS = `
  :host { display: block; font-family: system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
  .shadow-scroll-wrap { max-height: 70vh; overflow-y: auto; padding: 1.5rem; scroll-behavior: smooth; }
  .is-product-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 1.25rem; }
  .is-product-card { background:var(--color-surface-raised); border-radius: 0; overflow:hidden; box-shadow:0 1px 4px color-mix(in srgb, var(--color-text) 80%, transparent),0 0 0 1px color-mix(in srgb, var(--color-text) 40%, transparent); transition:transform .25s ease,box-shadow .25s ease; display:flex; flex-direction:column; }
  .is-product-card:hover { transform:translateY(-4px); box-shadow:0 12px 28px color-mix(in srgb, var(--color-accent) 12%, transparent),0 0 0 1px color-mix(in srgb, var(--color-accent) 8%, transparent); }
  .is-card-image { position:relative; aspect-ratio:1; background:var(--color-neutral-200); overflow:hidden; }
  .is-card-image img { width:100%; height:100%; object-fit:contain; padding:1rem; transition:transform .4s ease; }
  .is-product-card:hover .is-card-image img { transform:scale(1.05); }
  .is-card-badge { position:absolute; top:10px; left:10px; background:linear-gradient(135deg,var(--color-accent-2-600),var(--color-accent-2-700)); color:var(--color-surface-raised); padding:4px 10px; border-radius: 0; font-size:.7rem; font-weight:700; letter-spacing:.04em; text-transform:uppercase; }
  .is-card-stock-badge { position:absolute; bottom:10px; right:10px; padding:3px 8px; border-radius: 0; font-size:.7rem; font-weight:600; }
  .is-card-stock-badge.in-stock { background:var(--color-sky-200); color:var(--color-sky-900); }
  .is-card-stock-badge.out-of-stock { background:var(--color-accent-2-200); color:var(--color-accent-2-900); }
  .is-card-body { padding:1rem; display:flex; flex-direction:column; gap:.375rem; flex:1; }
  .is-card-brand { font-size:.7rem; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:var(--color-accent); margin:0; }
  .is-card-title { font-size:.9375rem; font-weight:600; color:var(--color-text); margin:0; line-height:1.35; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
  .is-card-rating { display:flex; align-items:center; gap:.375rem; font-size:.8125rem; }
  .is-card-rating .stars { color:var(--color-accent-2-500); letter-spacing:-1px; }
  .is-card-rating .count { color:var(--color-neutral-600); font-size:.75rem; }
  .is-card-pricing { display:flex; align-items:baseline; gap:.5rem; margin-top:auto; padding-top:.5rem; }
  .is-card-price { font-size:1.25rem; font-weight:800; color:var(--color-text); }
  .is-card-old-price { font-size:.8125rem; color:var(--color-neutral-600); text-decoration:line-through; }
  .is-card-delivery { font-size:.75rem; color:var(--color-sky-700); font-weight:500; }
  .is-sentinel { display:flex; justify-content:center; align-items:center; padding:2.5rem 0; gap:.75rem; }
  .is-spinner { width:28px; height:28px; border:3px solid var(--color-accent-200); border-top-color:var(--color-accent); border-radius: 0; animation:spin .7s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  .is-sentinel span { font-size:.9375rem; color:var(--color-accent); font-weight:500; }
  .shadow-badge { display:inline-flex; align-items:center; gap:.375rem; background:color-mix(in srgb, var(--color-accent) 10%, transparent); color:var(--color-accent); padding:.375rem .875rem; border-radius: 0; font-size:.8125rem; font-weight:600; margin-bottom:1.25rem; }
  @media (max-width:1200px) { .is-product-grid { grid-template-columns:repeat(3,1fr); } }
  @media (max-width:768px)  { .is-product-grid { grid-template-columns:repeat(2,1fr); gap:.75rem; } }
  @media (max-width:480px)  { .is-product-grid { grid-template-columns:1fr; } }
`

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
