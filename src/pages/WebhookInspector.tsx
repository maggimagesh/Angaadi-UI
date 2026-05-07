import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  buildWebhookCaptureUrl,
  buildWebhookInspectorUrl,
  clearWebhookRequests,
  fetchWebhookRequests,
  getWebhookApiOrigin,
  getWebhookPublicApiOrigin,
  isValidWebhookToken,
  isLoopbackWebhookOrigin,
  type WebhookCaptureListResponse,
  type WebhookCaptureRecord,
} from '../api/webhook'

type SectionKey = 'overview' | 'request-body' | 'query' | 'headers' | 'cookies' | 'response'

const ALL_SECTIONS: SectionKey[] = [
  'overview',
  'request-body',
  'query',
  'headers',
  'cookies',
  'response',
]

const SECTION_LABELS: Record<SectionKey, string> = {
  overview: 'Overview',
  'request-body': 'Request Body',
  query: 'Query Params',
  headers: 'Headers',
  cookies: 'Cookies',
  response: 'Response',
}

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

function tryParseJson(value: string): { ok: boolean; parsed: unknown } {
  const trimmed = value.trim()
  if (!trimmed) {
    return { ok: false, parsed: value }
  }
  try {
    return { ok: true, parsed: JSON.parse(trimmed) }
  } catch {
    return { ok: false, parsed: value }
  }
}

function getRequestBodyValue(record: WebhookCaptureRecord): { value: unknown; isJson: boolean } {
  if (record.body.format === 'json') {
    return { value: record.body.json, isJson: true }
  }
  if (record.body.format === 'binary') {
    return { value: record.body.base64 || '', isJson: false }
  }
  if (record.body.text) {
    const { ok, parsed } = tryParseJson(record.body.text)
    return { value: parsed, isJson: ok }
  }
  return { value: '', isJson: false }
}

function getResponseBodyValue(record: WebhookCaptureRecord): { value: unknown; isJson: boolean } {
  if (record.response.body !== null && record.response.body !== undefined) {
    return { value: record.response.body, isJson: typeof record.response.body === 'object' }
  }
  if (record.response.text) {
    const { ok, parsed } = tryParseJson(record.response.text)
    return { value: parsed, isJson: ok }
  }
  return { value: '', isJson: false }
}

function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}

function PrimitiveValue({ value }: { value: unknown }) {
  if (value === null) {
    return <span style={{ color: '#a39a8c' }}>null</span>
  }
  if (typeof value === 'boolean') {
    return <span style={{ color: '#9b4d12', fontWeight: 700 }}>{String(value)}</span>
  }
  if (typeof value === 'number') {
    return <span style={{ color: '#1f6feb' }}>{value}</span>
  }
  if (typeof value === 'string') {
    return (
      <span style={{ color: '#22863a', wordBreak: 'break-all' }}>
        &quot;{value}&quot;
      </span>
    )
  }
  return <span>{String(value)}</span>
}

interface JsonNodeProps {
  keyName?: string
  value: unknown
  depth: number
  expandSignal: number
  defaultExpanded: boolean
}

