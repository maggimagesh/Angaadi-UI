import { useCallback, useEffect, useState, type ReactNode } from 'react'
import Recaptcha from './Recaptcha'
import { checkScore, recaptchaEnabled, recaptchaV3Enabled, verifyRecaptcha, type ScoreResult } from '../lib/recaptcha'

// Once a visitor passes (by score or by the checkbox), reloads in the same tab
// skip the check. Per-tab only, so a new tab or browser session checks again.
const PASSED_KEY = 'angaadi:recaptcha-passed'

function hasPassed(): boolean {
  try { return sessionStorage.getItem(PASSED_KEY) === '1' } catch { return false }
}
function markPassed() {
  try { sessionStorage.setItem(PASSED_KEY, '1') } catch { /* storage unavailable */ }
}

type Status = 'checking' | 'passed' | 'challenge' | 'blocked'

// One check per page load, even if React mounts the gate twice (StrictMode).
let pageLoadCheck: Promise<ScoreResult> | null = null

/**
 * Checks on page load whether the visitor is a person, with an invisible
 * reCAPTCHA v3 score. The page renders straight away; only when Google scores
 * the visitor as a likely bot is it covered by an "I'm not a robot" checkbox
 * (or, with no v2 key configured, a blocking notice with a retry button).
 *
 * Fails open: if the check itself cannot run (script blocked, Google or the
 * API unreachable), the visitor is let through rather than locked out.
 */
export default function BotGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>(() =>
    !recaptchaV3Enabled || hasPassed() ? 'passed' : 'checking',
  )
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaReset, setCaptchaReset] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const runCheck = useCallback(async (retry = false) => {
    setStatus('checking')
    if (retry || !pageLoadCheck) pageLoadCheck = checkScore('pageload')
    const verdict = await pageLoadCheck
    if (verdict === 'human') {
      markPassed()
      setStatus('passed')
    } else if (verdict === 'unknown') {
      setStatus('passed')
    } else {
      setStatus(recaptchaEnabled ? 'challenge' : 'blocked')
    }
  }, [])

  useEffect(() => {
    if (status === 'checking') void runCheck()
    // Run once on page load; retries call runCheck directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submitChallenge = async () => {
    setBusy(true)
    setError(null)
    const err = await verifyRecaptcha(captchaToken)
    setBusy(false)
    if (err) {
      setError(err)
      setCaptchaReset((n) => n + 1)
      return
    }
    markPassed()
    setStatus('passed')
  }

  const gated = status === 'challenge' || status === 'blocked'

  return (
    <>
      <div inert={gated} aria-hidden={gated || undefined} style={{ display: 'contents' }}>
        {children}
      </div>
      {gated && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bot-gate-title"
          id="bot-gate"
          data-testid="bot-gate"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2147483000,
            display: 'grid',
            placeItems: 'center',
            padding: 16,
            background: 'color-mix(in srgb, var(--color-bg, #f5f5f7) 92%, transparent)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 380,
              display: 'grid',
              gap: 14,
              justifyItems: 'center',
              textAlign: 'center',
              padding: 24,
              borderRadius: 16,
              background: 'var(--color-card, #fff)',
              color: 'var(--color-text, #1d1d1f)',
              border: '1px solid var(--color-border, #d2d2d7)',
              boxShadow: '0 12px 40px rgba(0,0,0,.18)',
            }}
          >
            <h2 id="bot-gate-title" style={{ margin: 0, fontSize: 20 }}>
              {status === 'challenge' ? 'Quick check' : "We couldn't verify your browser"}
            </h2>
            <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: 14 }}>
              {status === 'challenge'
                ? 'Please confirm you are not a robot to continue to Angaadi.'
                : 'Our security check flagged this visit as automated. Please try again.'}
            </p>

            {status === 'challenge' && (
              <>
                <Recaptcha id="bot-gate-recaptcha" onChange={setCaptchaToken} resetKey={captchaReset} />
                {error && (
                  <div role="alert" style={{ color: 'var(--color-danger)', fontSize: 14 }}>
                    {error}
                  </div>
                )}
                <button
                  className="btn btn-primary btn-block"
                  id="bot-gate-continue"
                  data-testid="bot-gate-continue"
                  disabled={!captchaToken || busy}
                  onClick={submitChallenge}
                >
                  {busy ? 'Checking…' : 'Continue'}
                </button>
              </>
            )}

            {status === 'blocked' && (
              <button
                className="btn btn-primary btn-block"
                id="bot-gate-retry"
                data-testid="bot-gate-retry"
                onClick={() => void runCheck(true)}
              >
                Try again
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
