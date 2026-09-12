/* The existing Storefront theme is the default. The macOS 27-inspired theme
   is an additive CSS layer enabled only by data-theme="macos-27" on <html>. */

export const THEMES = ['storefront', 'macos-27'] as const

export type Theme = (typeof THEMES)[number]

export const DEFAULT_THEME: Theme = 'storefront'

export const THEME_STORAGE_KEY = 'angaadi:theme'

export const THEME_LABELS: Record<Theme, string> = {
  storefront: 'Storefront',
  'macos-27': 'macOS 27',
}

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value)
}

export function readStoredTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (isTheme(stored)) return stored
  } catch {
    // Storage may be unavailable in private or restricted browsing modes.
  }
  return DEFAULT_THEME
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')

  if (theme === DEFAULT_THEME) {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', theme)
  }

  root.style.colorScheme = 'light'
  if (themeColor) {
    themeColor.content = theme === 'macos-27' ? '#e9f1fb' : '#131921'
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Persistence is optional; the in-memory theme remains fully functional.
  }
}

export function nextTheme(current: Theme): Theme {
  return current === 'macos-27' ? 'storefront' : 'macos-27'
}
