import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import '../styles/webhook-inspector.css'
import { useNavigate, useParams } from 'react-router-dom'
import {
  appendWebhookQuery,
  appendWebhookQueryAuthParams,
  buildWebhookBodyAttachmentUrl,
  buildWebhookBodyDownloadUrl,
  buildWebhookCaptureUrl,
  buildWebhookCaptureUrlWithQueryAuth,
  buildWebhookDownloadAllUrl,
  buildWebhookInspectorUrl,
  clearWebhookBlockedAttempts,
  clearWebhookRequests,
  DEFAULT_WEBHOOK_RETENTION_HOURS,
  fetchWebhookAuthConfig,
  fetchWebhookRequests,
  getWebhookApiOrigin,
  getWebhookPublicApiOrigin,
  isValidWebhookQueryParamName,
  isValidWebhookToken,
  isLoopbackWebhookOrigin,
  MAX_WEBHOOK_AUTH_HEADERS,
  MAX_WEBHOOK_AUTH_QUERY_PARAMS,
  saveWebhookAuthConfig,
  type WebhookAuthConfig,
  type WebhookAuthConfigInput,
  type WebhookBlockedRecord,
  type WebhookCaptureListResponse,
  type WebhookCaptureRecord,
  type WebhookSenderInfo,
  type WebhookStoredBody,
} from '../api/webhook'

type SectionKey =
  | 'overview'
  | 'sender'
  | 'request-body'
  | 'query'
  | 'headers'
  | 'cookies'
  | 'response'

const ALL_SECTIONS: SectionKey[] = [
  'overview',
  'request-body',
  'query',
  'headers',
  'cookies',
  'response',
  'sender',
]

const SECTION_LABELS: Record<SectionKey, string> = {
  overview: 'Overview',
  sender: 'Sender / Source',
  'request-body': 'Request Body',
  query: 'Query Params',
  headers: 'Headers',
  cookies: 'Cookies',
  response: 'Response',
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString()
}

function describeReverseDns(reverseDns: string[] | null): string {
  if (reverseDns === null) {
    return 'Resolving…'
  }
  return reverseDns.length > 0 ? reverseDns.join(', ') : 'No PTR record'
}

function describeGeo(sender: WebhookSenderInfo): string | null {
  if (!sender.geo) {
    return null
  }
  const parts = [sender.geo.city, sender.geo.region, sender.geo.country].filter(Boolean)
  const coords =
    sender.geo.latitude && sender.geo.longitude
      ? ` (${sender.geo.latitude}, ${sender.geo.longitude})`
      : ''
  if (parts.length === 0 && !coords) {
    return null
  }
  return `${parts.join(', ')}${coords}${sender.geo.source ? ` — via ${sender.geo.source}` : ''}`
}

function buildSenderItems(sender: WebhookSenderInfo): Array<[string, string]> {
  const items: Array<[string, string | null]> = [
    ['Callback sender IP', sender.callbackSenderIp || sender.ip || 'Unknown'],
    ['Callback IP detected via', sender.callbackSenderIpSource || sender.ipSource],
    ['Fly-Client-IP', sender.flyClientIp || null],
    ['Fly forwarding hop', sender.flyForwardedIp || null],
    ['Fly socket peer', sender.flyProxyIp || null],
    ['IP address', sender.ip || 'Unknown'],
    ['IP detected via', sender.ipSource],
    ['Forwarding chain', sender.ipChain.length > 1 ? sender.ipChain.join('  →  ') : null],
    [
      'Socket peer',
      sender.remoteAddress
        ? `${sender.remoteAddress}${sender.remotePort ? `:${sender.remotePort}` : ''}${
            sender.remoteFamily ? ` (${sender.remoteFamily})` : ''
          }`
        : null,
    ],
    ['Reverse DNS', describeReverseDns(sender.reverseDns)],
    ['Client app', sender.clientApp],
    ['User agent', sender.userAgent || '(none sent)'],
    [
      'Protocol',
      `${sender.protocol ? sender.protocol.toUpperCase() : 'HTTP'}/${sender.httpVersion || '?'}${
        sender.secureConnection ? ' · TLS' : ''
      }`,
    ],
    ['Geo location', describeGeo(sender)],
    ['Target host', sender.host],
    ['Origin', sender.origin],
    ['Referer', sender.referer],
    ['Accept-Language', sender.acceptLanguage],
    ['Accept-Encoding', sender.acceptEncoding],
    [
      'Declared body',
      sender.contentLength !== null
        ? `${formatBytes(sender.contentLength)}${sender.contentType ? ` · ${sender.contentType}` : ''}`
        : sender.transferEncoding
          ? `transfer-encoding: ${sender.transferEncoding}`
          : null,
    ],
    ['Authorization header', sender.authorizationPresent ? 'Present (value in Headers section)' : 'Not sent'],
    [
      'Signature/webhook headers',
      Object.keys(sender.signatureHeaders).length > 0
        ? Object.keys(sender.signatureHeaders).join(', ')
        : null,
    ],
    [
      'Proxy / CDN headers',
      Object.keys(sender.proxyHeaders).length > 0
        ? `${Object.keys(sender.proxyHeaders).length} detected`
        : null,
    ],
  ]

  return items.filter((entry): entry is [string, string] => Boolean(entry[1]))
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

type FullBodyValue = { value: unknown; isJson: boolean }

type BodyFetchState =
  | { status: 'loading'; loadedBytes: number; totalBytes: number }
  | { status: 'success'; body: FullBodyValue }
  | { status: 'error'; error: string }

// The download endpoint serves the body in slices via `?offset=&limit=` (see
// pages/api/webhook/[token]/[requestId]/body.ts) so a large capture never has
// to round-trip as a single response. A plain single-shot fetch used to be
// used here, which silently stalled the "Loading full payload…" notice for
// bodies past ~10 MB instead of erroring or completing.
const BODY_CHUNK_BYTES = 8 * 1024 * 1024

async function fetchFullRequestBody(
  token: string,
  requestId: string,
  body: WebhookStoredBody,
  onProgress?: (loadedBytes: number, totalBytes: number) => void
): Promise<FullBodyValue> {
  const url = buildWebhookBodyDownloadUrl(token, requestId, body.downloadUrl)
  const totalBytes = body.sizeBytes

  if (body.format === 'binary') {
    const chunks: Uint8Array[] = []
    let offset = 0
    while (offset < totalBytes) {
      const limit = Math.min(BODY_CHUNK_BYTES, totalBytes - offset)
      const response = await fetch(appendWebhookQuery(url, { offset, limit }), {
        headers: { Accept: '*/*' },
      })
      if (!response.ok) {
        throw new Error(`Failed to load full body (status ${response.status})`)
      }
      chunks.push(new Uint8Array(await response.arrayBuffer()))
      offset += limit
      onProgress?.(offset, totalBytes)
    }
    const bytes = new Uint8Array(offset)
    let position = 0
    for (const chunk of chunks) {
      bytes.set(chunk, position)
      position += chunk.length
    }
    let binary = ''
    const chunkSize = 0x8000
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
    }
    return { value: btoa(binary), isJson: false }
  }

  const decoder = new TextDecoder('utf-8')
  let text = ''
  let offset = 0
  while (offset < totalBytes) {
    const limit = Math.min(BODY_CHUNK_BYTES, totalBytes - offset)
    const response = await fetch(appendWebhookQuery(url, { offset, limit }), {
      headers: { Accept: '*/*' },
    })
    if (!response.ok) {
      throw new Error(`Failed to load full body (status ${response.status})`)
    }
    text += decoder.decode(await response.arrayBuffer(), { stream: true })
    offset += limit
    onProgress?.(offset, totalBytes)
  }
  text += decoder.decode()

  if (body.format === 'json') {
    try {
      return { value: JSON.parse(text), isJson: true }
    } catch {
      return { value: text, isJson: false }
    }
  }
  const { ok, parsed } = tryParseJson(text)
  return { value: parsed, isJson: ok }
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

// Mirrors extensionForContentType() in the API's body route so the name the
// browser suggests matches the one the server puts in Content-Disposition.
function extensionForContentType(contentType: string | null): string {
  if (!contentType) return 'bin'
  if (contentType.includes('json')) return 'json'
  if (contentType.startsWith('text/')) return 'txt'
  if (contentType.includes('xml')) return 'xml'
  return 'bin'
}

function buildBodyFilename(token: string, requestId: string, contentType: string | null): string {
  return `webhook-${token}-${requestId}.${extensionForContentType(contentType)}`
}

function triggerUrlDownload(url: string, filename?: string): void {
  const link = document.createElement('a')
  link.href = url
  // Only a same-origin API honours this; cross-origin it is ignored and the
  // server's `Content-Disposition: attachment` is what saves the file.
  link.download = filename ?? ''
  link.rel = 'noopener noreferrer'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}

function nodeContainsQuery(value: unknown, query: string): boolean {
  if (!query) return false
  const q = query.toLowerCase()
  if (value === null || value === undefined) return false
  if (typeof value !== 'object') {
    return String(value).toLowerCase().includes(q)
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (k.toLowerCase().includes(q)) return true
    if (nodeContainsQuery(v, q)) return true
  }
  return false
}

function countMatches(text: string, query: string): number {
  if (!query) return 0
  const lower = text.toLowerCase()
  const q = query.toLowerCase()
  let count = 0
  let idx = lower.indexOf(q)
  while (idx !== -1) {
    count++
    idx = lower.indexOf(q, idx + q.length)
  }
  return count
}

function HighlightedText({
  text,
  query,
}: {
  text: string
  query: string
}) {
  if (!query) {
    return <>{text}</>
  }
  const lower = text.toLowerCase()
  const q = query.toLowerCase()
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let idx = lower.indexOf(q)
  let key = 0
  while (idx !== -1) {
    if (idx > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, idx)}</span>)
    }
    parts.push(
      <mark key={key++} className="wi-mark">
        {text.slice(idx, idx + query.length)}
      </mark>
    )
    lastIndex = idx + query.length
    idx = lower.indexOf(q, lastIndex)
  }
  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>)
  }
  return <>{parts}</>
}