function JsonNode({ keyName, value, depth, expandSignal, defaultExpanded }: JsonNodeProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  useEffect(() => {
    setExpanded(defaultExpanded)
  }, [expandSignal, defaultExpanded])

  const isObject = value !== null && typeof value === 'object'
  const isArray = Array.isArray(value)
  const indent = Math.min(depth, 12) * 14

  const keyLabel = keyName !== undefined ? (
    <>
      <span style={{ color: '#a06b1d' }}>&quot;{keyName}&quot;</span>
      <span style={{ color: '#888' }}>: </span>
    </>
  ) : null

  if (!isObject) {
    return (
      <div
        style={{
          paddingLeft: indent,
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: 13,
          lineHeight: '1.7',
          wordBreak: 'break-all',
        }}
      >
        {keyLabel}
        <PrimitiveValue value={value} />
      </div>
    )
  }

  const entries = isArray
    ? (value as unknown[]).map((v, i) => [String(i), v] as const)
    : Object.entries(value as Record<string, unknown>)
  const count = entries.length
  const open = isArray ? '[' : '{'
  const close = isArray ? ']' : '}'

  if (count === 0) {
    return (
      <div
        style={{
          paddingLeft: indent,
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: 13,
          lineHeight: '1.7',
        }}
      >
        {keyLabel}
        <span style={{ color: '#666' }}>
          {open}
          {close}
        </span>
      </div>
    )
  }

  return (
    <div style={{ paddingLeft: indent }}>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'inherit',
          padding: 0,
          margin: 0,
          font: 'inherit',
          textAlign: 'left',
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: 13,
          lineHeight: '1.7',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 12,
            color: '#9b4d12',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 120ms ease',
          }}
        >
          ▶
        </span>
        {keyLabel}
        <span style={{ color: '#666' }}>{open}</span>
        {!expanded ? (
          <>
            <span style={{ color: '#a39a8c', marginLeft: 6, fontStyle: 'italic' }}>
              {count} {isArray ? 'item' : 'key'}
              {count === 1 ? '' : 's'}
            </span>
            <span style={{ color: '#666' }}>{close}</span>
          </>
        ) : null}
      </button>
      {expanded ? (
        <>
          <div>
            {entries.map(([k, v]) => (
              <JsonNode
                key={k}
                keyName={isArray ? undefined : k}
                value={v}
                depth={depth + 1}
                expandSignal={expandSignal}
                defaultExpanded={defaultExpanded}
              />
            ))}
          </div>
          <div
            style={{
              paddingLeft: indent,
              fontFamily: '"JetBrains Mono", ui-monospace, monospace',
              fontSize: 13,
              lineHeight: '1.7',
              color: '#666',
            }}
          >
            {close}
          </div>
        </>
      ) : null}
    </div>
  )
}

interface JsonViewerProps {
  value: unknown
  expandSignal: number
  defaultExpanded: boolean
}

function JsonViewer({ value, expandSignal, defaultExpanded }: JsonViewerProps) {
  return (
    <div
      style={{
        background: '#1f252a',
        color: '#f7efe2',
        padding: 16,
        borderRadius: 14,
        maxHeight: 480,
        overflow: 'auto',
        minWidth: 0,
      }}
    >
      <JsonNode
        value={value}
        depth={0}
        expandSignal={expandSignal}
        defaultExpanded={defaultExpanded}
      />
    </div>
  )
}

function PlainTextViewer({ value }: { value: string }) {
  return (
    <pre
      style={{
        margin: 0,
        padding: 16,
        borderRadius: 14,
        background: '#1f252a',
        color: '#f7efe2',
        maxHeight: 480,
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 13,
        lineHeight: '1.7',
      }}
    >
      {value || '(empty)'}
    </pre>
  )
}

interface SectionPanelProps {
  title: string
  meta?: string
  expanded: boolean
  onToggle: () => void
  actions?: React.ReactNode
  children: React.ReactNode
}

function SectionPanel({ title, meta, expanded, onToggle, actions, children }: SectionPanelProps) {
  return (
    <div
      className="card"
      style={{
        borderRadius: 20,
        padding: 0,
        overflow: 'hidden',
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '14px 18px',
          borderBottom: expanded ? '1px solid rgba(35, 36, 40, 0.08)' : 'none',
          background: 'rgba(255, 247, 232, 0.5)',
        }}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'inherit',
            padding: 0,
            margin: 0,
            font: 'inherit',
            flex: '1 1 auto',
            minWidth: 0,
            textAlign: 'left',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 22,
              height: 22,
              borderRadius: 6,
              background: 'rgba(155, 77, 18, 0.12)',
              color: '#9b4d12',
              fontSize: 12,
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 140ms ease',
            }}
          >
            ▶
          </span>
          <h3
            style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: 800,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </h3>
          {meta ? (
            <span
              style={{
                color: 'var(--color-text-secondary)',
                fontSize: '0.85rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              {meta}
            </span>
          ) : null}
        </button>
        {actions ? <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>{actions}</div> : null}
      </div>
      {expanded ? <div style={{ padding: 16, minWidth: 0 }}>{children}</div> : null}
    </div>
  )
}

interface ToggleSwitchProps {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
}

function ToggleSwitch({ checked, onChange, label }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        background: 'rgba(255,255,255,0.7)',
        border: '1px solid rgba(35, 36, 40, 0.12)',
        borderRadius: 999,
        padding: '6px 12px 6px 8px',
        cursor: 'pointer',
        color: 'inherit',
        font: 'inherit',
        fontSize: '0.85rem',
        fontWeight: 700,
      }}
    >
      <span
        style={{
          position: 'relative',
          width: 34,
          height: 20,
          borderRadius: 999,
          background: checked ? '#9b4d12' : '#cdc6ba',
          transition: 'background 160ms ease',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 16 : 2,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 160ms ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
          }}
        />
      </span>
      <span>{label}</span>
    </button>
  )
}

