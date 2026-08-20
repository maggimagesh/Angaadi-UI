// Cross-browser compatibility polyfills
import 'core-js/stable'
import 'regenerator-runtime/runtime'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Modernist first: it owns the tokens and the component layer. Everything
// after it is the app shell and the screen layer, built from those tokens.
import './styles/modernist.css'
import './index.css'
import './styles/app.css'

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
    '--color-accent': '#2a6ab4',
    '--color-bg': '#fbfaf7',
    '--color-text': '#24344e',
  },
})

const rootEl = document.getElementById('root') as HTMLElement
rootEl.setAttribute('data-testid', 'root')

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