function PrimitiveValue({ value, searchQuery }: { value: unknown; searchQuery: string }) {
  if (value === null) {
    return <span className="wi-tok-null">null</span>
  }
  if (typeof value === 'boolean') {
    return (
      <span className="wi-tok-boolean">
        <HighlightedText text={String(value)} query={searchQuery} />
      </span>
    )
  }
  if (typeof value === 'number') {
    return (
      <span className="wi-tok-number">
        <HighlightedText text={String(value)} query={searchQuery} />
      </span>
    )
  }
  if (typeof value === 'string') {
    return (
      <span className="wi-tok-string">
        &quot;<HighlightedText text={value} query={searchQuery} />&quot;
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
  searchQuery: string
}

// A fully expanded array/object renders one JsonNode per entry with no
// windowing. A large capture (tens or hundreds of thousands of items) built
// that many DOM nodes in one synchronous render and froze the tab — which
// looked identical to the body being stuck loading, since the browser
// couldn't repaint until the render finished. Capping entries rendered per
// level (independently at every depth, so nested large collections are
// bounded too) keeps the initial render cheap; "Show more" reveals the rest
// in the same page-sized batches on demand.
const JSON_ENTRY_PAGE_SIZE = 300

function JsonNode({ keyName, value, depth, expandSignal, defaultExpanded, searchQuery }: JsonNodeProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [visibleCount, setVisibleCount] = useState(JSON_ENTRY_PAGE_SIZE)

  useEffect(() => {
    setExpanded(defaultExpanded)
    setVisibleCount(JSON_ENTRY_PAGE_SIZE)
  }, [expandSignal, defaultExpanded])

  const hasSearchMatch = useMemo(() => {
    if (!searchQuery) return false
    if (keyName && keyName.toLowerCase().includes(searchQuery.toLowerCase())) return true
    return nodeContainsQuery(value, searchQuery)
  }, [searchQuery, keyName, value])

  const isObject = value !== null && typeof value === 'object'
  const isArray = Array.isArray(value)
  const indent = Math.min(depth, 12) * 14

  const keyLabel = keyName !== undefined ? (
    <>
      <span className="wi-tok-key">
        &quot;<HighlightedText text={keyName} query={searchQuery} />&quot;
      </span>
      <span className="wi-tok-punct">: </span>
    </>
  ) : null

  if (!isObject) {
    return (
      <div className="wi-node" style={{ paddingLeft: indent }}>
        {keyLabel}
        <PrimitiveValue value={value} searchQuery={searchQuery} />
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
      <div className="wi-node" style={{ paddingLeft: indent }}>
        {keyLabel}
        <span className="wi-tok-punct">
          {open}
          {close}
        </span>
      </div>
    )
  }

  const effectivelyExpanded = expanded || hasSearchMatch

  return (
    <div style={{ paddingLeft: indent }}>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="wi-node wi-node-toggle"
      >
        <span className={effectivelyExpanded ? 'wi-caret is-open' : 'wi-caret'}>▶</span>
        {keyLabel}
        <span className="wi-tok-punct">{open}</span>
        {!effectivelyExpanded ? (
          <>
            <span className="wi-count" style={{ marginLeft: 6 }}>
              {count} {isArray ? 'item' : 'key'}
              {count === 1 ? '' : 's'}
            </span>
            <span className="wi-tok-punct">{close}</span>
          </>
        ) : null}
      </button>
      {effectivelyExpanded ? (
        <>
          <div>
            {entries.slice(0, visibleCount).map(([k, v]) => (
              <JsonNode
                key={k}
                keyName={isArray ? undefined : k}
                value={v}
                depth={depth + 1}
                expandSignal={expandSignal}
                defaultExpanded={defaultExpanded}
                searchQuery={searchQuery}
              />
            ))}
          </div>
          {count > visibleCount ? (
            <button
              type="button"
              className="wi-node wi-node-toggle"
              style={{ paddingLeft: indent + 14 }}
              onClick={() => setVisibleCount((prev) => prev + JSON_ENTRY_PAGE_SIZE)}
            >
              <span className="wi-count">
                Show {Math.min(JSON_ENTRY_PAGE_SIZE, count - visibleCount)} more of{' '}
                {count - visibleCount} remaining…
              </span>
            </button>
          ) : null}
          <div className="wi-node wi-tok-punct" style={{ paddingLeft: indent }}>
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
  searchQuery?: string
  maxHeight?: number | string
}

function describeShape(value: unknown): string {
  if (Array.isArray(value)) return `array · ${value.length} item${value.length === 1 ? '' : 's'}`
  if (value !== null && typeof value === 'object') {
    const n = Object.keys(value as Record<string, unknown>).length
    return `object · ${n} key${n === 1 ? '' : 's'}`
  }
  return typeof value
}

function JsonViewer({
  value,
  expandSignal,
  defaultExpanded,
  searchQuery = '',
  maxHeight = 480,
}: JsonViewerProps) {
  const bytes = useMemo(() => {
    try {
      return new TextEncoder().encode(JSON.stringify(value) ?? '').length
    } catch {
      return null
    }
  }, [value])

  return (
    <div className="wi-code">
      <div className="wi-code-bar">
        <span className="wi-code-badge">JSON</span>
        <span>{describeShape(value)}</span>
        {bytes !== null ? (
          <>
            <span className="wi-code-sep">/</span>
            <span>{formatBytes(bytes)}</span>
          </>
        ) : null}
      </div>
      <div className="wi-code-scroll" style={{ maxHeight }}>
        <JsonNode
          value={value}
          depth={0}
          expandSignal={expandSignal}
          defaultExpanded={defaultExpanded}
          searchQuery={searchQuery}
        />
      </div>
    </div>
  )
}

function PlainTextViewer({
  value,
  searchQuery = '',
  maxHeight = 480,
}: {
  value: string
  searchQuery?: string
  maxHeight?: number | string
}) {
  const text = value || '(empty)'
  const lines = text.split('\n').length
  return (
    <div className="wi-code">
      <div className="wi-code-bar">
        <span className="wi-code-badge">TEXT</span>
        <span>
          {lines} line{lines === 1 ? '' : 's'}
        </span>
        <span className="wi-code-sep">/</span>
        <span>{formatBytes(new TextEncoder().encode(text).length)}</span>
      </div>
      <div className="wi-code-scroll" style={{ maxHeight }}>
        <pre
          style={{
            margin: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
            font: 'inherit',
          }}
        >
          <HighlightedText text={text} query={searchQuery} />
        </pre>
      </div>
    </div>
  )
}

interface BodyLoadingNoticeProps {
  storedBody: WebhookStoredBody
  loadedBytes: number
}

function BodyLoadingNotice({ storedBody, loadedBytes }: BodyLoadingNoticeProps) {
  const totalBytes = storedBody.sizeBytes
  const pct = totalBytes > 0 ? Math.min(100, Math.round((loadedBytes / totalBytes) * 100)) : 0
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 'var(--radius-md)',
        background: 'color-mix(in srgb, var(--color-accent-2-100) 85%, transparent)',
        border: '1px solid color-mix(in srgb, var(--color-text) 12%, transparent)',
        color: 'var(--color-accent-2-900)',
        fontSize: '0.92rem',
        lineHeight: 1.55,
        display: 'grid',
        gap: 8,
      }}
    >
      <div>
        Loading full payload ({formatBytes(loadedBytes)} / {formatBytes(totalBytes)})
        {storedBody.contentType ? <> · <code>{storedBody.contentType}</code></> : null}…
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 999,
          background: 'color-mix(in srgb, var(--color-text) 10%, transparent)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: 'var(--color-accent-2-900)',
            transition: 'width 150ms ease',
          }}
        />
      </div>
    </div>
  )
}

