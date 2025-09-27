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
    <div role="dialog" aria-modal="true" aria-label={termsTitle ?? 'Document'} id="doc-modal" data-testid="doc-modal" style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:51}}>
      <div className="card" style={{maxWidth:720, width:'90%', background:'#ffffff', color:'#000', padding:24, position:'relative'}}>
        <button aria-label="Close" id="doc-close" data-testid="doc-close" className="btn" style={{position:'absolute', right:12, top:12}} onClick={closeDoc}>×</button>
        <h2 style={{fontSize:20, margin:'0 0 12px 0', fontWeight:800, color:'#000'}}>{termsTitle}</h2>
        <div id="doc-body" data-testid="doc-body" style={{lineHeight:1.6, fontSize:16, color:'#000', fontWeight:400}} dangerouslySetInnerHTML={{ __html: termsBody ?? '' }} />
      </div>
    </div>
  )
}


