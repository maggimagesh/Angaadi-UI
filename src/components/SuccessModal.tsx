import { useEffect } from 'react'
import { useUIStore } from '../store/ui'

export function SuccessModal() {
  const { successOpen, successMessage, successDurationMs, closeSuccess } = useUIStore()

  useEffect(() => {
    if (!successOpen) return
    const t = setTimeout(() => closeSuccess(), successDurationMs)
    return () => clearTimeout(t)
  }, [successOpen, successDurationMs, closeSuccess])

  if (!successOpen) return null
  return (
    <div
      className="toast-surface"
      role="status"
      aria-live="polite"
      id="success-toast"
      data-testid="success-toast"
      style={{
        position:'fixed',
        top:16,
        right:16,
        zIndex:60,
        display:'inline-flex',
        alignItems:'center',
        gap:12,
        padding:'10px 16px',
        whiteSpace:'nowrap',
        lineHeight:1.3,
        maxWidth:'60vw',
        background:'var(--color-accent)',
        color:'#f3f2f2',
        border:0
      }}
    >
      <span id="success-title" data-testid="success-title" style={{fontSize:14, fontFamily:'var(--font-heading)', fontWeight:800}}>{successMessage}</span>
      <button
        aria-label="Close"
        id="success-close"
        data-testid="success-close"
        onClick={closeSuccess}
        style={{
          height:24,
          width:24,
          padding:0,
          lineHeight:'24px',
          display:'inline-flex',
          alignItems:'center',
          justifyContent:'center',
          background:'#f3f2f2',
          border:0,
          color:'var(--color-accent)',
          cursor:'pointer',
          fontWeight:800
        }}
      >
        ×
      </button>
    </div>
  )
}


