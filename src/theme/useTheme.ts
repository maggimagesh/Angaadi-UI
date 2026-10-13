import { useCallback, useSyncExternalStore } from 'react'
import {
  APPEARANCE_STORAGE_KEY,
  applyTheme,
  isAppearance,
  isTheme,
  nextTheme,
  readStoredAppearance,
  readStoredTheme,
  resolveScheme,
  THEME_STORAGE_KEY,
  watchSystemScheme,
  type Appearance,
  type Scheme,
  type Theme,
} from './theme'

/* One module-level store so every subscriber (the header menu today, anything
   else tomorrow) reads the same theme without a global state library. */

type Snapshot = { theme: Theme; appearance: Appearance; scheme: Scheme }

const SERVER_SNAPSHOT: Snapshot = { theme: 'apple', appearance: 'light', scheme: 'light' }

let snapshot: Snapshot | null = null
const listeners = new Set<() => void>()
let teardown: (() => void) | null = null

function current(): Snapshot {
  if (!snapshot) {
    const theme = readStoredTheme()
    const appearance = readStoredAppearance()
    snapshot = { theme, appearance, scheme: resolveScheme(appearance) }
  }
  return snapshot
}

function emit(): void {
  listeners.forEach((listener) => listener())
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/* Swapping a theme flips hundreds of custom properties at once. Letting every
   element's own transition chase that change is what makes theme switches
   stutter, so transitions are suspended for the frame of the swap and the
   page cross-fades as one composited snapshot where the browser supports it.

   The store itself updates synchronously, so the menu's radios answer every
   key press at once; only writing the attributes to <html> rides the
   transition, and it always writes the latest state. Rapid arrowing through
   the options therefore never drops a step. */
let swapPending = false

function commit(next: Snapshot): void {
  snapshot = next
  emit()

  // A transition is already waiting to paint — it will pick up this state.
  if (swapPending) return

  const root = document.documentElement
  const swap = () => {
    swapPending = false
    const latest = current()
    applyTheme(latest.theme, latest.appearance)
  }

  root.setAttribute('data-theme-switching', '')
  const release = () =>
    requestAnimationFrame(() => requestAnimationFrame(() => root.removeAttribute('data-theme-switching')))

  const doc = document as Document & { startViewTransition?: (callback: () => void) => { finished: Promise<void> } }
  if (typeof doc.startViewTransition === 'function' && !prefersReducedMotion()) {
    swapPending = true
    doc.startViewTransition(swap).finished.finally(release)
  } else {
    swap()
    release()
  }
}

function update(patch: Partial<Pick<Snapshot, 'theme' | 'appearance'>>): void {
  const base = current()
  const theme = patch.theme ?? base.theme
  const appearance = patch.appearance ?? base.appearance
  const scheme = resolveScheme(appearance)
  if (theme === base.theme && appearance === base.appearance && scheme === base.scheme) return
  commit({ theme, appearance, scheme })
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)

  if (listeners.size === 1) {
    // Keep multiple open Angaadi tabs in sync, and follow the OS when the
    // appearance is "system".
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY && isTheme(event.newValue)) update({ theme: event.newValue })
      if (event.key === APPEARANCE_STORAGE_KEY && isAppearance(event.newValue)) update({ appearance: event.newValue })
    }
    const onSystemChange = () => {
      if (current().appearance === 'system') update({})
    }
    window.addEventListener('storage', onStorage)
    const unwatch = watchSystemScheme(onSystemChange)
    teardown = () => {
      window.removeEventListener('storage', onStorage)
      unwatch()
    }
    // The pre-paint script in index.html has already written the attributes;
    // re-apply once so a stale or partial boot state is corrected.
    applyTheme(current().theme, current().appearance)
  }

  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && teardown) {
      teardown()
      teardown = null
    }
  }
}

export function useTheme(): {
  theme: Theme
  appearance: Appearance
  scheme: Scheme
  setTheme: (theme: Theme) => void
  setAppearance: (appearance: Appearance) => void
  toggleTheme: () => void
} {
  const state = useSyncExternalStore(subscribe, current, () => SERVER_SNAPSHOT)

  const setTheme = useCallback((theme: Theme) => update({ theme }), [])
  const setAppearance = useCallback((appearance: Appearance) => update({ appearance }), [])
  const toggleTheme = useCallback(() => update({ theme: nextTheme(current().theme) }), [])

  return { ...state, setTheme, setAppearance, toggleTheme }
}