export default function WebhookInspector() {
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
  const [headerCollapsed, setHeaderCollapsed] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<SectionKey>>(
    () => new Set(ALL_SECTIONS)
  )
  const [jsonExpandAll, setJsonExpandAll] = useState(true)
  const [jsonExpandSignal, setJsonExpandSignal] = useState(0)
  const cancelledRef = useRef(false)

  const publicApiOrigin = getWebhookPublicApiOrigin()
  const showPublicUrlWarning = isLoopbackWebhookOrigin(publicApiOrigin)

  const selectedRequest = useMemo(
    () =>
      payload.requests.find((request) => request.id === selectedRequestId) ||
      payload.requests[0] ||
      null,
    [payload.requests, selectedRequestId]
  )

  useEffect(() => {
    if (!token || !isValidWebhookToken(token)) {
      navigate('/valid-webhooks', { replace: true })
    }
  }, [navigate, token])

  const loadRequests = useCallback(
    async (showSpinner: boolean) => {
      if (!token || !isValidWebhookToken(token)) {
        return
      }
      if (showSpinner) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }
      try {
        const next = await fetchWebhookRequests(token)
        if (cancelledRef.current) {
          return
        }
        setPayload({
          ...next,
          inspectUrl: buildWebhookInspectorUrl(token),
          captureUrl: buildWebhookCaptureUrl(token),
        })
        setSelectedRequestId((current) =>
          next.requests.some((r) => r.id === current) ? current : next.requests[0]?.id || null
        )
        setLastUpdatedAt(new Date().toISOString())
        setError(null)
      } catch (requestError) {
        if (!cancelledRef.current) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Failed to load captured webhook requests'
          )
        }
      } finally {
        if (!cancelledRef.current) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    },
    [token]
  )

  useEffect(() => {
    if (!token || !isValidWebhookToken(token)) {
      return
    }
    cancelledRef.current = false

    void loadRequests(true)

    const intervalId = window.setInterval(() => {
      void loadRequests(false)
    }, 2500)

    return () => {
      cancelledRef.current = true
      window.clearInterval(intervalId)
    }
  }, [token, loadRequests])

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

  const toggleSection = (key: SectionKey) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const allSectionsExpanded = expandedSections.size === ALL_SECTIONS.length
  const setAllSections = (expand: boolean) => {
    setExpandedSections(expand ? new Set(ALL_SECTIONS) : new Set())
  }

  const handleJsonExpandToggle = (next: boolean) => {
    setJsonExpandAll(next)
    setJsonExpandSignal((s) => s + 1)
  }

  const handleDownloadRequest = (request: WebhookCaptureRecord) => {
    const stamp = new Date(request.receivedAt).toISOString().replace(/[:.]/g, '-')
    downloadJson(`webhook-${token}-${stamp}.json`, request)
  }

  const handleDownloadAll = () => {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    downloadJson(`webhook-${token}-all-${stamp}.json`, {
      token,
      captureUrl: payload.captureUrl,
      inspectUrl: payload.inspectUrl,
      exportedAt: new Date().toISOString(),
      count: payload.requests.length,
      requests: payload.requests,
    })
  }

  if (!token || !isValidWebhookToken(token)) {
    return null
  }

  const requestBody = selectedRequest ? getRequestBodyValue(selectedRequest) : null
  const responseBody = selectedRequest ? getResponseBodyValue(selectedRequest) : null

  const overviewItems: Array<[string, string]> = selectedRequest
    ? [
        ['Method', selectedRequest.method],
        ['Received', formatDateTime(selectedRequest.receivedAt)],
        ['Path', selectedRequest.path],
        ['Remote IP', selectedRequest.ip || 'Unknown'],
        ['Body size', formatBytes(selectedRequest.body.sizeBytes)],
        ['Status', String(selectedRequest.response.statusCode)],
        ['Request URL', selectedRequest.url],
      ]
    : []

  return (
    <main
      className="app-main"
      id="webhook-inspector-page"
      data-testid="webhook-inspector-page"
      style={{ minWidth: 0 }}
    >
      <section
        className="container p-6"
        style={{ display: 'grid', gap: 16, minWidth: 0, maxWidth: '100%' }}
      >
        <div
          className="card"
          style={{
            background:
              'radial-gradient(circle at top left, rgba(255, 192, 120, 0.18), transparent 28%), linear-gradient(180deg, #fffdf8 0%, #f7efe2 100%)',
            border: '1px solid rgba(35, 36, 40, 0.1)',
            borderRadius: 24,
            boxShadow: '0 20px 50px rgba(31, 37, 42, 0.08)',
            padding: 0,
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '14px 20px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ minWidth: 0, flex: '1 1 auto' }}>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.72rem',
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  fontWeight: 800,
                  color: '#9b4d12',
                }}
              >
                Live Webhook Inbox
              </p>
              <h1
                style={{
                  marginTop: 6,
                  marginBottom: 0,
                  fontSize: '1.4rem',
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-all',
                }}
              >
                {token}
              </h1>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <ToggleSwitch
                checked={!headerCollapsed}
                onChange={(next) => setHeaderCollapsed(!next)}
                label={headerCollapsed ? 'Expand panel' : 'Collapse panel'}
              />
            </div>
          </div>

          {!headerCollapsed ? (
            <div
              style={{
                padding: '0 20px 20px',
                display: 'grid',
                gap: 14,
                minWidth: 0,
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: 'var(--color-text-secondary)',
                  fontSize: '0.92rem',
                }}
              >
                Send payloads to the public webhook URL below. The inspector polls every 2.5s and
                renders every captured request.
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
                  gap: 12,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    padding: 14,
                    borderRadius: 16,
                    background: 'rgba(255,255,255,0.72)',
                    border: '1px solid rgba(35, 36, 40, 0.08)',
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.72rem',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      fontWeight: 800,
                      color: '#6b7d8d',
                    }}
                  >
                    Receive URL
                  </div>
                  <code
                    style={{
                      display: 'block',
                      marginTop: 8,
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-all',
                      fontSize: '0.85rem',
                    }}
                  >
                    {payload.captureUrl}
                  </code>
                  <button
                    className="btn btn-primary mt-2"
                    onClick={() => void handleCopy('capture', payload.captureUrl)}
                  >
                    {copyState === 'capture' ? 'Copied' : 'Copy Receive URL'}
                  </button>
                </div>
                <div
                  style={{
                    padding: 14,
                    borderRadius: 16,
                    background: 'rgba(255,255,255,0.72)',
                    border: '1px solid rgba(35, 36, 40, 0.08)',
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.72rem',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      fontWeight: 800,
                      color: '#6b7d8d',
                    }}
                  >
                    UI viewer path
                  </div>
                  <code
                    style={{
                      display: 'block',
                      marginTop: 8,
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-all',
                      fontSize: '0.85rem',
                    }}
                  >
                    {buildWebhookInspectorUrl(token)}
                  </code>
                  <button
                    className="btn btn-primary mt-2"
                    onClick={() => void handleCopy('inspect', buildWebhookInspectorUrl(token))}
                  >
                    {copyState === 'inspect' ? 'Copied' : 'Copy Viewer URL'}
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 10,
                  alignItems: 'center',
                }}
              >
                <button
                  className="btn btn-primary"
                  disabled={refreshing}
                  onClick={() => void loadRequests(false)}
                >
                  {refreshing ? 'Refreshing…' : 'Refresh Now'}
                </button>
                <button className="btn" onClick={() => void handleClear()}>
                  Clear Inbox
                </button>
                <button
                  className="btn"
                  disabled={payload.requests.length === 0}
                  onClick={handleDownloadAll}
                >
                  Download All ({payload.requests.length})
                </button>
                <span
                  style={{
                    color: 'var(--color-text-secondary)',
                    fontSize: '0.85rem',
                    overflowWrap: 'anywhere',
                  }}
                >
                  API host: <code>{getWebhookApiOrigin()}</code>
                </span>
                <span
                  style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}
                >
                  {lastUpdatedAt
                    ? `Last synced ${formatDateTime(lastUpdatedAt)}`
                    : 'Waiting for first sync'}
                </span>
              </div>

              {error ? (
                <p
                  style={{
                    margin: 0,
                    color: 'var(--color-danger)',
                    fontWeight: 700,
                  }}
                >
                  {error}
                </p>
              ) : null}

              {showPublicUrlWarning ? (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    background: 'rgba(255, 238, 210, 0.9)',
                    border: '1px solid rgba(155, 77, 18, 0.2)',
                    color: '#6e3a10',
                    fontSize: '0.9rem',
                    overflowWrap: 'anywhere',
                  }}
                >
                  The receive URL currently points to <code>{publicApiOrigin}</code>. External
                  webhook providers cannot call that address. Set
                  <code> VITE_WEBHOOK_PUBLIC_API_ORIGIN</code> to your public production API origin.
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div
          className="webhook-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 320px) minmax(0, 1fr)',
            gap: 16,
            alignItems: 'start',
            minWidth: 0,
          }}
        >
          <div
            className="card"
            style={{
              borderRadius: 20,
              padding: 16,
              minWidth: 0,
              position: 'sticky',
              top: 12,
              maxHeight: 'calc(100vh - 32px)',
              overflow: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                marginBottom: 12,
              }}
            >
              <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Requests</h2>
              <span
                style={{
                  fontWeight: 700,
                  color: 'var(--color-text-secondary)',
                  background: 'rgba(155, 77, 18, 0.08)',
                  borderRadius: 999,
                  padding: '2px 10px',
                  fontSize: '0.85rem',
                }}
              >
                {payload.requests.length}
              </span>
            </div>

            {loading ? (
              <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
                Loading requests…
              </p>
            ) : null}
            {!loading && payload.requests.length === 0 ? (
              <p
                style={{
                  margin: 0,
                  color: 'var(--color-text-secondary)',
                  fontSize: '0.9rem',
                  overflowWrap: 'anywhere',
                }}
              >
                No requests yet. Send data to <code>{payload.captureUrl}</code>.
              </p>
            ) : null}

            <div style={{ display: 'grid', gap: 8 }}>
              {payload.requests.map((request) => {
                const isSelected = selectedRequest?.id === request.id
                return (
                  <button
                    key={request.id}
                    onClick={() => setSelectedRequestId(request.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: 12,
                      borderRadius: 14,
                      border: isSelected
                        ? '1px solid rgba(155, 77, 18, 0.45)'
                        : '1px solid rgba(35, 36, 40, 0.08)',
                      background: isSelected
                        ? 'rgba(255, 225, 182, 0.5)'
                        : 'rgba(255,255,255,0.72)',
                      cursor: 'pointer',
                      color: 'inherit',
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.7rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          fontWeight: 800,
                          color: '#9b4d12',
                          background: 'rgba(155, 77, 18, 0.12)',
                          padding: '2px 8px',
                          borderRadius: 6,
                        }}
                      >
                        {request.method}
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color:
                            request.response.statusCode >= 400 ? '#c44a3c' : '#22863a',
                        }}
                      >
                        {request.response.statusCode}
                      </span>
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        marginTop: 6,
                        overflowWrap: 'anywhere',
                        wordBreak: 'break-all',
                        fontSize: '0.9rem',
                      }}
                    >
                      {request.path}
                    </div>
                    <div
                      style={{
                        fontSize: '0.78rem',
                        marginTop: 4,
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {formatDateTime(request.receivedAt)} · {formatBytes(request.body.sizeBytes)}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 14, minWidth: 0 }}>
            {selectedRequest ? (
              <>
                <div
                  className="card"
                  style={{
                    borderRadius: 20,
                    padding: 14,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 10,
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 10,
                      alignItems: 'center',
                    }}
                  >
                    <ToggleSwitch
                      checked={allSectionsExpanded}
                      onChange={setAllSections}
                      label={allSectionsExpanded ? 'Collapse all fields' : 'Expand all fields'}
                    />
                    <ToggleSwitch
                      checked={jsonExpandAll}
                      onChange={handleJsonExpandToggle}
                      label={jsonExpandAll ? 'JSON: expanded' : 'JSON: collapsed'}
                    />
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleDownloadRequest(selectedRequest)}
                  >
                    Download Request
                  </button>
                </div>

                <SectionPanel
                  title={SECTION_LABELS.overview}
                  meta={`${selectedRequest.method} ${selectedRequest.path}`}
                  expanded={expandedSections.has('overview')}
                  onToggle={() => toggleSection('overview')}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))',
                      gap: 10,
                      minWidth: 0,
                    }}
                  >
                    {overviewItems.map(([label, value]) => (
                      <div
                        key={label}
                        style={{
                          padding: 12,
                          borderRadius: 14,
                          background: 'rgba(255,255,255,0.72)',
                          border: '1px solid rgba(35, 36, 40, 0.08)',
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            fontSize: '0.7rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            fontWeight: 800,
                            color: '#6b7d8d',
                          }}
                        >
                          {label}
                        </div>
                        <div
                          style={{
                            marginTop: 6,
                            fontWeight: 700,
                            overflowWrap: 'anywhere',
                            wordBreak: 'break-all',
                            fontSize: '0.9rem',
                          }}
                        >
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionPanel>

                <SectionPanel
                  title={SECTION_LABELS['request-body']}
                  meta={selectedRequest.body.contentType || selectedRequest.body.format}
                  expanded={expandedSections.has('request-body')}
                  onToggle={() => toggleSection('request-body')}
                >
                  {requestBody && requestBody.isJson ? (
                    <JsonViewer
                      value={requestBody.value}
                      expandSignal={jsonExpandSignal}
                      defaultExpanded={jsonExpandAll}
                    />
                  ) : (
                    <PlainTextViewer
                      value={
                        typeof requestBody?.value === 'string'
                          ? requestBody.value
                          : requestBody
                          ? JSON.stringify(requestBody.value, null, 2)
                          : ''
                      }
                    />
                  )}
                </SectionPanel>

                <SectionPanel
                  title={SECTION_LABELS.query}
                  meta={`${Object.keys(selectedRequest.query).length} entries`}
                  expanded={expandedSections.has('query')}
                  onToggle={() => toggleSection('query')}
                >
                  <JsonViewer
                    value={selectedRequest.query}
                    expandSignal={jsonExpandSignal}
                    defaultExpanded={jsonExpandAll}
                  />
                </SectionPanel>

                <SectionPanel
                  title={SECTION_LABELS.headers}
                  meta={`${Object.keys(selectedRequest.headers).length} entries`}
                  expanded={expandedSections.has('headers')}
                  onToggle={() => toggleSection('headers')}
                >
                  <JsonViewer
                    value={selectedRequest.headers}
                    expandSignal={jsonExpandSignal}
                    defaultExpanded={jsonExpandAll}
                  />
                </SectionPanel>

                <SectionPanel
                  title={SECTION_LABELS.cookies}
                  meta={`${Object.keys(selectedRequest.cookies).length} entries`}
                  expanded={expandedSections.has('cookies')}
                  onToggle={() => toggleSection('cookies')}
                >
                  <JsonViewer
                    value={selectedRequest.cookies}
                    expandSignal={jsonExpandSignal}
                    defaultExpanded={jsonExpandAll}
                  />
                </SectionPanel>

                <SectionPanel
                  title={SECTION_LABELS.response}
                  meta={`status ${selectedRequest.response.statusCode}`}
                  expanded={expandedSections.has('response')}
                  onToggle={() => toggleSection('response')}
                >
                  <div style={{ display: 'grid', gap: 10, minWidth: 0 }}>
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        background: 'rgba(255,255,255,0.72)',
                        border: '1px solid rgba(35, 36, 40, 0.08)',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.72rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          fontWeight: 800,
                          color: '#6b7d8d',
                          marginBottom: 6,
                        }}
                      >
                        Response Headers
                      </div>
                      <JsonViewer
                        value={selectedRequest.response.headers}
                        expandSignal={jsonExpandSignal}
                        defaultExpanded={jsonExpandAll}
                      />
                    </div>
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        background: 'rgba(255,255,255,0.72)',
                        border: '1px solid rgba(35, 36, 40, 0.08)',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.72rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          fontWeight: 800,
                          color: '#6b7d8d',
                          marginBottom: 6,
                        }}
                      >
                        Response Body
                      </div>
                      {responseBody && responseBody.isJson ? (
                        <JsonViewer
                          value={responseBody.value}
                          expandSignal={jsonExpandSignal}
                          defaultExpanded={jsonExpandAll}
                        />
                      ) : (
                        <PlainTextViewer
                          value={
                            typeof responseBody?.value === 'string'
                              ? responseBody.value
                              : responseBody
                              ? JSON.stringify(responseBody.value, null, 2)
                              : ''
                          }
                        />
                      )}
                    </div>
                  </div>
                </SectionPanel>
              </>
            ) : (
              <div className="card" style={{ borderRadius: 20, padding: 20 }}>
                <h2 style={{ marginTop: 0 }}>Inspector ready</h2>
                <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
                  Requests will appear here as soon as they reach the API webhook URL.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 900px) {
          .webhook-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
          .webhook-grid > .card:first-child {
            position: static !important;
            max-height: 360px !important;
          }
        }
      `}</style>
    </main>
  )
}
