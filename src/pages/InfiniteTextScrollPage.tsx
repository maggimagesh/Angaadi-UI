import { useEffect, useRef, useState, useCallback } from 'react'
import '../styles/infinite-scroll.css'

// A text generator to create varied blog content
const generateLoremIpsum = (type: 'p' | 'h2' | 'h3' | 'quote'): string => {
  const words = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore', 'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud', 'exercitation', 'ullamco', 'laboris', 'nisi', 'ut', 'aliquip', 'ex', 'ea', 'commodo', 'consequat', 'duis', 'aute', 'irure', 'dolor', 'in', 'reprehenderit', 'in', 'voluptate', 'velit', 'esse', 'cillum', 'dolore', 'eu', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint', 'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'in', 'culpa', 'qui', 'officia', 'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum']
  
  const generateSentence = (wordCount: number) => {
    let text = ''
    for (let i = 0; i < wordCount; i++) {
      const word = words[Math.floor(Math.random() * words.length)]
      text += (i === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word) + ' '
    }
    return text.trim() + '.'
  }

  if (type === 'h2') {
    return generateSentence(Math.floor(Math.random() * 4) + 3).replace('.', '')
  }
  
  if (type === 'h3') {
    return generateSentence(Math.floor(Math.random() * 5) + 4).replace('.', '')
  }
  
  if (type === 'quote') {
    return generateSentence(Math.floor(Math.random() * 15) + 10)
  }

  // Paragraph
  const sentenceCount = Math.floor(Math.random() * 6) + 3
  let text = ''
  for (let i = 0; i < sentenceCount; i++) {
    text += generateSentence(Math.floor(Math.random() * 10) + 5) + ' '
  }
  return text.trim()
}

type ContentBlock = {
  id: string
  type: 'p' | 'h2' | 'h3' | 'quote'
  content: string
}

const BATCH_SIZE = 15

export default function InfiniteTextScrollPage() {
  const [blocks, setBlocks] = useState<ContentBlock[]>([])
  const [loading, setLoading] = useState(false)
  const [paragraphsLoaded, setParagraphsLoaded] = useState(0)
  const [wordsLoaded, setWordsLoaded] = useState(0)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const isInitialLoad = useRef(true)

  const generateBatch = useCallback((startIndex: number): ContentBlock[] => {
    const newBlocks: ContentBlock[] = []
    
    for (let i = 0; i < BATCH_SIZE; i++) {
      const idx = startIndex + i
      let type: 'p' | 'h2' | 'h3' | 'quote' = 'p'
      
      // Every 8th block is an h2
      if (idx !== 0 && idx % 8 === 0) type = 'h2'
      // Occasional h3
      else if (idx !== 0 && idx % 5 === 0 && idx % 8 !== 0) type = 'h3'
      // Occasional blockquote
      else if (idx !== 0 && idx % 12 === 0) type = 'quote'
      
      newBlocks.push({
        id: `block-${idx}`,
        type,
        content: generateLoremIpsum(type)
      })
    }
    return newBlocks
  }, [])

  const loadMore = useCallback(() => {
    if (loading) return
    setLoading(true)
    
    // Tiny delay to make the spinner visible briefly
    setTimeout(() => {
      setBlocks(prev => {
        const newBlocks = generateBatch(prev.length)
        
        // Update stats
        const newParagraphs = newBlocks.filter(b => b.type === 'p').length
        setParagraphsLoaded(p => p + newParagraphs)
        
        const newWordsCount = newBlocks.reduce((acc, curr) => acc + curr.content.split(' ').length, 0)
        setWordsLoaded(w => w + newWordsCount)

        return [...prev, ...newBlocks]
      })
      setLoading(false)
    }, 150)
  }, [loading, generateBatch])

  // Initial load
  useEffect(() => {
    if (isInitialLoad.current) {
      loadMore()
      isInitialLoad.current = false
    }
  }, [loadMore])

  // Intersection Observer for infinite scrolling
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !loading) {
        loadMore()
      }
    }, { rootMargin: '800px' }) // Large root margin to load well before reaching bottom

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loading, loadMore])

  return (
    <main className="app-main infinite-text-page">
      <div className="blog-header">
        <h1>The Never-Ending Story</h1>
        <p>Keep scrolling... Millions of words are generated on the fly as you read down this page.</p>
      </div>

      <article className="blog-content">
        {blocks.map(block => {
          switch (block.type) {
            case 'h2':
              return <h2 key={block.id}>{block.content}</h2>
            case 'h3':
              return <h3 key={block.id}>{block.content}</h3>
            case 'quote':
              return <blockquote key={block.id}>{block.content}</blockquote>
            case 'p':
            default:
              return <p key={block.id}>{block.content}</p>
          }
        })}

        <div ref={sentinelRef} className="blog-sentinel">
          {loading && (
            <>
              <div className="blog-spinner"></div>
              <span>Generating text...</span>
            </>
          )}
        </div>
      </article>

      <div className="blog-stats-overlay">
        <div>Total Paragraphs: <span>{paragraphsLoaded.toLocaleString('en-US')}</span></div>
        <div>Total Blocks: <span>{blocks.length.toLocaleString('en-US')}</span></div>
        <div>Total Words: <span>{wordsLoaded.toLocaleString('en-US')}</span></div>
      </div>
    </main>
  )
}
