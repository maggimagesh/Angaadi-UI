import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'
import {
  APPEARANCE_LABELS,
  APPEARANCES,
  THEME_DESCRIPTIONS,
  THEME_LABELS,
  THEMES,
  type Appearance,
  type Theme,
} from '../theme/theme'
import { useTheme } from '../theme/useTheme'

/* The header's appearance control: one button that opens a small settings
   panel with two native radio groups — the visual theme and the light / dark
   / system appearance. Native radios give arrow-key movement, Space to pick
   and correct screen-reader semantics for free; the panel adds Escape,
   outside-click and focus-return on top. */

export function ThemeToggle() {
  const { theme, appearance, scheme, setTheme, setAppearance } = useTheme()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const titleId = useId()

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }, [])

  // The panel hangs from the trigger's right edge. On narrow screens the
  // trigger sits mid-header, so nudge the panel back inside a 12px gutter.
  // (position: fixed is not an option — the frosted headers' backdrop-filter
  // would become its containing block.)
  useLayoutEffect(() => {
    const panel = panelRef.current
    if (!open || !panel) return
    const place = () => {
      panel.style.right = '0px'
      // Measure from the right edge and the layout width: the entry
      // animation scales the panel from its top-right corner, so its
      // painted left edge is not where it will settle.
      const right = panel.getBoundingClientRect().right
      const left = right - panel.offsetWidth
      const gutter = 12
      const overflowLeft = gutter - left
      const overflowRight = right - (window.innerWidth - gutter)
      if (overflowLeft > 0) panel.style.right = `${-overflowLeft}px`
      else if (overflowRight > 0) panel.style.right = `${overflowRight}px`
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [open])

  // Move focus into the panel on open: the checked theme radio is where a
  // keyboard user most likely wants to start.
  useEffect(() => {
    if (!open) return
    const checked = panelRef.current?.querySelector<HTMLInputElement>('input[name$="-theme"]:checked')
    checked?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) close(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, close])

  const onPanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      close(true)
    }
  }

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' && !open) {
      event.preventDefault()
      setOpen(true)
    }
  }

  // Tabbing past the last control closes the panel instead of leaving it
  // floating over the page.
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (open && event.relatedTarget && !wrapRef.current?.contains(event.relatedTarget as Node)) close(false)
  }

  return (
    <div className="theme-menu" ref={wrapRef} onBlur={onBlur} data-open={open ? 'true' : 'false'}>
      <button
        ref={triggerRef}
        type="button"
        id="theme-toggle"
        className="theme-toggle"
        data-testid="theme-toggle"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Appearance settings: ${THEME_LABELS[theme]} theme, ${APPEARANCE_LABELS[appearance]} mode`}
        title={`Appearance: ${THEME_LABELS[theme]} · ${APPEARANCE_LABELS[appearance]}`}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="theme-toggle-copy" aria-hidden="true">
          <span className="theme-toggle-eyebrow">Appearance</span>
          <span className="theme-toggle-label">{THEME_LABELS[theme]}</span>
        </span>
        {/* The track reads as the light/dark state at a glance; the thumb
            slides across when the resolved scheme is dark. */}
        <span className="theme-toggle-track" data-scheme={scheme} aria-hidden="true">
          <span className="theme-toggle-thumb">{scheme === 'dark' ? <MoonGlyph /> : <SunGlyph />}</span>
        </span>
      </button>

      <div
        ref={panelRef}
        id={panelId}
        className="theme-panel"
        role="dialog"
        aria-labelledby={titleId}
        data-testid="theme-panel"
        hidden={!open}
        onKeyDown={onPanelKeyDown}
      >
        <p className="theme-panel-title" id={titleId}>
          Appearance
        </p>

        <fieldset className="theme-panel-group">
          <legend className="theme-panel-legend">Theme</legend>
          <div className="theme-options">
            {THEMES.map((value) => (
              <label key={value} className="theme-option" data-testid={`theme-option-${value}`}>
                <input
                  type="radio"
                  name={`${panelId}-theme`}
                  value={value}
                  checked={theme === value}
                  onChange={() => setTheme(value as Theme)}
                />
                <span className={`theme-swatch theme-swatch-${value}`} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="theme-option-copy">
                  <span className="theme-option-name">{THEME_LABELS[value]}</span>
                  <span className="theme-option-note">{THEME_DESCRIPTIONS[value]}</span>
                </span>
                <span className="theme-option-check" aria-hidden="true" />
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="theme-panel-group">
          <legend className="theme-panel-legend">Mode</legend>
          <div className="appearance-seg">
            {APPEARANCES.map((value) => (
              <label key={value} className="appearance-opt" data-testid={`appearance-option-${value}`}>
                <input
                  type="radio"
                  name={`${panelId}-appearance`}
                  value={value}
                  checked={appearance === value}
                  onChange={() => setAppearance(value as Appearance)}
                />
                <span className="appearance-opt-face">
                  {value === 'light' ? <SunGlyph /> : value === 'dark' ? <MoonGlyph /> : <SystemGlyph />}
                  {APPEARANCE_LABELS[value]}
                </span>
              </label>
            ))}
          </div>
          {appearance === 'system' && (
            <p className="theme-panel-note" aria-live="polite">
              Following your device — currently {scheme}.
            </p>
          )}
        </fieldset>
      </div>
    </div>
  )
}

function SunGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="2.6" fill="currentColor" />
      <path
        d="M7 1.2v1.3M7 11.5v1.3M1.2 7h1.3M11.5 7h1.3M2.9 2.9l.9.9M10.2 10.2l.9.9M11.1 2.9l-.9.9M3.8 10.2l-.9.9"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MoonGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M11.8 8.6A5 5 0 0 1 5.4 2.2a5 5 0 1 0 6.4 6.4Z" fill="currentColor" />
    </svg>
  )
}

function SystemGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="1.5" y="2.2" width="11" height="7.6" rx="1.4" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 2.2v7.6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 2.8h4.9v6.4H7z" fill="currentColor" />
      <path d="M4.8 12h4.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

export default ThemeToggle
