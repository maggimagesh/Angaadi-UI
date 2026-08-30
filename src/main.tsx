// Cross-browser compatibility polyfills
import 'core-js/stable'
import 'regenerator-runtime/runtime'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// The design system first: it owns the tokens and the component layer.
// Everything after it is the app shell and the screen layer, built on those
// tokens.
import './styles/design-system.css'
import './index.css'
import './styles/app.css'

import App from './App.tsx'
// Loaded after the complete route graph so its material layer consistently
// covers shopping screens, dialogs and specialist QA fixtures alike.
import './styles/liquid-glass.css'

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
    '--color-accent': '#b6a5ff',
    '--color-bg': '#080a10',
    '--color-text': '#f7f8ff',
  },
})

const rootEl = document.getElementById('root') as HTMLElement
rootEl.setAttribute('data-testid', 'root')

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
