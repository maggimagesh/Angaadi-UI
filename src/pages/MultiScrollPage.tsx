import { useEffect, useRef, useState, useCallback } from 'react'
import { products } from '../data/products'
import '../styles/infinite-scroll.css'

const BATCH_SIZE = 10

// A smaller compact card used in the narrow columns
function CompactCard({ product }: { product: typeof products[0] }) {
  return (
    <article className="compact-card">
      <img src={product.image} alt={product.title} className="compact-card-img" loading="lazy" />
      <div className="compact-card-info">
        <p className="compact-brand">{product.brand}</p>
        <h3 className="compact-title">{product.title}</h3>
        <p className="compact-price">₹{product.price.toLocaleString('en-IN')}</p>
      </div>
    </article>
  )
}

// 1. Fixed List Component (No Infinite Scroll)
function RegularScrollColumn() {
  const displayProducts = products.slice(0, 24) // Fixed at 24 items

  return (
    <div className="scroll-column">
      <div className="scroll-column-header">
        <h2>Regular Scroll</h2>
        <p>Fixed list of 24 items. No infinite loading.</p>
      </div>
      <div className="scroll-column-content">
        {displayProducts.map((p, i) => <CompactCard key={`reg-${i}`} product={p} />)}
        <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
          End of list
        </div>
      </div>
    </div>
  )
}

// 2. Fast Infinite Scroll Component
function FastInfiniteScrollColumn() {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE)
  const [loading, setLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadMore = useCallback(() => {
    setLoading(true)
    setTimeout(() => {
      setVisibleCount(prev => prev + BATCH_SIZE)
      setLoading(false)
    }, 400) // 400ms fast delay
  }, [])

  useEffect(() => {
    if (!sentinelRef.current) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !loading) loadMore()
    }, { root: sentinelRef.current.parentElement, rootMargin: '200px' })
    
    obs.observe(sentinelRef.current)
    return () => obs.disconnect()
  }, [loading, loadMore])

  const displayProducts = Array.from({ length: visibleCount }, (_, i) => products[i % products.length])

  return (
    <div className="scroll-column">
      <div className="scroll-column-header">
        <h2>Fast Infinite Scroll</h2>
        <p>Loads immediately when approaching bottom.</p>
      </div>
      <div className="scroll-column-content">
        {displayProducts.map((p, i) => <CompactCard key={`fast-${i}`} product={p} />)}
        
        <div ref={sentinelRef} className="is-sentinel" style={{ padding: '1rem 0' }}>
          {loading && <div className="is-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />}
        </div>
      </div>
    </div>
  )
}

// 3. Slow 3G Infinite Scroll Component
function SlowInfiniteScrollColumn() {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE)
  const [loading, setLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadMore = useCallback(() => {
    setLoading(true)
    setTimeout(() => {
      setVisibleCount(prev => prev + BATCH_SIZE)
      setLoading(false)
    }, 3000) // Exactly 3 seconds (3G simulation)
  }, [])

  useEffect(() => {
    if (!sentinelRef.current) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !loading) loadMore()
    }, { root: sentinelRef.current.parentElement, rootMargin: '200px' })
    
    obs.observe(sentinelRef.current)
    return () => obs.disconnect()
  }, [loading, loadMore])

  const displayProducts = Array.from({ length: visibleCount }, (_, i) => products[i % products.length])

  return (
    <div className="scroll-column">
      <div className="scroll-column-header">
        <h2>Slow Infinite Scroll (3s)</h2>
        <p>Simulates 3G network. Takes 3s to load more.</p>
      </div>
      <div className="scroll-column-content">
        {displayProducts.map((p, i) => <CompactCard key={`slow-${i}`} product={p} />)}
        
        <div ref={sentinelRef} className="is-sentinel" style={{ padding: '1rem 0', flexDirection: 'column', gap: '0.5rem' }}>
          {loading && (
            <>
              <div className="is-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
              <span style={{ fontSize: '0.75rem' }}>Simulating 3G network...</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MultiScrollPage() {
  return (
    <main className="app-main multi-scroll-page">
      <div className="multi-page-header">
        <h1>Multi-Scroll Comparison</h1>
        <p>Compare standard scroll, fast infinite scroll, and a slow (3G) infinite scroll side-by-side.</p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#cbd5e1' }}>
          Each box has its own internal scrollbar. Scroll down the main page to see more page content.
        </p>
      </div>

      <div className="multi-scroll-container">
        <RegularScrollColumn />
        <FastInfiniteScrollColumn />
        <SlowInfiniteScrollColumn />
      </div>

      {/* Extra content to force the external page to be scrollable */}
      <div style={{ padding: '4rem 2rem', textAlign: 'center', backgroundColor: '#e2e8f0', margin: '2rem 1.5rem', borderRadius: 0 }}>
        <h2>Extra Page Content</h2>
        <p style={{ color: '#64748b', maxWidth: '600px', margin: '1rem auto' }}>
          This content ensures that the main outer browser window has a vertical scrollbar as requested (1 external scrollbar + 3 internal scrollbars for the boxes).
        </p>
        <div style={{ height: '500px' }}></div>
        <p>End of external page.</p>
      </div>
    </main>
  )
}
