import { useTheme } from '../theme/useTheme'
import { THEME_LABELS, nextTheme } from '../theme/theme'

/**
 * The single control that swaps the app between Storefront and Liquid Glass.
 *
 * It is a floating capsule pinned to the top-right corner of the viewport so
 * it is reachable from every route — including the fixture pages that never
 * render <Header />. Its z-index (65) puts it above the header, the mega
 * menu, the suggestion panel and the filter drawer, but below the dialog
 * layer (70), so an open modal correctly covers it.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const target = nextTheme(theme)
  const isGlass = theme === 'liquid-glass'

  return (
    <button
      type="button"
      className="theme-toggle"
      data-testid="theme-toggle"
      onClick={toggleTheme}
      aria-pressed={isGlass}
      title={`Switch to ${THEME_LABELS[target]} theme`}
      aria-label={`Switch to ${THEME_LABELS[target]} theme`}
    >
      <span className="theme-toggle-glyph" aria-hidden="true">
        {isGlass ? <GlassGlyph /> : <SquareGlyph />}
      </span>
      <span className="theme-toggle-label">{THEME_LABELS[theme]}</span>
    </button>
  )
}

/* Two overlapping rounded panes — the Liquid Glass state. */
function GlassGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.25" y="1.25" width="9.5" height="9.5" rx="3.2" stroke="currentColor" strokeWidth="1.3" />
      <rect
        x="5.25"
        y="5.25"
        width="9.5"
        height="9.5"
        rx="3.2"
        fill="currentColor"
        fillOpacity="0.28"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  )
}

/* A ruled grid — the Storefront state. */
function SquareGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.4" y="1.4" width="13.2" height="13.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 1.4v13.2M1.4 8h13.2" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  )
}

export default ThemeToggle
