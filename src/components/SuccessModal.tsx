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
    <div role="dialog" aria-modal="true" aria-label="Success" id="success-modal" data-testid="success-modal" style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50}}>
      <div className="card p-6" style={{minWidth:320, textAlign:'center', position:'relative'}}>
        <button aria-label="Close" id="success-close" data-testid="success-close" className="btn" style={{position:'absolute', right:12, top:12}} onClick={closeSuccess}>×</button>
        <svg
          id="success-icon"
          data-testid="success-icon"
          role="img"
          aria-label="Success"
          width="64"
          height="64"
          viewBox="0 0 24 24"
          style={{display:'block', margin:'0 auto'}}
        >
          <path d="M5 13l4 4L19 7" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h3 className="mt-4" id="success-title" data-testid="success-title">{successMessage}</h3>
      </div>
    </div>
  )
}


