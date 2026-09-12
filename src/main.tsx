// Cross-browser compatibility polyfills
import 'core-js/stable'
import 'regenerator-runtime/runtime'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// The design system first: it owns the tokens and the component layer.
// Everything after it is the app shell and the screen layer, built on those
// tokens. The macOS 27 theme loads last because it is an optional, scoped
// presentation layer over the unchanged storefront UI.
import './styles/design-system.css'
import './index.css'
import './styles/app.css'
import './styles/macos-27.css'

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
    '--color-accent': '#007185',
    '--color-bg': '#eaeded',
    '--color-text': '#0f1111',
  },
})

const rootEl = document.getElementById('root') as HTMLElement
rootEl.setAttribute('data-testid', 'root')

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
