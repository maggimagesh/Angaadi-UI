import { useEffect, useRef } from 'react'
import { products } from '../data/products'
import '../styles/infinite-scroll.css'
import { SHADOW_CARD_CSS, SHADOW_PAGE_CSS } from '../styles/shadowCards'

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
const shadowCSS = `${SHADOW_CARD_CSS}${SHADOW_PAGE_CSS}`

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
