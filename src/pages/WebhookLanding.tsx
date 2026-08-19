import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  buildWebhookCaptureUrl,
  buildWebhookInspectorPath,
  createWebhookToken,
  DEFAULT_WEBHOOK_RETENTION_HOURS,
  getWebhookPublicApiOrigin,
  isValidWebhookToken,
  isLoopbackWebhookOrigin,
} from '../api/webhook'

export default function WebhookLanding() {
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
    <main className="app-main" id="webhook-landing-page" data-testid="webhook-landing-page">
      <section className="container p-6">
        <div
          className="card p-6"
          style={{
            background:
              'var(--color-bg)',
            border: '1px solid color-mix(in srgb, var(--color-text) 10%, transparent)',
            borderRadius: 'var(--radius-md)',
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
                  color: 'var(--color-accent-2-700)',
                }}
              >
                Webhook Inspector
              </p>
              <h1 style={{ marginTop: 10 }}>Receive webhooks on the public API URL and inspect them here.</h1>
              <p style={{ margin: '12px 0 0', maxWidth: 760, color: 'var(--color-text-secondary)' }}>
                Create a token here, send payloads to the generated webhook URL, and inspect all
                captured request and response data from this UI.
              </p>
              <p
                style={{
                  margin: '8px 0 0',
                  maxWidth: 760,
                  color: 'var(--color-accent-2-700)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                }}
              >
                Data retention: {DEFAULT_WEBHOOK_RETENTION_HOURS} hours. Captured requests and their
                bodies are permanently deleted after that.
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
                <label htmlFor="webhook-token-input" style={{ fontWeight: 700 }}>
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
                    id="webhook-token-input"
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
                  borderRadius: 'var(--radius-md)',
                  background: 'color-mix(in srgb, var(--color-accent-2-100) 90%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--color-accent-2-700) 20%, transparent)',
                  color: 'var(--color-accent-2-800)',
                }}
              >
                External webhook providers cannot reach <code>{publicApiOrigin}</code>. Set
                <code> VITE_WEBHOOK_PUBLIC_API_ORIGIN</code> to your public production API origin.
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
                  borderRadius: 'var(--radius-md)',
                  background: 'color-mix(in srgb, var(--color-surface-raised) 72%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--color-text) 8%, transparent)',
                }}
              >
                <h2 style={{ marginBottom: 10 }}>UI path</h2>
                <code style={{ overflowWrap: 'anywhere' }}>{buildWebhookInspectorPath(exampleToken)}</code>
              </div>
              <div
                style={{
                  padding: 18,
                  borderRadius: 'var(--radius-md)',
                  background: 'color-mix(in srgb, var(--color-surface-raised) 72%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--color-text) 8%, transparent)',
                }}
              >
                <h2 style={{ marginBottom: 10 }}>Receive URL shape</h2>
                <code style={{ overflowWrap: 'anywhere' }}>{buildWebhookCaptureUrl(exampleToken)}</code>
              </div>
            </div>

            <div
              style={{
                padding: 18,
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-text)',
                color: 'var(--color-accent-2-100)',
                overflowX: 'auto',
              }}
            >
              <div style={{ fontSize: '0.78rem', letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.8 }}>
                Quick test
              </div>
              <pre style={{ margin: '12px 0 0', whiteSpace: 'pre-wrap', fontFamily: '"JetBrains Mono", monospace' }}>{`curl -X POST \\
  -H "Content-Type: application/json" \\
  -d '{"message":"hello"}' \\
  ${publicApiOrigin}/valid-webhooks/<token>`}</pre>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
