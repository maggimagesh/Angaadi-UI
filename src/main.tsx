// Cross-browser compatibility polyfills
import 'core-js/stable'
import 'regenerator-runtime/runtime'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// CSS Variables Ponyfill for IE11 and older browsers
import cssVars from 'css-vars-ponyfill'

// Initialize CSS Variables Ponyfill
cssVars({
  // Options for the ponyfill
  watch: true, // Watch for changes
  onlyLegacy: true, // Only polyfill legacy browsers
  shadowDOM: false,
  silent: false,
  preserveStatic: true,
  preserveVars: false,
  variables: {
    // Fallback values for CSS custom properties
    '--color-primary': '#6750a4',
    '--color-bg': '#f7f2f9',
    '--color-text': '#1c1b1f',
  },
})

const rootEl = document.getElementById('root') as HTMLElement
rootEl.setAttribute('data-testid', 'root')

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
