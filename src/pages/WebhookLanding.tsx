import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  buildWebhookCaptureUrl,
  buildWebhookInspectorPath,
  createWebhookToken,
  getWebhookApiOrigin,
  isValidWebhookToken,
} from '../api/webhook'

export default function WebhookLanding() {
  const navigate = useNavigate()
  const [tokenInput, setTokenInput] = useState('')
  const [error, setError] = useState<string | null>(null)

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
              'radial-gradient(circle at top left, rgba(255, 192, 120, 0.18), transparent 28%), linear-gradient(180deg, #fffdf8 0%, #f7efe2 100%)',
            border: '1px solid rgba(35, 36, 40, 0.1)',
            borderRadius: '28px',
            boxShadow: '0 24px 60px rgba(31, 37, 42, 0.08)',
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
              <h1 style={{ marginTop: 10 }}>Receive webhooks on API `3300`, inspect them on UI `3000`.</h1>
              <p style={{ margin: '12px 0 0', maxWidth: 760, color: 'var(--color-text-secondary)' }}>
                Create a token here, send payloads to the API host, and view all captured request and
                response data in this UI.
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
                  borderRadius: 20,
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
                  borderRadius: 20,
                  background: 'rgba(255,255,255,0.72)',
                  border: '1px solid rgba(35, 36, 40, 0.08)',
                }}
              >
                <h2 style={{ marginBottom: 10 }}>Receive URL shape</h2>
                <code style={{ overflowWrap: 'anywhere' }}>{buildWebhookCaptureUrl(exampleToken)}</code>
              </div>
            </div>

            <div
              style={{
                padding: 18,
                borderRadius: 20,
                background: '#1f252a',
                color: '#f7efe2',
                overflowX: 'auto',
              }}
            >
              <div style={{ fontSize: '0.78rem', letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.8 }}>
                Quick test
              </div>
              <pre style={{ margin: '12px 0 0', whiteSpace: 'pre-wrap', fontFamily: '"JetBrains Mono", monospace' }}>{`curl -X POST \\
  -H "Content-Type: application/json" \\
  -d '{"message":"hello"}' \\
  ${getWebhookApiOrigin()}/hook/<token>`}</pre>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
