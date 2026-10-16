import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchRequestHeaders, maskValue, REQUEST_HEADERS_URL, type RequestHeadersReport } from '../api/requestHeaders'
import LoadingSpinner from '../components/LoadingSpinner'
import './RequestHeadersPage.css'

/**
 * `/request-headers` — "display the full request headers your browser sends",
 * after manytools.org/http-html-text/http-request-headers.
 *
 * The page asks the API to echo back the request it received, so the table
 * lists exactly what reached the server: the browser's own headers plus any
 * the hosting edge added on the way (flagged "proxy").
 */
export default function RequestHeadersPage() {
  const [report, setReport] = useState<RequestHeadersReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [hideProxy, setHideProxy] = useState(false)
  const [reveal, setReveal] = useState(false)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setReport(await fetchRequestHeaders())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load request headers')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const rows = useMemo(() => {
    if (!report) return []
    const needle = filter.trim().toLowerCase()
    return report.headers.filter(
      (h) =>
        (!hideProxy || h.origin === 'client') &&
        (!needle || h.name.toLowerCase().includes(needle) || h.value.toLowerCase().includes(needle))
    )
  }, [report, filter, hideProxy])

  const hasSensitive = report?.headers.some((h) => h.sensitive) ?? false
  const proxyCount = report?.headers.filter((h) => h.origin === 'proxy').length ?? 0

  const copyAll = async () => {
    if (!report) return
    const text = report.headers.map((h) => `${h.name}: ${h.value}`).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <main className="app-main rh-page" id="request-headers-page" data-testid="request-headers-page">
      <header className="rh-intro">
        <span className="tag tag-outline">HTTP tools</span>
        <h1 id="request-headers-title" data-testid="request-headers-title">
          HTTP headers — the full request headers your browser sends
        </h1>
        <p>
          Each time your browser asks a server for something over HTTP it sends a set of request
          headers describing itself and what it will accept. The table below lists the headers the
          Angaadi API received from this browser, in the order they arrived.
        </p>
      </header>

      {report && (
        <section className="rh-stats" aria-label="Request summary" data-testid="request-headers-summary">
          <div className="rh-stat">
            <div className="rh-stat-label">Your IP</div>
            <div className="rh-stat-value rh-mono" id="request-headers-ip" data-testid="request-headers-ip">
              {report.ip ?? 'Unknown'}
            </div>
          </div>
          <div className="rh-stat">
            <div className="rh-stat-label">Request</div>
            <div className="rh-stat-value rh-mono" data-testid="request-headers-method">
              {report.method} · {report.protocol.toUpperCase()}/{report.httpVersion}
            </div>
          </div>
          <div className="rh-stat">
            <div className="rh-stat-label">Headers</div>
            <div className="rh-stat-value" id="request-headers-count" data-testid="request-headers-count">
              {report.headerCount}
              {proxyCount > 0 && <span className="rh-stat-sub"> ({proxyCount} from proxy)</span>}
            </div>
          </div>
          <div className="rh-stat rh-stat-wide">
            <div className="rh-stat-label">User agent</div>
            <div className="rh-stat-value rh-mono rh-wrap" data-testid="request-headers-user-agent">
              {report.userAgent ?? '—'}
            </div>
          </div>
        </section>
      )}

      <section className="card rh-card" aria-labelledby="request-headers-table-title">
        <div className="rh-toolbar">
          <h2 id="request-headers-table-title" className="rh-card-title">Request headers</h2>
          <div className="rh-actions">
            <input
              className="input rh-filter"
              type="search"
              placeholder="Filter headers…"
              aria-label="Filter headers"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              id="request-headers-filter"
              data-testid="request-headers-filter"
            />
            <label className="rh-check">
              <input
                type="checkbox"
                checked={hideProxy}
                onChange={(e) => setHideProxy(e.target.checked)}
                data-testid="request-headers-hide-proxy"
              />
              Hide proxy headers
            </label>
            {hasSensitive && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setReveal((v) => !v)}
                aria-pressed={reveal}
                data-testid="request-headers-reveal"
              >
                {reveal ? 'Hide secrets' : 'Reveal secrets'}
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={copyAll} disabled={!report} data-testid="request-headers-copy">
              {copied ? 'Copied' : 'Copy all'}
            </button>
            <button type="button" className="btn btn-primary" onClick={load} disabled={loading} id="request-headers-refresh" data-testid="request-headers-refresh">
              Refresh
            </button>
          </div>
        </div>

        {loading && !report ? (
          <div className="rh-state" data-testid="request-headers-loading">
            <LoadingSpinner size="medium" text="Reading your request headers…" />
          </div>
        ) : error ? (
          <div className="rh-state rh-error" role="alert" data-testid="request-headers-error">
            <p>Error: {error}</p>
            <button type="button" className="btn btn-primary" onClick={load} data-testid="request-headers-retry">Retry</button>
          </div>
        ) : (
          <div className="rh-table-wrap">
            <table className="rh-table" id="request-headers-table" data-testid="request-headers-table">
              <thead>
                <tr>
                  <th scope="col">HTTP header</th>
                  <th scope="col">Value</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((h, i) => (
                  <tr key={`${h.name}-${i}`} data-testid="request-headers-row" data-header={h.name.toLowerCase()}>
                    <th scope="row" className="rh-name">
                      {h.name}
                      {h.origin === 'proxy' && <span className="rh-badge" title="Added by the hosting proxy, not your browser">proxy</span>}
                    </th>
                    <td className="rh-value">
                      {h.value === '' ? (
                        <span className="rh-empty">(empty)</span>
                      ) : h.sensitive && !reveal ? (
                        <span className="rh-masked" title="Hidden — use Reveal secrets">{maskValue(h.value)}</span>
                      ) : (
                        h.value
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={2} className="rh-empty-row" data-testid="request-headers-no-match">No headers match the filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {report && (
          <p className="rh-footnote" data-testid="request-headers-timestamp">
            Captured {new Date(report.timestamp).toLocaleString()} from{' '}
            <a href={REQUEST_HEADERS_URL} target="_blank" rel="noopener noreferrer" data-testid="request-headers-raw-link">
              the raw JSON endpoint
            </a>
            . This page reads the headers of a <code>fetch()</code> call; open the raw endpoint in a new tab to see the
            headers of a normal page navigation instead.
          </p>
        )}
      </section>
    </main>
  )
}
