import { useEffect } from 'react'
import { useUIStore } from '../store/ui'

export function DocModal() {
  const { termsOpen, termsTitle, termsBody, closeDoc } = useUIStore()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeDoc()
    }
    if (termsOpen) {
      document.addEventListener('keydown', onKey)
      return () => document.removeEventListener('keydown', onKey)
    }
  }, [termsOpen, closeDoc])

  if (!termsOpen) return null
  return (
    <div className="dialog-backdrop modal-overlay" role="dialog" aria-modal="true" aria-label={termsTitle ?? 'Document'} id="doc-modal" data-testid="doc-modal" onClick={(e) => { if (e.target === e.currentTarget) closeDoc() }}>
      <div className="dialog elev-lg modal-surface" style={{width:'min(720px, 100%)'}} onClick={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <h2 className="dialog-title">{termsTitle}</h2>
          <button aria-label="Close" id="doc-close" data-testid="doc-close" className="dialog-close" onClick={closeDoc}>×</button>
        </div>
        <div className="dialog-body" id="doc-body" data-testid="doc-body" style={{lineHeight:1.6, fontSize:14}} dangerouslySetInnerHTML={{ __html: termsBody ?? '' }} />
      </div>
    </div>
  )
}


