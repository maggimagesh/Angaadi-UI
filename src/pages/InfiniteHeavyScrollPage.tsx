import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import '../styles/infinite-scroll.css'

// Generates a massive string of random lorem ipsum words to artificially inflate bytes
function generateHugeString(sizeKB: number) {
  const words = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore', 'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud', 'exercitation', 'ullamco', 'laboris', 'nisi', 'ut', 'aliquip', 'ex', 'ea', 'commodo', 'consequat']
  let text = ''
  // Roughly 5-6 bytes per word + space. 1KB is ~160 words.
  const targetWords = sizeKB * 50
  for (let i = 0; i < targetWords; i++) {
    text += words[Math.floor(Math.random() * words.length)] + ' '
  }
  return text
}

// Complex, heavy SVG paths to bloat the DOM nodes
const generateComplexSVG = (id: string) => {
  const paths = []
  for (let i = 0; i < 50; i++) {
    paths.push(
      <path 
        key={`path-${i}`}
        d={`M${Math.random()*100},${Math.random()*100} Q${Math.random()*200},${Math.random()*200} ${Math.random()*300},${Math.random()*300} T${Math.random()*400},${Math.random()*400}`}
        fill="none"
        stroke={`hsl(${Math.random() * 360}, 100%, 50%)`}
        strokeWidth={Math.random() * 3 + 1}
        opacity={Math.random() * 0.5 + 0.1}
      />
    )
  }
  return (
    <div className="heavy-svg-container" title={`Complex SVG ${id}`}>
      <svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id={`blur-${id}`}>
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>
        <g filter={`url(#blur-${id})`}>
          {paths}
        </g>
      </svg>
    </div>
  )
}

// A component representing a massively bloated HTML node
function HeavyBlock({ index }: { index: number }) {
  // Use React.useMemo to avoid re-generating this heavy string on every render
  const hugeText = useMemo(() => generateHugeString(5), []) // 5KB of text per block

  return (
    <div className="heavy-block" data-valueless-attribute-to-increase-size={"x".repeat(100)}>
      <div className="heavy-nested-level-1">
        <h2 className="heavy-huge-text">Massive Block #{index}</h2>
        <div className="heavy-nested-level-2">
          <div className="heavy-nested-level-3">
            {hugeText}
          </div>
        </div>
      </div>
      
      <div className="heavy-nested-level-1">
        <h3>Image Grid & SVGs</h3>
        <p>This section loads multiple random images to eat up bandwidth and complex SVGs to hurt rendering performance.</p>
        
        <div className="heavy-image-grid">
          {/* using picsum to simulate heavy real-world assets */}
          <img src={`https://picsum.photos/400/300?random=${index}_1`} alt="Random 1" loading="lazy" />
          <img src={`https://picsum.photos/400/300?random=${index}_2`} alt="Random 2" loading="lazy" />
          <img src={`https://picsum.photos/400/300?random=${index}_3`} alt="Random 3" loading="lazy" />
          <img src={`https://picsum.photos/400/300?random=${index}_4`} alt="Random 4" loading="lazy" />
        </div>

        {generateComplexSVG(index.toString())}
      </div>
    </div>
  )
}

// Batch size to load initially and on scroll
const BATCH_SIZE = 15 // 15 blocks means massive HTML weight per load

export default function InfiniteHeavyScrollPage() {
  const [blockIndexes, setBlockIndexes] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const isInitialLoad = useRef(true)

  const loadMore = useCallback(() => {
    if (loading) return
    setLoading(true)
    
    // Simulate real-world heavy asset fetching delay
    setTimeout(() => {
      setBlockIndexes(prev => {
        const nextIdx = prev.length
        const newBatch = Array.from({ length: BATCH_SIZE }, (_, i) => nextIdx + i)
        return [...prev, ...newBatch]
      })
      setLoading(false)
    }, 800)
  }, [loading])

  // Initial load
  useEffect(() => {
    if (isInitialLoad.current) {
      loadMore()
      isInitialLoad.current = false
    }
  }, [loadMore])

  // Intersection Observer
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !loading) {
        loadMore()
      }
    }, { rootMargin: '1000px' }) // Start loading way before we hit the bottom so user doesn't jitter too much

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loading, loadMore])

  return (
    <main className="heavy-page">
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '4px' }}>
          DOM Bloat Generator
        </h1>
        <p style={{ color: '#aaa', fontSize: '1.2rem', maxWidth: '800px', margin: '0 auto' }}>
          This page intentionally renders gigantic, deeply nested DOM nodes, excessive CSS gradients/shadows, massive SVGs, and 4 high-res images per block. Open DevTools Element inspector and watch the HTML footprint explode into the Megabytes on scroll.
        </p>
      </div>

      <div className="heavy-container">
        {blockIndexes.map(index => (
          <HeavyBlock key={index} index={index} />
        ))}

        <div ref={sentinelRef} className="blog-sentinel" style={{ padding: '6rem 0' }}>
          {loading && (
            <>
              <div className="blog-spinner" style={{ borderColor: '#333', borderTopColor: '#ff00cc', width: 48, height: 48, borderWidth: 4 }}></div>
              <span style={{ color: '#ff00cc', marginTop: '1rem', letterSpacing: '2px' }}>CONSTRUCTING HEAVY DOM...</span>
            </>
          )}
        </div>
      </div>

      <div className="blog-stats-overlay">
        <div>Loaded Fat Blocks: <span style={{ color: '#ff00cc' }}>{blockIndexes.length}</span></div>
        <div>Total SVG Paths: <span style={{ color: '#ff00cc' }}>{(blockIndexes.length * 50).toLocaleString('en-US')}</span></div>
        <div>Total Random Images: <span style={{ color: '#ff00cc' }}>{(blockIndexes.length * 4).toLocaleString('en-US')}</span></div>
      </div>
    </main>
  )
}
