import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const rootEl = document.getElementById('root') as HTMLElement
rootEl.setAttribute('data-testid', 'root')

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