interface BodyFetchErrorProps {
  message: string
  storedBody: WebhookStoredBody
  downloadUrl: string
  downloadFilename: string
  onRetry: () => void
}

function BodyFetchErrorNotice({
  message,
  storedBody,
  downloadUrl,
  downloadFilename,
  onRetry,
}: BodyFetchErrorProps) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 'var(--radius-md)',
        background: 'color-mix(in srgb, var(--color-accent-2-200) 85%, transparent)',
        border: '1px solid color-mix(in srgb, var(--color-accent-2-700) 25%, transparent)',
        color: 'var(--color-accent-800)',
        fontSize: '0.92rem',
        lineHeight: 1.55,
        display: 'grid',
        gap: 10,
      }}
    >
      <div style={{ overflowWrap: 'anywhere' }}>
        Failed to load body ({formatBytes(storedBody.sizeBytes)}): {message}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onRetry}
          style={{
            padding: '8px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-accent)',
            color: 'var(--color-on-dark)',
            border: 'none',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
        <a
          href={downloadUrl}
          download={downloadFilename}
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '8px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'color-mix(in srgb, var(--color-surface-raised) 70%, transparent)',
            color: 'var(--color-text)',
            border: '1px solid color-mix(in srgb, var(--color-text) 16%, transparent)',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Download body
        </a>
      </div>
    </div>
  )
}

interface BodyContentViewerProps {
  body: { value: unknown; isJson: boolean }
  expandSignal: number
  defaultExpanded: boolean
  storageKey: string
}

function BodyContentViewer({
  body,
  expandSignal,
  defaultExpanded,
  storageKey,
}: BodyContentViewerProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const plainText = useMemo(() => {
    if (body.isJson) {
      try {
        return JSON.stringify(body.value, null, 2)
      } catch {
        return String(body.value ?? '')
      }
    }
    return typeof body.value === 'string'
      ? body.value
      : JSON.stringify(body.value, null, 2)
  }, [body])

  const matchCount = useMemo(
    () => countMatches(plainText, searchQuery),
    [plainText, searchQuery]
  )

  return (
    <div style={{ display: 'grid', gap: 10, minWidth: 0 }}>
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            position: 'relative',
            flex: '1 1 240px',
            minWidth: 0,
          }}
        >
          <input
            type="search"
            placeholder="Search in body…"
            aria-label={`Search in ${storageKey}`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="wi-search"
          />
        </div>
        {searchQuery ? (
          <span
            style={{
              fontSize: '0.82rem',
              color: matchCount > 0 ? 'var(--color-sky-800)' : 'var(--color-danger)',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            {matchCount} match{matchCount === 1 ? '' : 'es'}
          </span>
        ) : null}
        {searchQuery ? (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            style={{
              background: 'color-mix(in srgb, var(--color-surface-raised) 70%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-text) 12%, transparent)',
              borderRadius: 'var(--radius-md)',
              padding: '6px 10px',
              cursor: 'pointer',
              color: 'inherit',
              fontSize: '0.82rem',
              fontWeight: 700,
            }}
          >
            Clear
          </button>
        ) : null}
      </div>
      {body.isJson ? (
        <JsonViewer
          value={body.value}
          expandSignal={expandSignal}
          defaultExpanded={defaultExpanded}
          searchQuery={searchQuery}
          maxHeight="70vh"
        />
      ) : (
        <PlainTextViewer
          value={plainText}
          searchQuery={searchQuery}
          maxHeight="70vh"
        />
      )}
    </div>
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
    <div className="wi-panel">
      <div className={expanded ? 'wi-panel-head' : 'wi-panel-head is-plain'}>
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
              flex: 'none',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-sky-200)',
              color: 'var(--color-accent-800)',
              fontSize: 10,
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 140ms var(--motion-easing-standard)',
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
      {expanded ? <div className="wi-panel-body">{children}</div> : null}
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
        background: 'var(--color-surface-raised)',
        border: '1px solid var(--color-divider-strong)',
        borderRadius: 'var(--radius-full)',
        padding: '6px 14px 6px 8px',
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
          /* A switch is a primary control, so its on-state is the accent.
             The yellow ramp stays reserved for the warm note. */
          borderRadius: 'var(--radius-full)',
          background: checked ? 'var(--color-accent)' : 'var(--color-neutral-400)',
          transition: 'background 160ms var(--motion-easing-standard)',
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
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-on-dark)',
            boxShadow: 'var(--shadow-sm)',
            transition: 'left 160ms var(--motion-easing-standard)',
            }}
        />
      </span>
      <span>{label}</span>
    </button>
  )
}

type AuthCredentialKind = 'header' | 'query'

interface AuthCredentialDraft {
  key: string
  name: string
  value: string
}

let authRowCounter = 0
function nextAuthRowKey(): string {
  authRowCounter += 1
  return `auth-row-${authRowCounter}`
}

function generateSecretValue(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function nextGeneratedName(base: string, existingNames: string[]): string {
  const taken = new Set(existingNames.map((name) => name.toLowerCase()))
  if (!taken.has(base.toLowerCase())) {
    return base
  }
  let suffix = 2
  while (taken.has(`${base.toLowerCase()}-${suffix}`)) {
    suffix += 1
  }
  return `${base}-${suffix}`
}

function toCredentialDrafts(
  entries: Array<{ name: string; value: string }> | undefined
): AuthCredentialDraft[] {
  return (entries ?? []).map((entry) => ({
    key: nextAuthRowKey(),
    name: entry.name,
    value: entry.value,
  }))
}

// Drops rows the user started and abandoned (both fields blank) while keeping
// half-filled ones so the API can explain what is missing.
function toCredentialPayload(rows: AuthCredentialDraft[]): Array<{ name: string; value: string }> {
  return rows
    .map((row) => ({ name: row.name.trim(), value: row.value.trim() }))
    .filter((entry) => entry.name || entry.value)
}

function toCompleteCredentials(
  rows: AuthCredentialDraft[]
): Array<{ name: string; value: string }> {
  return toCredentialPayload(rows).filter((entry) => entry.name && entry.value)
}

const AUTH_INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid color-mix(in srgb, var(--color-text) 16%, transparent)',
  background: 'color-mix(in srgb, var(--color-surface-raised) 85%, transparent)',
  color: 'inherit',
  fontSize: '0.88rem',
  fontFamily: 'var(--font-mono)',
  boxSizing: 'border-box',
}

