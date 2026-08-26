/* ─────────────────────────────────────────────────────────────────────────
   Theme switching.

   Two themes ship with the app:

     'storefront'   — the Amazon-style retail system the app ships in: navy
                      chrome, a grey ground, white cards, teal links and the
                      two warm buy buttons. It is the default and it is
                      expressed by styles/design-system.css + index.css +
                      styles/app.css; nothing about it is conditional.

     'liquid-glass' — Apple's Liquid Glass material language, expressed by
                      styles/liquid-glass.css. Every rule in that file is
                      scoped under [data-theme='liquid-glass'], so the theme
                      is additive: it can only ever apply when the attribute
                      is set, and removing the attribute restores Storefront
                      byte for byte.

   The attribute lives on <html> so CSS can reach it from any subtree and so
   the choice survives a full-page navigation without a flash (see the
   inline bootstrap in index.html).
   ───────────────────────────────────────────────────────────────────────── */

export const THEMES = ['storefront', 'liquid-glass'] as const

export type Theme = (typeof THEMES)[number]

export const DEFAULT_THEME: Theme = 'storefront'

export const THEME_STORAGE_KEY = 'angaadi:theme'

/** Human-readable names, used by the toggle's label and its a11y announcement. */
export const THEME_LABELS: Record<Theme, string> = {
  storefront: 'Storefront',
  'liquid-glass': 'Liquid Glass',
}

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value)
}

/** The persisted choice, or the default when nothing valid is stored. */
export function readStoredTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (isTheme(stored)) return stored
  } catch {
    /* Storage can be unavailable (private mode, blocked cookies). Not fatal. */
  }
  return DEFAULT_THEME
}

/**
 * Write the theme to <html> and persist it.
 *
 * The default theme removes the attribute rather than setting
 * data-theme="storefront", so the DOM in the default case is identical to
 * what it was before theming existed.
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement

  if (theme === DEFAULT_THEME) {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', theme)
  }

  // Lets the browser render form controls, scrollbars and the like to match.
  root.style.colorScheme = theme === 'liquid-glass' ? 'light dark' : 'light'

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    /* Persistence is a nicety; the in-memory theme still applies. */
  }
}

export function nextTheme(current: Theme): Theme {
  return current === 'liquid-glass' ? 'storefront' : 'liquid-glass'
}
