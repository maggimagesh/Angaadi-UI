/* The existing Storefront theme is the default. The macOS 27 frost theme and
   the Apple theme are additive CSS layers enabled by data-theme on <html>.

   Appearance (light / dark / system) is a second, independent axis. It is
   resolved to a concrete scheme and written as data-scheme on <html>, so every
   theme can carry its own dark palette. The inline script in index.html runs
   the same resolution before first paint — keep the two in step. */

export const THEMES = ['storefront', 'macos-27', 'apple'] as const

export type Theme = (typeof THEMES)[number]

export const DEFAULT_THEME: Theme = 'storefront'

export const THEME_STORAGE_KEY = 'angaadi:theme'

export const THEME_LABELS: Record<Theme, string> = {
  storefront: 'Storefront',
  'macos-27': 'macOS 27',
  apple: 'Apple',
}

export const THEME_DESCRIPTIONS: Record<Theme, string> = {
  storefront: 'Navy belt, grey ground, gold buy buttons',
  'macos-27': 'Frosted glass windows and aurora light',
  apple: 'Clean canvas, SF type and pill buttons',
}

export const APPEARANCES = ['light', 'dark', 'system'] as const

export type Appearance = (typeof APPEARANCES)[number]

export type Scheme = Exclude<Appearance, 'system'>

/* Light keeps every existing visitor's storefront exactly as it was; dark and
   system are opt-in from the appearance menu. */
export const DEFAULT_APPEARANCE: Appearance = 'light'

export const APPEARANCE_STORAGE_KEY = 'angaadi:appearance'

export const APPEARANCE_LABELS: Record<Appearance, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}

const THEME_COLORS: Record<Theme, Record<Scheme, string>> = {
  storefront: { light: '#131921', dark: '#0b0f14' },
  'macos-27': { light: '#e9f1fb', dark: '#141a26' },
  apple: { light: '#f5f5f7', dark: '#000000' },
}

const DARK_QUERY = '(prefers-color-scheme: dark)'

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value)
}

export function isAppearance(value: unknown): value is Appearance {
  return typeof value === 'string' && (APPEARANCES as readonly string[]).includes(value)
}

function readStored<T>(key: string, guard: (value: unknown) => value is T, fallback: T): T {
  try {
    const stored = window.localStorage.getItem(key)
    if (guard(stored)) return stored
  } catch {
    // Storage may be unavailable in private or restricted browsing modes.
  }
  return fallback
}

function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Persistence is optional; the in-memory setting remains fully functional.
  }
}

export function readStoredTheme(): Theme {
  return readStored(THEME_STORAGE_KEY, isTheme, DEFAULT_THEME)
}

export function readStoredAppearance(): Appearance {
  return readStored(APPEARANCE_STORAGE_KEY, isAppearance, DEFAULT_APPEARANCE)
}

export function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches
}

export function resolveScheme(appearance: Appearance): Scheme {
  if (appearance === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return appearance
}

/* Writes both axes to <html>. Light leaves no data-scheme attribute, so the
   light DOM is exactly what it was before appearance existed. */
export function applyTheme(theme: Theme, appearance: Appearance = readStoredAppearance()): void {
  const root = document.documentElement
  const scheme = resolveScheme(appearance)

  if (theme === DEFAULT_THEME) {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', theme)
  }

  if (scheme === 'dark') {
    root.setAttribute('data-scheme', 'dark')
  } else {
    root.removeAttribute('data-scheme')
  }

  root.style.colorScheme = scheme

  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (themeColor) themeColor.content = THEME_COLORS[theme][scheme]

  writeStored(THEME_STORAGE_KEY, theme)
  writeStored(APPEARANCE_STORAGE_KEY, appearance)
}

export function nextTheme(current: Theme): Theme {
  const index = THEMES.indexOf(current)
  return THEMES[(index + 1) % THEMES.length]
}

export function watchSystemScheme(onChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => {}
  const query = window.matchMedia(DARK_QUERY)
  // Safari < 14 only implements the deprecated addListener API.
  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }
  query.addListener(onChange)
  return () => query.removeListener(onChange)
}