const AUTH_INVALID_INPUT_STYLE: React.CSSProperties = {
  ...AUTH_INPUT_STYLE,
  border: '1px solid color-mix(in srgb, var(--color-danger) 55%, transparent)',
}

const CREDENTIAL_COPY: Record<
  AuthCredentialKind,
  {
    heading: string
    toggleOn: string
    toggleOff: string
    blurb: string
    namePlaceholder: string
    valuePlaceholder: string
    nameLabel: string
    valueLabel: string
    emptyText: string
    generateLabel: string
    generateTitle: string
    addLabel: string
    limit: number
  }
> = {
  header: {
    heading: 'Required Headers',
    toggleOn: 'Require headers: ON',
    toggleOff: 'Require headers: OFF',
    blurb:
      'Secret headers every callback must include. The sender adds each one as a custom request header in their application.',
    namePlaceholder: 'Header name (e.g. X-Callback-Key)',
    valuePlaceholder: 'Expected value',
    nameLabel: 'Header name',
    valueLabel: 'Header value',
    emptyText: 'No headers configured yet.',
    generateLabel: '⚡ Generate Secret Header',
    generateTitle: 'Create a secret header for this webhook and enable header authorization',
    addLabel: '+ Add Header Manually',
    limit: MAX_WEBHOOK_AUTH_HEADERS,
  },
  query: {
    heading: 'Required Query Params',
    toggleOn: 'Require query params: ON',
    toggleOff: 'Require query params: OFF',
    blurb:
      'Secret query params every callback must carry in its URL. Useful when the sender cannot set custom headers — they just call the receive URL with the params appended.',
    namePlaceholder: 'Param name (e.g. callback_key)',
    valuePlaceholder: 'Expected value',
    nameLabel: 'Query param name',
    valueLabel: 'Query param value',
    emptyText: 'No query params configured yet.',
    generateLabel: '⚡ Generate Secret Query Param',
    generateTitle: 'Create a secret query param for this webhook and enable query param authorization',
    addLabel: '+ Add Query Param Manually',
    limit: MAX_WEBHOOK_AUTH_QUERY_PARAMS,
  },
}

interface CredentialEditorProps {
  kind: AuthCredentialKind
  enabled: boolean
  onEnabledChange: (next: boolean) => void
  rows: AuthCredentialDraft[]
  onRowChange: (key: string, field: 'name' | 'value', value: string) => void
  onRowRemove: (key: string) => void
  onRowAdd: () => void
  onGenerate: () => void
  busy: boolean
}

function CredentialEditor({
  kind,
  enabled,
  onEnabledChange,
  rows,
  onRowChange,
  onRowRemove,
  onRowAdd,
  onGenerate,
  busy,
}: CredentialEditorProps) {
  const copy = CREDENTIAL_COPY[kind]
  const atLimit = rows.length >= copy.limit

  return (
    <div
      style={{
        display: 'grid',
        gap: 12,
        minWidth: 0,
        padding: 14,
        borderRadius: 'var(--radius-md)',
        border: '1px solid color-mix(in srgb, var(--color-text) 12%, transparent)',
        background: 'color-mix(in srgb, var(--color-surface-raised) 55%, transparent)',
      }}
    >
      <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{copy.heading}</div>
      <p
        style={{
          margin: 0,
          color: 'var(--color-text-secondary)',
          fontSize: '0.88rem',
          lineHeight: 1.55,
        }}
      >
        {copy.blurb}
      </p>

      <ToggleSwitch
        checked={enabled}
        onChange={onEnabledChange}
        label={enabled ? copy.toggleOn : copy.toggleOff}
      />

      <div style={{ display: 'grid', gap: 8, minWidth: 0 }}>
        {rows.map((row) => {
          const trimmedName = row.name.trim()
          // Query param names are stricter than header names, so flag a bad one
          // inline instead of waiting for the API to reject the whole save.
          const nameInvalid =
            kind === 'query' && trimmedName.length > 0 && !isValidWebhookQueryParamName(trimmedName)

          return (
            <div key={row.key} style={{ display: 'grid', gap: 4, minWidth: 0 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(120px, 1fr) minmax(160px, 2fr) auto',
                  gap: 8,
                  alignItems: 'center',
                  minWidth: 0,
                }}
              >
                <input
                  type="text"
                  placeholder={copy.namePlaceholder}
                  aria-label={copy.nameLabel}
                  aria-invalid={nameInvalid || undefined}
                  value={row.name}
                  onChange={(e) => onRowChange(row.key, 'name', e.target.value)}
                  style={nameInvalid ? AUTH_INVALID_INPUT_STYLE : AUTH_INPUT_STYLE}
                />
                <input
                  type="text"
                  placeholder={copy.valuePlaceholder}
                  aria-label={copy.valueLabel}
                  value={row.value}
                  onChange={(e) => onRowChange(row.key, 'value', e.target.value)}
                  style={AUTH_INPUT_STYLE}
                />
                <button
                  type="button"
                  onClick={() => onRowRemove(row.key)}
                  title={`Remove ${kind === 'header' ? 'header' : 'query param'}`}
                  aria-label={`Remove ${kind === 'header' ? 'header' : 'query param'}`}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border:
                      '1px solid color-mix(in srgb, var(--color-accent-2-700) 25%, transparent)',
                    background: 'color-mix(in srgb, var(--color-accent-2-200) 70%, transparent)',
                    color: 'var(--color-accent-800)',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  ✕
                </button>
              </div>
              {nameInvalid ? (
                <span style={{ fontSize: '0.78rem', color: 'var(--color-danger)' }}>
                  Use letters, digits and _ . ~ - only. &quot;token&quot; and &quot;path&quot; are
                  reserved.
                </span>
              ) : null}
            </div>
          )
        })}
        {rows.length === 0 ? (
          <p
            style={{
              margin: 0,
              color: 'var(--color-text-secondary)',
              fontSize: '0.85rem',
              fontStyle: 'italic',
            }}
          >
            {copy.emptyText}
          </p>
        ) : null}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          className="btn btn-primary"
          type="button"
          onClick={onGenerate}
          disabled={busy || atLimit}
          title={copy.generateTitle}
        >
          {busy ? 'Working…' : copy.generateLabel}
        </button>
        <button className="btn" type="button" onClick={onRowAdd} disabled={atLimit}>
          {copy.addLabel}
        </button>
      </div>
    </div>
  )
}

