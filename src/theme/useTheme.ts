import { useCallback, useEffect, useState } from 'react'
import {
  applyTheme,
  isTheme,
  nextTheme,
  readStoredTheme,
  THEME_STORAGE_KEY,
  type Theme,
} from './theme'

export function useTheme(): { theme: Theme; setTheme: (theme: Theme) => void; toggleTheme: () => void } {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'storefront'
    return readStoredTheme()
  })

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Keep multiple open Angaadi tabs in sync without introducing a global
  // store or an animation dependency.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY && isTheme(event.newValue)) {
        setThemeState(event.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setTheme = useCallback((next: Theme) => setThemeState(next), [])
  const toggleTheme = useCallback(() => setThemeState((current) => nextTheme(current)), [])

  return { theme, setTheme, toggleTheme }
}
