import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  buildWebhookCaptureUrl,
  buildWebhookInspectorPath,
  createWebhookToken,
  getWebhookPublicApiOrigin,
  isValidWebhookToken,
  isLoopbackWebhookOrigin,
} from '../api/legacyWebhook'

export default function LegacyWebhookLanding() {
  const navigate = useNavigate()
  const [tokenInput, setTokenInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const publicApiOrigin = getWebhookPublicApiOrigin()
  const showPublicUrlWarning = isLoopbackWebhookOrigin(publicApiOrigin)

  const openToken = (value: string) => {
    const token = value.trim()

    if (!isValidWebhookToken(token)) {
      setError('Use 10 to 128 characters with letters, numbers, hyphens, or underscores.')
      return
    }

    setError(null)
    navigate(buildWebhookInspectorPath(token))
  }

  const exampleToken = 'demoWebhook12345'

  return (
    <main className="app-main" id="legacy-webhook-landing-page" data-testid="legacy-webhook-landing-page">
      <section className="container p-6">
        <div
          className="card p-6"
          style={{
            background:
              'var(--color-bg)',
            border: '1px solid rgba(35, 36, 40, 0.1)',
            borderRadius: 0,
            }}
        >
          <div style={{ display: 'grid', gap: 18 }}>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.78rem',
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  fontWeight: 800,
                  color: '#9b4d12',
                }}
              >
                Webhook Inspector
              </p>
              <h1 style={{ marginTop: 10 }}>Legacy webhook path.</h1>
              <p style={{ margin: '12px 0 0', maxWidth: 760, color: 'var(--color-text-secondary)' }}>
                This keeps the previous webhook strategy unchanged on the existing path.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 16,
                alignItems: 'end',
              }}
            >
              <button
                className="btn btn-primary"
                style={{ minHeight: 54, fontWeight: 700 }}
                onClick={() => openToken(createWebhookToken())}
              >
                Create New Inbox
              </button>

              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  openToken(tokenInput)
                }}
                style={{ display: 'grid', gap: 10 }}
              >
                <label htmlFor="legacy-webhook-token-input" style={{ fontWeight: 700 }}>
                  Open existing token
                </label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    gap: 10,
                  }}
                >
                  <input
                    id="legacy-webhook-token-input"
                    className="input"
                    type="text"
                    placeholder="Paste token"
                    value={tokenInput}
                    onChange={(event) => setTokenInput(event.target.value)}
                    autoComplete="off"
                  />
                  <button type="submit" className="btn btn-primary">
                    Open
                  </button>
                </div>
              </form>
            </div>

            {error ? (
              <p style={{ margin: 0, color: 'var(--color-danger)', fontWeight: 700 }}>{error}</p>
            ) : null}

            {showPublicUrlWarning ? (
              <div
                style={{
                  padding: 16,
                  borderRadius: 0,
                  background: 'rgba(255, 238, 210, 0.9)',
                  border: '1px solid rgba(155, 77, 18, 0.2)',
                  color: '#6e3a10',
                }}
              >
                External webhook providers cannot reach <code>{publicApiOrigin}</code>. This page is
                intentionally left on the previous strategy.
              </div>
            ) : null}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 16,
                marginTop: 4,
              }}
            >
              <div
                style={{
                  padding: 18,
                  borderRadius: 0,
                  background: 'rgba(255,255,255,0.72)',
                  border: '1px solid rgba(35, 36, 40, 0.08)',
                }}
              >
                <h2 style={{ marginBottom: 10 }}>UI path</h2>
                <code style={{ overflowWrap: 'anywhere' }}>{buildWebhookInspectorPath(exampleToken)}</code>
              </div>
              <div
                style={{
                  padding: 18,
                  borderRadius: 0,
                  background: 'rgba(255,255,255,0.72)',
                  border: '1px solid rgba(35, 36, 40, 0.08)',
                }}
              >
                <h2 style={{ marginBottom: 10 }}>Receive URL shape</h2>
                <code style={{ overflowWrap: 'anywhere' }}>{buildWebhookCaptureUrl(exampleToken)}</code>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