function AuthRequirementsPanel({
  token,
  onConfigChange,
}: {
  token: string
  onConfigChange: (config: WebhookAuthConfig) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [headersEnabled, setHeadersEnabled] = useState(false)
  const [headerRows, setHeaderRows] = useState<AuthCredentialDraft[]>([])
  const [queryEnabled, setQueryEnabled] = useState(false)
  const [queryRows, setQueryRows] = useState<AuthCredentialDraft[]>([])
  const [savedConfig, setSavedConfig] = useState<WebhookAuthConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const applyConfig = useCallback(
    (config: WebhookAuthConfig) => {
      setHeadersEnabled(config.enabled)
      setHeaderRows(toCredentialDrafts(config.headers))
      setQueryEnabled(Boolean(config.queryEnabled))
      setQueryRows(toCredentialDrafts(config.queryParams))
      setSavedConfig(config)
      // The page header builds the receive URL from this, so it updates the
      // moment a param is saved rather than only after a reload.
      onConfigChange(config)
    },
    [onConfigChange]
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setMessage(null)

    fetchWebhookAuthConfig(token)
      .then((config) => {
        if (cancelled) return
        applyConfig(config)
        if (config.enabled || config.queryEnabled) {
          setExpanded(true)
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setMessage({
          kind: 'error',
          text: error instanceof Error ? error.message : 'Failed to load authorization settings',
        })
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [token, applyConfig])

  const updateRow = (
    kind: AuthCredentialKind,
    key: string,
    field: 'name' | 'value',
    nextValue: string
  ) => {
    const setter = kind === 'header' ? setHeaderRows : setQueryRows
    setter((prev) => prev.map((row) => (row.key === key ? { ...row, [field]: nextValue } : row)))
  }

  const removeRow = (kind: AuthCredentialKind, key: string) => {
    const setter = kind === 'header' ? setHeaderRows : setQueryRows
    setter((prev) => prev.filter((row) => row.key !== key))
  }

  const addRow = (kind: AuthCredentialKind) => {
    const setter = kind === 'header' ? setHeaderRows : setQueryRows
    setter((prev) => [...prev, { key: nextAuthRowKey(), name: '', value: '' }])
  }

  const handleCopy = async (key: string, value: string) => {
    const ok = await copyText(value)
    if (!ok) {
      setMessage({ kind: 'error', text: 'Clipboard access failed' })
      return
    }
    setCopiedKey(key)
    window.setTimeout(() => {
      setCopiedKey((current) => (current === key ? null : current))
    }, 1600)
  }

  // One request writes both halves, so the header and query rules can never end
  // up saved out of step with each other.
  const persist = async (next: WebhookAuthConfigInput, successText: string) => {
    setSaving(true)
    setMessage(null)
    try {
      const config = await saveWebhookAuthConfig(token, next)
      applyConfig(config)
      setMessage({ kind: 'ok', text: successText })
    } catch (error) {
      setMessage({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Failed to save authorization settings',
      })
    } finally {
      setSaving(false)
    }
  }

  const describeSavedState = (config: WebhookAuthConfigInput): string => {
    if (config.enabled && config.queryEnabled) {
      return 'Saved. Callbacks must send both the headers and the query params.'
    }
    if (config.enabled) {
      return 'Saved. Callbacks must send the required headers.'
    }
    if (config.queryEnabled) {
      return 'Saved. Callbacks must send the required query params.'
    }
    return 'Saved. Authorized receiving is off — every callback is accepted.'
  }

  const handleSave = async () => {
    const headers = toCredentialPayload(headerRows)
    const queryParams = toCredentialPayload(queryRows)

    if (headersEnabled && headers.length === 0) {
      setMessage({ kind: 'error', text: 'Add at least one header before requiring headers.' })
      return
    }

    if (queryEnabled && queryParams.length === 0) {
      setMessage({
        kind: 'error',
        text: 'Add at least one query param before requiring query params.',
      })
      return
    }

    const next: WebhookAuthConfigInput = {
      enabled: headersEnabled,
      headers,
      queryEnabled,
      queryParams,
    }

    await persist(next, describeSavedState(next))
  }

  // Generating turns that half on and saves immediately, so the secret shown in
  // the hand-off card below is always one that is actually being enforced.
  const handleGenerate = async (kind: AuthCredentialKind) => {
    const headers = toCompleteCredentials(headerRows)
    const queryParams = toCompleteCredentials(queryRows)

    if (kind === 'header') {
      const generated = {
        name: nextGeneratedName(
          'X-Webhook-Key',
          headers.map((header) => header.name)
        ),
        value: generateSecretValue(),
      }
      const next: WebhookAuthConfigInput = {
        enabled: true,
        headers: [...headers, generated],
        queryEnabled,
        queryParams,
      }
      await persist(next, describeSavedState(next))
      return
    }

    const generated = {
      name: nextGeneratedName(
        'webhook_key',
        queryParams.map((param) => param.name)
      ),
      value: generateSecretValue(),
    }
    const next: WebhookAuthConfigInput = {
      enabled: headersEnabled,
      headers,
      queryEnabled: true,
      queryParams: [...queryParams, generated],
    }
    await persist(next, describeSavedState(next))
  }

  const savedHeaders = savedConfig?.enabled ? (savedConfig.headers ?? []) : []
  const savedQueryParams = savedConfig?.queryEnabled ? (savedConfig.queryParams ?? []) : []
  const hasHandoff = savedHeaders.length > 0 || savedQueryParams.length > 0
  const sampleCaptureUrl = buildWebhookCaptureUrlWithQueryAuth(token, savedQueryParams)

  const meta = loading
    ? 'loading…'
    : headersEnabled || queryEnabled
      ? [
          headersEnabled
            ? `${headerRows.length} header${headerRows.length === 1 ? '' : 's'}`
            : null,
          queryEnabled
            ? `${queryRows.length} query param${queryRows.length === 1 ? '' : 's'}`
            : null,
        ]
          .filter(Boolean)
          .join(' + ') + ' required'
      : 'off — all senders accepted'

  return (
    <SectionPanel
      title="Authorized Receiving"
      meta={meta}
      expanded={expanded}
      onToggle={() => setExpanded((prev) => !prev)}
    >
      <div style={{ display: 'grid', gap: 14, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            color: 'var(--color-text-secondary)',
            fontSize: '0.9rem',
            lineHeight: 1.55,
          }}
        >
          Require secret headers, secret query params, or both before a callback is accepted. Each
          switch is independent — turn on whichever the sending system can actually set. Requests
          that do not satisfy every switch you have turned on are rejected with{' '}
          <code>401 Unauthorized</code>, never stored in the inbox, and reported below as blocked
          attempts.
        </p>

        <CredentialEditor
          kind="header"
          enabled={headersEnabled}
          onEnabledChange={setHeadersEnabled}
          rows={headerRows}
          onRowChange={(key, field, value) => updateRow('header', key, field, value)}
          onRowRemove={(key) => removeRow('header', key)}
          onRowAdd={() => addRow('header')}
          onGenerate={() => void handleGenerate('header')}
          busy={saving || loading}
        />

        <CredentialEditor
          kind="query"
          enabled={queryEnabled}
          onEnabledChange={setQueryEnabled}
          rows={queryRows}
          onRowChange={(key, field, value) => updateRow('query', key, field, value)}
          onRowRemove={(key) => removeRow('query', key)}
          onRowAdd={() => addRow('query')}
          onGenerate={() => void handleGenerate('query')}
          busy={saving || loading}
        />

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || loading}
          >
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>

        {message ? (
          <p
            style={{
              margin: 0,
              fontWeight: 700,
              fontSize: '0.88rem',
              color: message.kind === 'ok' ? 'var(--color-sky-800)' : 'var(--color-danger)',
              overflowWrap: 'anywhere',
            }}
          >
            {message.text}
          </p>
        ) : null}

        {hasHandoff ? (
          <div
            style={{
              padding: 14,
              borderRadius: 'var(--radius-md)',
              background: 'color-mix(in srgb, var(--color-sky-200) 70%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-sky-700) 35%, transparent)',
              display: 'grid',
              gap: 10,
              minWidth: 0,
            }}
          >
            <div style={{ fontWeight: 800, color: 'var(--color-sky-900)', fontSize: '0.92rem' }}>
              ✅ Give these credentials to the sender
            </div>
            <p
              style={{
                margin: 0,
                fontSize: '0.85rem',
                color: 'var(--color-sky-900)',
                lineHeight: 1.5,
              }}
            >
              Callbacks that carry {savedHeaders.length > 0 && savedQueryParams.length > 0
                ? 'all of these'
                : 'these'}{' '}
              are received; everything else is rejected with 401 and you get a blocked-attempt
              alert.
            </p>

            {savedHeaders.length > 0 ? (
              <div style={{ display: 'grid', gap: 8, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--color-sky-900)',
                  }}
                >
                  Request headers
                </div>
                {savedHeaders.map((header) => (
                  <div
                    key={`header-${header.name}`}
                    style={{
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      minWidth: 0,
                    }}
                  >
                    <code
                      style={{
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-md)',
                        background:
                          'color-mix(in srgb, var(--color-surface-raised) 85%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--color-sky-700) 25%, transparent)',
                        fontSize: '0.82rem',
                        overflowWrap: 'anywhere',
                        wordBreak: 'break-all',
                        minWidth: 0,
                      }}
                    >
                      {header.name}: {header.value}
                    </code>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => void handleCopy(`header-key-${header.name}`, header.name)}
                    >
                      {copiedKey === `header-key-${header.name}` ? 'Copied' : 'Copy Key'}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => void handleCopy(`header-value-${header.name}`, header.value)}
                    >
                      {copiedKey === `header-value-${header.name}` ? 'Copied' : 'Copy Value'}
                    </button>
                  </div>
                ))}
                {savedHeaders.length > 1 ? (
                  <div>
                    <button
                      type="button"
                      className="btn"
                      onClick={() =>
                        void handleCopy(
                          'all-headers',
                          savedHeaders
                            .map((header) => `${header.name}: ${header.value}`)
                            .join('\n')
                        )
                      }
                    >
                      {copiedKey === 'all-headers' ? 'Copied' : 'Copy All Headers'}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {savedQueryParams.length > 0 ? (
              <div style={{ display: 'grid', gap: 8, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--color-sky-900)',
                  }}
                >
                  Query params
                </div>
                {savedQueryParams.map((param) => (
                  <div
                    key={`query-${param.name}`}
                    style={{
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      minWidth: 0,
                    }}
                  >
                    <code
                      style={{
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-md)',
                        background:
                          'color-mix(in srgb, var(--color-surface-raised) 85%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--color-sky-700) 25%, transparent)',
                        fontSize: '0.82rem',
                        overflowWrap: 'anywhere',
                        wordBreak: 'break-all',
                        minWidth: 0,
                      }}
                    >
                      {param.name}={param.value}
                    </code>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => void handleCopy(`query-key-${param.name}`, param.name)}
                    >
                      {copiedKey === `query-key-${param.name}` ? 'Copied' : 'Copy Key'}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => void handleCopy(`query-value-${param.name}`, param.value)}
                    >
                      {copiedKey === `query-value-${param.name}` ? 'Copied' : 'Copy Value'}
                    </button>
                  </div>
                ))}
                <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
                  <span
                    style={{ fontSize: '0.8rem', color: 'var(--color-sky-900)', lineHeight: 1.5 }}
                  >
                    Ready-to-use receive URL — the sender can call this as-is:
                  </span>
                  <code
                    style={{
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-md)',
                      background: 'color-mix(in srgb, var(--color-surface-raised) 85%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--color-sky-700) 25%, transparent)',
                      fontSize: '0.82rem',
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-all',
                      minWidth: 0,
                    }}
                  >
                    {sampleCaptureUrl}
                  </code>
                  <div>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => void handleCopy('query-capture-url', sampleCaptureUrl)}
                    >
                      {copiedKey === 'query-capture-url' ? 'Copied' : 'Copy Receive URL'}
                    </button>
                  </div>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--color-sky-900)',
                      lineHeight: 1.5,
                      opacity: 0.85,
                    }}
                  >
                    Anything in a URL can be logged by proxies and browser history along the way.
                    Prefer headers when the sending system supports them, and rotate a query secret
                    if you suspect it leaked.
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </SectionPanel>
  )
}

