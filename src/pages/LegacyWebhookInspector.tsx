import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  buildWebhookCaptureUrl,
  buildWebhookInspectorUrl,
  clearWebhookRequests,
  fetchWebhookRequests,
  getWebhookPublicApiOrigin,
  isLoopbackWebhookOrigin,
  isValidWebhookToken,
  type WebhookCaptureListResponse,
  type WebhookCaptureRecord,
} from '../api/legacyWebhook'

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString()
}

function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB']
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const size = bytes / 1024 ** unitIndex

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function renderValue(value: unknown): string {
  if (value === null || typeof value === 'undefined') {
    return 'None'
  }

  return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
}

function getRequestBodyText(record: WebhookCaptureRecord): string {
  if (record.body.format === 'json') {
    return renderValue(record.body.json)
  }

  if (record.body.format === 'binary') {
    return record.body.base64 || 'Binary body missing'
  }

  return record.body.text || 'No request body'
}

function getResponseBodyText(record: WebhookCaptureRecord): string {
  return record.response.text || renderValue(record.response.body)
}

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}

export default function LegacyWebhookInspector() {
  const navigate = useNavigate()
  const { token = '' } = useParams()
  const [payload, setPayload] = useState<WebhookCaptureListResponse>({
    token,
    captureUrl: buildWebhookCaptureUrl(token || 'token'),
    inspectUrl: buildWebhookInspectorUrl(token || 'token'),
    requests: [],
  })
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copyState, setCopyState] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
  const publicApiOrigin = getWebhookPublicApiOrigin()
  const showPublicUrlWarning = isLoopbackWebhookOrigin(publicApiOrigin)

  const selectedRequest =
    payload.requests.find((request) => request.id === selectedRequestId) || payload.requests[0] || null

  useEffect(() => {
    if (!token || !isValidWebhookToken(token)) {
      navigate('/webhhook', { replace: true })
    }
  }, [navigate, token])

  useEffect(() => {
    if (!token || !isValidWebhookToken(token)) {
      return
    }

    let cancelled = false

    const loadRequests = async (showSpinner: boolean) => {
      if (showSpinner) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      try {
        const nextPayload = await fetchWebhookRequests(token)

        if (cancelled) {
          return
        }

        setPayload({
          ...nextPayload,
          inspectUrl: buildWebhookInspectorUrl(token),
          captureUrl: buildWebhookCaptureUrl(token),
        })
        setSelectedRequestId((current) =>
          nextPayload.requests.some((request) => request.id === current)
            ? current
            : nextPayload.requests[0]?.id || null
        )
        setLastUpdatedAt(new Date().toISOString())
        setError(null)
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error ? requestError.message : 'Failed to load captured webhook requests'
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    void loadRequests(true)

    const intervalId = window.setInterval(() => {
      void loadRequests(false)
    }, 2500)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [token])

  const handleCopy = async (key: string, value: string) => {
    const ok = await copyText(value)

    if (!ok) {
      setError('Clipboard access failed')
      return
    }

    setCopyState(key)
    window.setTimeout(() => {
      setCopyState((current) => (current === key ? null : current))
    }, 1600)
  }

  const handleClear = async () => {
    if (!token || !window.confirm(`Delete all captured requests for token ${token}?`)) {
      return
    }

    setRefreshing(true)

    try {
      await clearWebhookRequests(token)
      setPayload((current) => ({ ...current, requests: [] }))
      setSelectedRequestId(null)
      setLastUpdatedAt(new Date().toISOString())
      setError(null)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to clear requests')
    } finally {
      setRefreshing(false)
    }
  }

  if (!token || !isValidWebhookToken(token)) {
    return null
  }

  return (
    <main className="app-main" id="legacy-webhook-inspector-page" data-testid="legacy-webhook-inspector-page">
      <section className="container p-6" style={{ display: 'grid', gap: 18 }}>
        <div className="card p-6" style={{ borderRadius: 'var(--radius-md)' }}>
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
                Legacy Webhook Inspector
              </p>
              <h1 style={{ marginTop: 10, overflowWrap: 'anywhere' }}>{token}</h1>
            </div>

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
                This page keeps the previous webhook strategy unchanged.
              </div>
            ) : null}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <div style={{ padding: 18, borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--color-surface-raised) 72%, transparent)', border: '1px solid color-mix(in srgb, var(--color-text) 8%, transparent)' }}>
                <div style={{ fontSize: '0.78rem', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 800, color: 'var(--color-neutral-700)' }}>
                  Receive URL
                </div>
                <code style={{ display: 'block', marginTop: 10, overflowWrap: 'anywhere' }}>{payload.captureUrl}</code>
                <button className="btn btn-primary mt-4" onClick={() => void handleCopy('capture', payload.captureUrl)}>
                  {copyState === 'capture' ? 'Copied' : 'Copy Receive URL'}
                </button>
              </div>
              <div style={{ padding: 18, borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--color-surface-raised) 72%, transparent)', border: '1px solid color-mix(in srgb, var(--color-text) 8%, transparent)' }}>
                <div style={{ fontSize: '0.78rem', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 800, color: 'var(--color-neutral-700)' }}>
                  Viewer URL
                </div>
                <code style={{ display: 'block', marginTop: 10, overflowWrap: 'anywhere' }}>{buildWebhookInspectorUrl(token)}</code>
                <button className="btn btn-primary mt-4" onClick={() => void handleCopy('inspect', buildWebhookInspectorUrl(token))}>
                  {copyState === 'inspect' ? 'Copied' : 'Copy Viewer URL'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              <button className="btn btn-primary" onClick={() => window.location.reload()}>
                {refreshing ? 'Refreshing...' : 'Refresh Now'}
              </button>
              <button className="btn" onClick={() => void handleClear()}>
                Clear Inbox
              </button>
              <span style={{ color: 'var(--color-text-secondary)' }}>
                {lastUpdatedAt ? `Last synced ${formatDateTime(lastUpdatedAt)}` : 'Waiting for first sync'}
              </span>
            </div>

            {error ? <p style={{ margin: 0, color: 'var(--color-danger)', fontWeight: 700 }}>{error}</p> : null}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) minmax(0, 1fr)', gap: 18, alignItems: 'start' }}>
          <div className="card p-4" style={{ borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <h2 style={{ margin: 0 }}>Requests</h2>
              <span style={{ fontWeight: 700, color: 'var(--color-text-secondary)' }}>{payload.requests.length}</span>
            </div>

            {loading ? <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>Loading requests...</p> : null}
            {!loading && payload.requests.length === 0 ? (
              <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
                No requests yet. Send data to <code>{payload.captureUrl}</code>.
              </p>
            ) : null}

            <div style={{ display: 'grid', gap: 10 }}>
              {payload.requests.map((request) => (
                <button
                  key={request.id}
                  onClick={() => setSelectedRequestId(request.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: 14,
                    borderRadius: 'var(--radius-md)',
                    border: selectedRequest?.id === request.id ? '1px solid color-mix(in srgb, var(--color-accent-2-700) 45%, transparent)' : '1px solid color-mix(in srgb, var(--color-text) 8%, transparent)',
                    background: selectedRequest?.id === request.id ? 'color-mix(in srgb, var(--color-accent-2-200) 50%, transparent)' : 'color-mix(in srgb, var(--color-surface-raised) 72%, transparent)',
                    cursor: 'pointer',
                    color: 'inherit',
                  }}
                >
                  <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, color: 'var(--color-accent-2-700)' }}>
                    {request.method}
                  </div>
                  <div style={{ fontWeight: 700, marginTop: 6, overflowWrap: 'anywhere' }}>{request.path}</div>
                  <div style={{ fontSize: '0.9rem', marginTop: 6, color: 'var(--color-text-secondary)' }}>
                    {formatDateTime(request.receivedAt)} · {formatBytes(request.body.sizeBytes)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 18 }}>
            {selectedRequest ? (
              <>
                <div className="card p-4" style={{ borderRadius: 'var(--radius-md)' }}>
                  <h2>Overview</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                    {[
                      ['Received', formatDateTime(selectedRequest.receivedAt)],
                      ['Path', selectedRequest.path],
                      ['Remote IP', selectedRequest.ip || 'Unknown'],
                      ['Body size', formatBytes(selectedRequest.body.sizeBytes)],
                      ['Request URL', selectedRequest.url],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        style={{
                          padding: 14,
                          borderRadius: 'var(--radius-md)',
                          background: 'color-mix(in srgb, var(--color-surface-raised) 72%, transparent)',
                          border: '1px solid color-mix(in srgb, var(--color-text) 8%, transparent)',
                        }}
                      >
                        <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, color: 'var(--color-neutral-700)' }}>
                          {label}
                        </div>
                        <div style={{ marginTop: 8, fontWeight: 700, overflowWrap: 'anywhere' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {[
                  ['Request Body', getRequestBodyText(selectedRequest), selectedRequest.body.contentType || selectedRequest.body.format],
                  ['Query Params', renderValue(selectedRequest.query), `${Object.keys(selectedRequest.query).length}`],
                  ['Headers', renderValue(selectedRequest.headers), `${Object.keys(selectedRequest.headers).length}`],
                  ['Cookies', renderValue(selectedRequest.cookies), `${Object.keys(selectedRequest.cookies).length}`],
                  ['Response Body', getResponseBodyText(selectedRequest), `${selectedRequest.response.statusCode}`],
                ].map(([title, value, meta]) => (
                  <div key={title} className="card p-4" style={{ borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <h2 style={{ margin: 0 }}>{title}</h2>
                      <span style={{ color: 'var(--color-text-secondary)', fontWeight: 700 }}>{meta}</span>
                    </div>
                    <pre
                      style={{
                        margin: 0,
                        padding: 16,
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--code-bg)',
                        color: 'var(--code-fg)',
                        border: '1px solid var(--code-rule)',
                        overflowX: 'auto',
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 13,
                        lineHeight: 1.65,
                        WebkitFontSmoothing: 'subpixel-antialiased',
                      }}
                    >
                      {value}
                    </pre>
                  </div>
                ))}
              </>
            ) : (
              <div className="card p-6" style={{ borderRadius: 'var(--radius-md)' }}>
                <h2>Inspector ready</h2>
                <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
                  Requests will appear here as soon as they reach the API webhook URL.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
