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
      role="status"
      aria-live="polite"
      id="success-toast"
      data-testid="success-toast"
      style={{
        position:'fixed',
        top:12,
        right:12,
        zIndex:60,
        display:'inline-flex',
        alignItems:'center',
        gap:8,
        padding:'6px 10px',
        whiteSpace:'nowrap',
        lineHeight:1.2,
        maxWidth:'60vw',
        borderRadius:8,
        background:'#0f1219',
        border:'1px solid var(--color-border)',
        boxShadow:'var(--elev-2)'
      }}
    >
      <span id="success-title" data-testid="success-title" style={{fontSize:14}}>{successMessage}</span>
      <button
        aria-label="Close"
        id="success-close"
        data-testid="success-close"
        onClick={closeSuccess}
        style={{
          height:20,
          width:20,
          padding:0,
          lineHeight:'20px',
          display:'inline-flex',
          alignItems:'center',
          justifyContent:'center',
          background:'transparent',
          border:'1px solid var(--color-border)',
          borderRadius:6,
          color:'var(--color-text)',
          cursor:'pointer',
        }}
      >
        ×
      </button>
    </div>
  )
}