function describeBlockedReason(record: WebhookBlockedRecord): string {
  const parts: string[] = []
  const missingQueryParams = record.missingQueryParams ?? []
  const mismatchedQueryParams = record.mismatchedQueryParams ?? []

  if (record.missingHeaders.length > 0) {
    parts.push(`missing header${record.missingHeaders.length === 1 ? '' : 's'}: ${record.missingHeaders.join(', ')}`)
  }
  if (record.mismatchedHeaders.length > 0) {
    parts.push(`wrong header value for: ${record.mismatchedHeaders.join(', ')}`)
  }
  if (missingQueryParams.length > 0) {
    parts.push(
      `missing query param${missingQueryParams.length === 1 ? '' : 's'}: ${missingQueryParams.join(', ')}`
    )
  }
  if (mismatchedQueryParams.length > 0) {
    // Covers a wrong value and a required param sent more than once; the API
    // rejects both the same way.
    parts.push(`wrong query param value for: ${mismatchedQueryParams.join(', ')}`)
  }
  return parts.join(' · ') || 'authorization failed'
}

function BlockedAttemptsPanel({
  blocked,
  clearing,
  onClear,
}: {
  blocked: WebhookBlockedRecord[]
  clearing: boolean
  onClear: () => void
}) {
  const [expanded, setExpanded] = useState(true)

  return (
    <SectionPanel
      title="Blocked Callback Attempts"
      meta={`${blocked.length} unauthorized attempt${blocked.length === 1 ? '' : 's'}`}
      expanded={expanded}
      onToggle={() => setExpanded((prev) => !prev)}
      actions={
        <button
          type="button"
          onClick={onClear}
          disabled={clearing || blocked.length === 0}
          style={{
            padding: '4px 10px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid color-mix(in srgb, var(--color-text) 16%, transparent)',
            background: 'color-mix(in srgb, var(--color-surface-raised) 85%, transparent)',
            color: 'inherit',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          {clearing ? 'Clearing…' : 'Clear Log'}
        </button>
      }
    >
      <div style={{ display: 'grid', gap: 8, minWidth: 0 }}>
        {blocked.map((record) => (
          <div
            key={record.id}
            style={{
              padding: 12,
              borderRadius: 'var(--radius-md)',
              background: 'color-mix(in srgb, var(--color-accent-2-200) 50%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-accent-2-700) 20%, transparent)',
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 800,
                  color: 'var(--color-accent-800)',
                  background: 'color-mix(in srgb, var(--color-accent-2-700) 12%, transparent)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                {record.method} · 401 blocked
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                {formatDateTime(record.receivedAt)}
              </span>
            </div>
            <div
              style={{
                marginTop: 6,
                fontWeight: 700,
                fontSize: '0.9rem',
                overflowWrap: 'anywhere',
              }}
            >
              {record.path} — {describeBlockedReason(record)}
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: '0.8rem',
                color: 'var(--color-text-secondary)',
                overflowWrap: 'anywhere',
              }}
            >
              from {record.ip || 'unknown IP'}
              {record.clientApp ? ` · ${record.clientApp}` : ''}
              {record.userAgent ? ` · ${record.userAgent}` : ''}
            </div>
          </div>
        ))}
        {blocked.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            No blocked attempts recorded.
          </p>
        ) : null}
      </div>
    </SectionPanel>
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
  const [fullBodyCache, setFullBodyCache] = useState<Record<string, BodyFetchState>>({})
  const [bodyFetchTick, setBodyFetchTick] = useState(0)
  const fetchedBodyIdsRef = useRef<Set<string>>(new Set())
  const cancelledRef = useRef(false)
  // The 2.5s inbox poll competes with an in-flight body transfer for the
  // browser's connections to the same origin, so it pauses while one is
  // loading (mirrors the same pause in the API's own webhook inspector page).
  const bodyLoadingRef = useRef(false)
  const [blockedDismissedAt, setBlockedDismissedAt] = useState<string | null>(null)
  const [clearingBlocked, setClearingBlocked] = useState(false)
  const [authConfig, setAuthConfig] = useState<WebhookAuthConfig | null>(null)

  useEffect(() => {
    try {
      setBlockedDismissedAt(window.localStorage.getItem(`webhook-blocked-dismissed-${token}`))
    } catch {
      setBlockedDismissedAt(null)
    }
  }, [token])

  const blockedAttempts = useMemo(() => payload.blocked ?? [], [payload.blocked])

  // Params are only appended once the requirement is actually switched on —
  // showing them while it is off would hand out a URL carrying secrets that
  // nothing is checking.
  const activeQueryAuthParams = useMemo(
    () => (authConfig?.queryEnabled ? (authConfig.queryParams ?? []) : []),
    [authConfig]
  )

  // The URL a sender must actually call. Built from the capture URL the API
  // reported so it keeps the real public origin, with the required query params
  // appended and percent-encoded — this is what gets copied and handed out.
  const receiveUrl = useMemo(
    () => appendWebhookQueryAuthParams(payload.captureUrl, activeQueryAuthParams),
    [payload.captureUrl, activeQueryAuthParams]
  )
  const newBlockedAttempts = useMemo(
    () =>
      blockedAttempts.filter(
        (record) => !blockedDismissedAt || record.receivedAt > blockedDismissedAt
      ),
    [blockedAttempts, blockedDismissedAt]
  )

  const dismissBlockedBanner = () => {
    const latest = blockedAttempts[0]?.receivedAt || new Date().toISOString()
    setBlockedDismissedAt(latest)
    try {
      window.localStorage.setItem(`webhook-blocked-dismissed-${token}`, latest)
    } catch {
      /* ignore storage failures */
    }
  }

  const handleClearBlocked = async () => {
    setClearingBlocked(true)
    try {
      await clearWebhookBlockedAttempts(token)
      setPayload((current) => ({ ...current, blocked: [] }))
      setError(null)
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Failed to clear blocked attempts'
      )
    } finally {
      setClearingBlocked(false)
    }
  }

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
      if (bodyLoadingRef.current) {
        return
      }
      void loadRequests(false)
    }, 2500)

    return () => {
      cancelledRef.current = true
      window.clearInterval(intervalId)
    }
  }, [token, loadRequests])

  // Deliberately keyed on the request id (not the `selectedRequest` object):
  // the 2.5s poll replaces `payload` wholesale, so `selectedRequest` gets a
  // new object identity every tick even when nothing about it changed. Depending
  // on the object itself re-ran this effect on every poll, whose cleanup
  // cancelled the in-flight transfer without restarting it (guarded by
  // fetchedBodyIdsRef) — the loading notice then froze at whatever progress
  // it last reported instead of ever completing.
  useEffect(() => {
    if (!selectedRequest || !token || !selectedRequest.body.truncated) {
      return
    }
    const requestId = selectedRequest.id
    if (fetchedBodyIdsRef.current.has(requestId)) {
      return
    }
    fetchedBodyIdsRef.current.add(requestId)

    let cancelled = false
    const totalBytes = selectedRequest.body.sizeBytes
    bodyLoadingRef.current = true
    setFullBodyCache((prev) => ({
      ...prev,
      [requestId]: { status: 'loading', loadedBytes: 0, totalBytes },
    }))

    fetchFullRequestBody(token, requestId, selectedRequest.body, (loadedBytes) => {
      if (cancelled) return
      setFullBodyCache((prev) => ({
        ...prev,
        [requestId]: { status: 'loading', loadedBytes, totalBytes },
      }))
    })
      .then((body) => {
        if (cancelled) return
        setFullBodyCache((prev) => ({
          ...prev,
          [requestId]: { status: 'success', body },
        }))
      })
      .catch((requestError: unknown) => {
        if (cancelled) return
        const message =
          requestError instanceof Error ? requestError.message : 'Failed to load full body'
        setFullBodyCache((prev) => ({
          ...prev,
          [requestId]: { status: 'error', error: message },
        }))
        fetchedBodyIdsRef.current.delete(requestId)
      })
      .finally(() => {
        if (!cancelled) {
          bodyLoadingRef.current = false
        }
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRequest?.id, selectedRequest?.body.truncated, token, bodyFetchTick])

  const retryFullBodyFetch = useCallback((requestId: string) => {
    fetchedBodyIdsRef.current.delete(requestId)
    setFullBodyCache((prev) => {
      const next = { ...prev }
      delete next[requestId]
      return next
    })
    setBodyFetchTick((tick) => tick + 1)
  }, [])

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
      setFullBodyCache({})
      fetchedBodyIdsRef.current.clear()
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

  const startServerDownload = async (url: string, filename?: string) => {
    try {
      const probe = await fetch(url, { method: 'HEAD' })
      if (!probe.ok) {
        setError(
          `Download failed (status ${probe.status}). ` +
            (probe.status === 404
              ? 'The API server may be running an older build without this download route — restart/redeploy Angaadi-API.'
              : 'Check that the API server is reachable.')
        )
        return
      }
      setError(null)
      triggerUrlDownload(url, filename)
    } catch {
      setError(`Download failed: could not reach ${url}`)
    }
  }

  const handleDownloadRequest = (request: WebhookCaptureRecord) => {
    void startServerDownload(
      buildWebhookBodyAttachmentUrl(token, request.id, request.body.downloadUrl),
      buildBodyFilename(token, request.id, request.body.contentType)
    )
  }

  const handleDownloadAll = () => {
    if (payload.requests.length === 0) {
      return
    }
    void startServerDownload(buildWebhookDownloadAllUrl(token), `webhook-${token}.zip`)
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
        [
          'Remote IP',
          selectedRequest.sender?.callbackSenderIp ||
            selectedRequest.callbackSenderIp ||
            selectedRequest.sender?.ip ||
            selectedRequest.ip ||
            'Unknown',
        ],
        ['Sender client', selectedRequest.sender?.clientApp || selectedRequest.sender?.userAgent || 'Unknown'],
        ['Body size', formatBytes(selectedRequest.body.sizeBytes)],
        ['Status', String(selectedRequest.response.statusCode)],
        ['Request URL', selectedRequest.url],
      ]
    : []

  return (
    <main
      className="app-main wi-page"
      id="webhook-inspector-page"
      data-testid="webhook-inspector-page"
      style={{ minWidth: 0 }}
    >
      <section
        className="container p-6"
        style={{ display: 'grid', gap: 16, minWidth: 0, maxWidth: '100%' }}
      >
        <div className="wi-panel">
          <div className="wi-panel-head">
            <div style={{ minWidth: 0, flex: '1 1 auto' }}>
              <p className="wi-eyebrow">Live webhook inbox</p>
              <h1 className="wi-title">{token}</h1>
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
            <div className="wi-panel-body" style={{ display: 'grid', gap: 14, minWidth: 0 }}>
              <p className="wi-note">
                Send payloads to the public webhook URL below. The inspector polls every 2.5s and
                renders every captured request.
              </p>
              <p className="wi-callout">
                <span aria-hidden="true">🕒</span>
                <span>
                  Requests and their bodies are deleted after{' '}
                  {payload.retentionHours ?? DEFAULT_WEBHOOK_RETENTION_HOURS} hours. Download
                  anything you need to keep.
                </span>
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
                    borderRadius: 'var(--radius-md)',
                    background: 'color-mix(in srgb, var(--color-surface-raised) 72%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--color-text) 8%, transparent)',
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.72rem',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      fontWeight: 800,
                      color: 'var(--color-neutral-700)',
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
                    {receiveUrl}
                  </code>
                  {activeQueryAuthParams.length > 0 ? (
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: '0.78rem',
                        lineHeight: 1.5,
                        color: 'var(--color-text-secondary)',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      Includes the {activeQueryAuthParams.length} required query param
                      {activeQueryAuthParams.length === 1 ? '' : 's'} (
                      {activeQueryAuthParams.map((param) => param.name).join(', ')}). Send this
                      exact URL — a call without the param
                      {activeQueryAuthParams.length === 1 ? '' : 's'} is rejected with 401.
                    </div>
                  ) : null}
                  <button
                    className="btn btn-primary mt-2"
                    onClick={() => void handleCopy('capture', receiveUrl)}
                  >
                    {copyState === 'capture' ? 'Copied' : 'Copy Receive URL'}
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
                  {`Download All (${payload.requests.length}) as .zip`}
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
                <div className="wi-callout is-warning" style={{ overflowWrap: 'anywhere' }}>
                  <span aria-hidden="true">⚠</span>
                  <span>
                  The receive URL currently points to <code>{publicApiOrigin}</code>. External
                  webhook providers cannot call that address. Set
                  <code> VITE_WEBHOOK_PUBLIC_API_ORIGIN</code> to your public production API
                  origin.
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {newBlockedAttempts.length > 0 ? (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              padding: '14px 18px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-accent-2-100)',
              border: '1px solid var(--color-accent-2-300)',
              color: 'var(--color-accent-2-900)',
            }}
          >
            <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
              <strong style={{ fontSize: '0.95rem' }}>
                🚫 {newBlockedAttempts.length} unauthorized callback attempt
                {newBlockedAttempts.length === 1 ? '' : 's'} blocked
              </strong>
              <div style={{ fontSize: '0.85rem', marginTop: 4 }}>
                Latest: {formatDateTime(newBlockedAttempts[0].receivedAt)} from{' '}
                {newBlockedAttempts[0].ip || 'unknown IP'} —{' '}
                {describeBlockedReason(newBlockedAttempts[0])}. Details in Blocked Callback
                Attempts below.
              </div>
            </div>
            <button
              type="button"
              onClick={dismissBlockedBanner}
              style={{
                flexShrink: 0,
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid color-mix(in srgb, var(--color-accent-2-700) 35%, transparent)',
                background: 'color-mix(in srgb, var(--color-surface-raised) 80%, transparent)',
                color: 'var(--color-accent-800)',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <AuthRequirementsPanel token={token} onConfigChange={setAuthConfig} />

        {blockedAttempts.length > 0 || payload.authEnabled || payload.authQueryEnabled ? (
          <BlockedAttemptsPanel
            blocked={blockedAttempts}
            clearing={clearingBlocked}
            onClear={() => void handleClearBlocked()}
          />
        ) : null}

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
              borderRadius: 'var(--radius-md)',
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
                  color: 'var(--color-accent-900)',
                  background: 'var(--color-sky-200)',
                  borderRadius: 'var(--radius-full)',
                  padding: '2px 10px',
                  fontSize: '0.85rem',
                  fontVariantNumeric: 'tabular-nums',
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
              <p className="wi-empty">
                Nothing captured yet. Send a request to <code>{receiveUrl}</code> and it
                will appear here within 2.5s.
              </p>
            ) : null}

            <div className="wi-log">
              {payload.requests.map((request) => {
                const isSelected = selectedRequest?.id === request.id
                const selectRow = () => setSelectedRequestId(request.id)
                const senderLabel =
                  request.sender?.callbackSenderIp ||
                  request.callbackSenderIp ||
                  request.sender?.ip ||
                  request.ip ||
                  null
                return (
                  <div
                    key={request.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    onClick={selectRow}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        selectRow()
                      }
                    }}
                    className={isSelected ? 'wi-row is-selected' : 'wi-row'}
                  >
                    <span className="wi-method" data-method={request.method}>
                      {request.method}
                    </span>
                    <span className="wi-row-spacer" />
                    <span
                      className="wi-status"
                      data-class={request.response.statusCode >= 400 ? 'error' : 'ok'}
                    >
                      {request.response.statusCode}
                    </span>

                    <span className="wi-row-path">{request.path}</span>

                    <span className="wi-row-meta">
                      <span>{formatDateTime(request.receivedAt)}</span>
                      <span>{formatBytes(request.body.sizeBytes)}</span>
                      {senderLabel ? <code>{senderLabel}</code> : null}
                      {request.sender?.clientApp ? <span>{request.sender.clientApp}</span> : null}
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleDownloadRequest(request)
                        }}
                        title="Download this request body"
                        aria-label="Download this request body"
                        style={{
                          marginLeft: 'auto',
                          padding: '2px 10px',
                          fontSize: 11,
                          minHeight: 0,
                        }}
                      >
                        ↓ Body
                      </button>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 14, minWidth: 0 }}>
            {selectedRequest ? (
              <>
                <div className="wi-toolbar">
                  <div className="wi-toolbar-group">
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
                    Download Body
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
                          borderRadius: 'var(--radius-md)',
                          background: 'color-mix(in srgb, var(--color-surface-raised) 72%, transparent)',
                          border: '1px solid color-mix(in srgb, var(--color-text) 8%, transparent)',
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            fontSize: '0.7rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            fontWeight: 800,
                            color: 'var(--color-neutral-700)',
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
                  {(() => {
                    if (selectedRequest.body.truncated) {
                      const cached = fullBodyCache[selectedRequest.id]
                      if (!cached || cached.status === 'loading') {
                        return (
                          <BodyLoadingNotice
                            storedBody={selectedRequest.body}
                            loadedBytes={cached?.status === 'loading' ? cached.loadedBytes : 0}
                          />
                        )
                      }
                      if (cached.status === 'error') {
                        return (
                          <BodyFetchErrorNotice
                            message={cached.error}
                            storedBody={selectedRequest.body}
                            downloadUrl={buildWebhookBodyAttachmentUrl(
                              token,
                              selectedRequest.id,
                              selectedRequest.body.downloadUrl
                            )}
                            downloadFilename={buildBodyFilename(
                              token,
                              selectedRequest.id,
                              selectedRequest.body.contentType
                            )}
                            onRetry={() => retryFullBodyFetch(selectedRequest.id)}
                          />
                        )
                      }
                      return (
                        <BodyContentViewer
                          body={cached.body}
                          expandSignal={jsonExpandSignal}
                          defaultExpanded={jsonExpandAll}
                          storageKey="request-body"
                        />
                      )
                    }
                    if (requestBody) {
                      return (
                        <BodyContentViewer
                          body={requestBody}
                          expandSignal={jsonExpandSignal}
                          defaultExpanded={jsonExpandAll}
                          storageKey="request-body"
                        />
                      )
                    }
                    return <PlainTextViewer value="" maxHeight="70vh" />
                  })()}
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
                        borderRadius: 'var(--radius-md)',
                        background: 'color-mix(in srgb, var(--color-surface-raised) 72%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--color-text) 8%, transparent)',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.72rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          fontWeight: 800,
                          color: 'var(--color-neutral-700)',
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
                        borderRadius: 'var(--radius-md)',
                        background: 'color-mix(in srgb, var(--color-surface-raised) 72%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--color-text) 8%, transparent)',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.72rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          fontWeight: 800,
                          color: 'var(--color-neutral-700)',
                          marginBottom: 6,
                        }}
                      >
                        Response Body
                      </div>
                      {responseBody ? (
                        <BodyContentViewer
                          body={responseBody}
                          expandSignal={jsonExpandSignal}
                          defaultExpanded={jsonExpandAll}
                          storageKey="response-body"
                        />
                      ) : (
                        <PlainTextViewer value="" maxHeight="70vh" />
                      )}
                    </div>
                  </div>
                </SectionPanel>

                <SectionPanel
                  title={SECTION_LABELS.sender}
                  meta={
                    selectedRequest.sender
                      ? [
                          selectedRequest.sender.callbackSenderIp || selectedRequest.sender.ip,
                          selectedRequest.sender.clientApp,
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'no sender details'
                      : 'not captured'
                  }
                  expanded={expandedSections.has('sender')}
                  onToggle={() => toggleSection('sender')}
                  actions={
                    selectedRequest.sender?.callbackSenderIp || selectedRequest.sender?.ip ? (
                      <a
                        href={`https://ipinfo.io/${encodeURIComponent(
                          selectedRequest.sender.callbackSenderIp || selectedRequest.sender.ip || ''
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid color-mix(in srgb, var(--color-text) 16%, transparent)',
                          background: 'color-mix(in srgb, var(--color-surface-raised) 85%, transparent)',
                          color: 'inherit',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textDecoration: 'none',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Lookup IP ↗
                      </a>
                    ) : undefined
                  }
                >
                  {selectedRequest.sender ? (
                    <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))',
                          gap: 10,
                          minWidth: 0,
                        }}
                      >
                        {buildSenderItems(selectedRequest.sender).map(([label, value]) => (
                          <div
                            key={label}
                            style={{
                              padding: 12,
                              borderRadius: 'var(--radius-md)',
                              background: 'color-mix(in srgb, var(--color-surface-raised) 72%, transparent)',
                              border: '1px solid color-mix(in srgb, var(--color-text) 8%, transparent)',
                              minWidth: 0,
                            }}
                          >
                            <div
                              style={{
                                fontSize: '0.7rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                fontWeight: 800,
                                color: 'var(--color-neutral-700)',
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
                      <div>
                        <div
                          style={{
                            fontSize: '0.72rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            fontWeight: 800,
                            color: 'var(--color-neutral-700)',
                            marginBottom: 6,
                          }}
                        >
                          All collected sender data (raw)
                        </div>
                        <JsonViewer
                          value={selectedRequest.sender}
                          expandSignal={jsonExpandSignal}
                          defaultExpanded={jsonExpandAll}
                        />
                      </div>
                    </div>
                  ) : (
                    <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
                      Sender details were not captured for this request (it was received before
                      sender tracking was enabled). New requests will include IP, reverse DNS,
                      client app, proxy and geo data.
                    </p>
                  )}
                </SectionPanel>
              </>
            ) : (
              <div className="card" style={{ borderRadius: 'var(--radius-md)', padding: 20 }}>
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
