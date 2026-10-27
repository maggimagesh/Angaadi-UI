/* Three themes: Vision (the default), Apple, and the macOS 27 frost theme. All
   are CSS layers over the shared base in design-system.css / app.css, enabled
   by data-theme on <html>, which is therefore always set. Vision reuses the
   Apple component skin (apple.css) and re-points its tokens at a dark violet
   spatial-glass palette (vision.css).

   Appearance (light / dark / system) is a second, independent axis. It is
   resolved to a concrete scheme and written as data-scheme on <html>, so every
   theme can carry its own dark palette. The inline script in index.html runs
   the same resolution before first paint — keep the two in step. */

export const THEMES = ['vision', 'apple', 'macos-27'] as const

export type Theme = (typeof THEMES)[number]

export const DEFAULT_THEME: Theme = 'vision'

export const THEME_STORAGE_KEY = 'angaadi:theme'

export const THEME_LABELS: Record<Theme, string> = {
  vision: 'Vision',
  'macos-27': 'macOS 27',
  apple: 'Apple',
}

export const THEME_DESCRIPTIONS: Record<Theme, string> = {
  vision: 'Spatial glass, indigo glow and floating panels',
  'macos-27': 'Frosted glass windows and aurora light',
  apple: 'Clean canvas, SF type and pill buttons',
}

export const APPEARANCES = ['light', 'dark', 'system'] as const

export type Appearance = (typeof APPEARANCES)[number]

export type Scheme = Exclude<Appearance, 'system'>

/* What a visitor sees until they pick a mode themselves. Vision is a night-room
   look first, so it opens dark; the other themes keep their light default. A
   mode the visitor has chosen always wins, whatever the theme. */
export const DEFAULT_APPEARANCE_BY_THEME: Record<Theme, Appearance> = {
  vision: 'dark',
  apple: 'light',
  'macos-27': 'light',
}

export function defaultAppearance(theme: Theme): Appearance {
  return DEFAULT_APPEARANCE_BY_THEME[theme]
}

export const APPEARANCE_STORAGE_KEY = 'angaadi:appearance'

export const APPEARANCE_LABELS: Record<Appearance, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}

const THEME_COLORS: Record<Theme, Record<Scheme, string>> = {
  vision: { light: '#ebe8ff', dark: '#0a0b26' },
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

function readStored<T>(key: string, guard: (value: unknown) => value is T): T | null {
  try {
    const stored = window.localStorage.getItem(key)
    if (guard(stored)) return stored
  } catch {
    // Storage may be unavailable in private or restricted browsing modes.
  }
  return null
}

function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Persistence is optional; the in-memory setting remains fully functional.
  }
}

export function readStoredTheme(): Theme {
  return readStored(THEME_STORAGE_KEY, isTheme) ?? DEFAULT_THEME
}

/** The mode the visitor chose, or null when they never did. */
export function readStoredAppearance(): Appearance | null {
  return readStored(APPEARANCE_STORAGE_KEY, isAppearance)
}

export function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches
}

export function resolveScheme(appearance: Appearance): Scheme {
  if (appearance === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return appearance
}

/* Writes both axes to <html>. Light leaves no data-scheme attribute, so the
   light DOM is exactly what it was before appearance existed. The appearance is
   only persisted once the visitor has picked one — until then it follows the
   theme's own default, so switching theme also switches that default. */
export function applyTheme(
  theme: Theme,
  appearance: Appearance = readStoredAppearance() ?? defaultAppearance(theme),
  persistAppearance = true,
): void {
  const root = document.documentElement
  const scheme = resolveScheme(appearance)

  root.setAttribute('data-theme', theme)

  if (scheme === 'dark') {
    root.setAttribute('data-scheme', 'dark')
  } else {
    root.removeAttribute('data-scheme')
  }

  root.style.colorScheme = scheme

  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (themeColor) themeColor.content = THEME_COLORS[theme][scheme]

  writeStored(THEME_STORAGE_KEY, theme)
  if (persistAppearance) writeStored(APPEARANCE_STORAGE_KEY, appearance)
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
