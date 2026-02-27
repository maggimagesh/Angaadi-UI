import { useEffect, useState, useCallback } from 'react'
import { products } from '../data/products'
import '../styles/infinite-scroll.css'

const BATCH_SIZE = 12

function getStars(rating: number) {
  return '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating))
}

export default function IframeContentPage() {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE)
  const [loading, setLoading] = useState(false)

  const loadMore = useCallback(() => {
    if (loading) return
    setLoading(true)
    setTimeout(() => {
      setVisibleCount(prev => prev + BATCH_SIZE)
      setLoading(false)
    }, 400)
  }, [loading])

  useEffect(() => {
    // Hide scrollbar and adjust margin for iframe body so it perfectly fits its content
    document.body.style.overflow = 'hidden'
    document.body.style.margin = '0'
    const globalHeader = document.querySelector('header')
    if (globalHeader) globalHeader.style.display = 'none'
    
    // Listen for resize to notify parent of height
    const observer = new ResizeObserver(() => {
      window.parent.postMessage({ type: 'IFRAME_RESIZE', height: document.documentElement.scrollHeight }, '*')
    })
    observer.observe(document.body)

    // Listen for LOAD_MORE from parent's scroll observer
    const handleMessage = (e: MessageEvent) => {
      if (e.data === 'LOAD_MORE') loadMore()
    }
    window.addEventListener('message', handleMessage)

    return () => {
      observer.disconnect()
      window.removeEventListener('message', handleMessage)
      document.body.style.overflow = ''
      document.body.style.margin = ''
      if (globalHeader) globalHeader.style.display = ''
    }
  }, [loadMore])

  const displayProducts = Array.from({ length: visibleCount }, (_, i) => ({
    ...products[i % products.length],
    _key: i,
  }))

  return (
    <main className="app-main iframe-page" style={{ minHeight: '100vh', paddingBottom: '0' }}>
      <div className="iframe-page-header">
        <h1>Iframe — Infinite Scroll</h1>
        <p>The <strong>entire page</strong> (including this header) is rendered inside an <code>&lt;iframe&gt;</code>.</p>
        <div style={{ marginTop: '1rem' }}>
          <span className="is-badge" style={{ marginTop: 0 }}>
            {visibleCount} products loaded inside iframe
          </span>
        </div>
      </div>

      <div style={{ padding: '2rem 1.5rem 3rem', maxWidth: '1400px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <div className="is-product-grid">
          {displayProducts.map((product) => {
            const discount = Math.floor(Math.random() * 20) + 5
            const originalPrice = Math.round(product.price / (1 - discount / 100))
            const reviewCount = Math.floor(Math.random() * 3000) + 200
            return (
              <article className="is-product-card" key={product._key}>
                <div className="is-card-image">
                  <img src={product.image} alt={product.title} loading="lazy" />
                  {discount > 10 && <span className="is-card-badge">{discount}% OFF</span>}
                  <span className={`is-card-stock-badge ${product.stock === 'In Stock' ? 'in-stock' : 'out-of-stock'}`}>
                    {product.stock}
                  </span>
                </div>
                <div className="is-card-body">
                  <p className="is-card-brand">{product.brand}</p>
                  <h3 className="is-card-title">{product.title}</h3>
                  <div className="is-card-rating">
                    <span className="stars">{getStars(product.rating)}</span>
                    <span className="count">({reviewCount.toLocaleString('en-IN')})</span>
                  </div>
                  <div className="is-card-pricing">
                    <span className="is-card-price">₹{product.price.toLocaleString('en-IN')}</span>
                    <span className="is-card-old-price">₹{originalPrice.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        <div className="is-sentinel" style={{ minHeight: '80px', marginTop: '2rem' }}>
          {loading && (
            <>
              <div className="is-spinner" />
              <span>Loading more products in iframe…</span>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
