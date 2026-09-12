import { THEME_LABELS, nextTheme } from '../theme/theme'
import { useTheme } from '../theme/useTheme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isMacOS = theme === 'macos-27'
  const target = nextTheme(theme)

  return (
    <button
      type="button"
      className="theme-toggle"
      data-testid="theme-toggle"
      onClick={toggleTheme}
      role="switch"
      aria-checked={isMacOS}
      aria-label={`Switch to ${THEME_LABELS[target]} theme`}
      title={`Switch to ${THEME_LABELS[target]} theme`}
    >
      <span className="theme-toggle-copy" aria-hidden="true">
        <span className="theme-toggle-eyebrow">Appearance</span>
        <span className="theme-toggle-label">{THEME_LABELS[theme]}</span>
      </span>
      <span className="theme-toggle-track" aria-hidden="true">
        <span className="theme-toggle-thumb">
          {isMacOS ? <AuroraGlyph /> : <StorefrontGlyph />}
        </span>
      </span>
    </button>
  )
}

function AuroraGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="4.7" fill="currentColor" fillOpacity="0.22" />
      <path d="M7 1.1v1.25M7 11.65v1.25M1.1 7h1.25M11.65 7h1.25M2.84 2.84l.88.88M10.28 10.28l.88.88M11.16 2.84l-.88.88M3.72 10.28l-.88.88" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <circle cx="7" cy="7" r="2.25" fill="currentColor" />
    </svg>
  )
}

function StorefrontGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2 5.4h10v6.1H2zM1.4 5.4l1.1-3h9l1.1 3" stroke="currentColor" strokeWidth="1.15" strokeLinejoin="round" />
      <path d="M5 11.5V8h4v3.5M1.5 5.4c0 .9.7 1.5 1.5 1.5s1.5-.6 1.5-1.5c0 .9.7 1.5 1.5 1.5s1.5-.6 1.5-1.5c0 .9.7 1.5 1.5 1.5s1.5-.6 1.5-1.5c0 .9.7 1.5 1.5 1.5s1.5-.6 1.5-1.5" stroke="currentColor" strokeWidth="1.05" strokeLinecap="round" />
    </svg>
  )
}

export default ThemeToggle
