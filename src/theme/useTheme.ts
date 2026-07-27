import { useCallback, useEffect, useState } from 'react'
import { applyTheme, nextTheme, readStoredTheme, type Theme } from './theme'

/**
 * Reads the theme chosen by the inline bootstrap in index.html, keeps it in
 * React state, and writes any change back to <html> + localStorage.
 *
 * The bootstrap has already applied the stored theme before first paint, so
 * the effect here is a re-assertion rather than the initial application — it
 * exists so the attribute is correct even if the bootstrap was skipped (for
 * example when the app is mounted into a host page in a test).
 */
export function useTheme(): { theme: Theme; setTheme: (t: Theme) => void; toggleTheme: () => void } {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'modernist'
    return readStoredTheme()
  })

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = useCallback((next: Theme) => setThemeState(next), [])

  const toggleTheme = useCallback(() => setThemeState((t) => nextTheme(t)), [])

  return { theme, setTheme, toggleTheme }
}
