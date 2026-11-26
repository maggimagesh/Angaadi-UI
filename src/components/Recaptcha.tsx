import { useEffect, useRef } from 'react'
import { loadRecaptcha, recaptchaEnabled, RECAPTCHA_SITE_KEY } from '../lib/recaptcha'

type Props = {
  /** Called with the token when solved, and with null when it expires/errors/resets. */
  onChange: (token: string | null) => void
  /** Bump this number to reset the widget (tokens are single-use). */
  resetKey?: number
  id?: string
}

/** Google reCAPTCHA v2 checkbox. Renders nothing when no site key is configured. */
export default function Recaptcha({ onChange, resetKey = 0, id }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const widget = useRef<number | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!recaptchaEnabled) return
    let cancelled = false
    loadRecaptcha()
      .then((g) => {
        if (cancelled || !box.current || widget.current !== null) return
        const dark = document.documentElement.getAttribute('data-scheme') === 'dark'
        widget.current = g.render(box.current, {
          sitekey: RECAPTCHA_SITE_KEY,
          theme: dark ? 'dark' : 'light',
          callback: (t: string) => onChangeRef.current(t),
          'expired-callback': () => onChangeRef.current(null),
          'error-callback': () => onChangeRef.current(null),
        })
      })
      .catch(() => onChangeRef.current(null))
    return () => {
      cancelled = true
      // Tokens are tied to this widget; drop it so a stale one is never sent.
      onChangeRef.current(null)
    }
  }, [])

  useEffect(() => {
    if (resetKey === 0 || widget.current === null) return
    window.grecaptcha?.reset(widget.current)
    onChangeRef.current(null)
  }, [resetKey])

  if (!recaptchaEnabled) return null
  return <div ref={box} id={id} data-testid={id} style={{ minHeight: 78 }} />
}
