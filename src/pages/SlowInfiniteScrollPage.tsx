import { useEffect, useRef, useState, useCallback } from 'react'
import { products } from '../data/products'
import '../styles/infinite-scroll.css'

const BATCH_SIZE = 12

function getStars(rating: number) {
  return '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating))
}

export default function SlowInfiniteScrollPage() {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE)
  const [loading, setLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const loadMore = useCallback(() => {
    setLoading(true)
    // Simulate slow 3G network (3-5 seconds delay)
    const delay = Math.floor(Math.random() * 2000) + 3000 // 3000ms to 5000ms

    setTimeout(() => {
      setVisibleCount(prev => prev + BATCH_SIZE)
      setLoading(false)
    }, delay)
  }, [])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loading) {
          loadMore()
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loading, loadMore])

  // repeat the product dataset to fill visibleCount
  const displayProducts = Array.from({ length: visibleCount }, (_, i) => ({
    ...products[i % products.length],
    _key: i,
  }))

  return (
    <main className="app-main infinite-scroll-page">
      <div className="is-page-header">
        <div className="is-page-header-inner">
          <h1>Slow Infinite Scroll (3G Sim)</h1>
          <p>This page simulates a slow 3G network connection. Scrolling to the bottom triggers a 3-5 second delay before new products load.</p>
          <span className="is-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="7 13 12 18 17 13"/><polyline points="7 6 12 11 17 6"/></svg>
            {visibleCount} products loaded
          </span>
        </div>
      </div>

      <div className="is-container">
        <div className="is-product-grid">
          {displayProducts.map((product) => {
            const discount = Math.floor(Math.random() * 20) + 5
            const originalPrice = Math.round(product.price / (1 - discount / 100))
            const reviewCount = Math.floor(Math.random() * 3000) + 200
            return (
              <article className="is-product-card" key={product._key}>
                <div className="is-card-image">
                  <img src={product.image} alt={product.title} loading="lazy" />
                  {discount > 10 && (
                    <span className="is-card-badge">{discount}% OFF</span>
                  )}
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
                  {product.freeDelivery && (
                    <span className="is-card-delivery">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      Free Delivery
                    </span>
                  )}
                </div>
              </article>
            )
          })}
        </div>

        {/* sentinel */}
        <div ref={sentinelRef} className="is-sentinel">
          {loading && (
            <>
              <div className="is-spinner" />
              <span>Simulating 3G network... Loading more products</span>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
