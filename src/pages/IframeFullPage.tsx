import { useEffect, useRef } from 'react'

export default function IframeFullPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'IFRAME_RESIZE') {
        if (iframeRef.current) {
          iframeRef.current.style.height = e.data.height + 'px'
        }
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        iframeRef.current?.contentWindow?.postMessage('LOAD_MORE', '*')
      }
    }, { rootMargin: '800px' })
    if (sentinelRef.current) observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh', background: '#f0f4ff' }}>
      <iframe
        ref={iframeRef}
        src="/iframe-content"
        style={{ width: '100%', border: 'none', minHeight: '100vh', overflow: 'hidden' }}
        title="Iframe Content"
      />
      {/* Invisible sentinel that triggers LOAD_MORE when scrolled into view from the parent window */}
      <div ref={sentinelRef} style={{ height: '1px', background: 'transparent', pointerEvents: 'none' }} />
    </div>
  )
}
