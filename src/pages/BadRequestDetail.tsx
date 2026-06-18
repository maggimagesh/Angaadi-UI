/*
 * CRAWLER TEST FIXTURE — /bad-request/:id
 *
 * Detail page reached by clicking a link on the /bad-request fixture index.
 * On mount it issues the actual API call
 *   {method} {API_BASE}/status/400/<id>
 * via fetch (an in-app XHR, not a browser navigation to the backend), and
 * renders the resulting status. The endpoint always responds 400 Bad Request.
 */
import React, { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { buildApiUrl } from '../lib/api'

const methods = ['GET', 'POST', 'HEAD', 'PUT', 'DELETE']

interface CallResult {
  status: number
  statusText: string
  method: string
  url: string
  body: string
}

const pageStyle: React.CSSProperties = {
  background: '#f7f2f9',
  minHeight: '100vh',
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  color: '#1c1b1f',
  fontSize: '14px',
  lineHeight: 1.6,
}

const headerBandStyle: React.CSSProperties = {
  background: '#b3261e',
  color: '#fff',
  padding: '8px 0',
  fontSize: '13px',
  textAlign: 'center',
  letterSpacing: '0.02em',
}

const wrapperStyle: React.CSSProperties = {
  maxWidth: '720px',
  margin: '0 auto',
  padding: '24px 16px 64px',
}

const titleStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 700,
  marginBottom: '6px',
  lineHeight: 1.3,
}

const metaStyle: React.CSSProperties = {
  color: '#4a4458',
  fontSize: '13px',
  marginBottom: '4px',
}

const statusBadgeStyle = (ok: boolean): React.CSSProperties => ({
  display: 'inline-block',
  padding: '4px 10px',
  borderRadius: '6px',
  fontWeight: 700,
  color: '#fff',
  background: ok ? '#1b7a3d' : '#b3261e',
})

const preStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #d8cfe5',
  borderRadius: '8px',
  padding: '12px',
  overflowX: 'auto',
  fontSize: '13px',
}

const linkStyle: React.CSSProperties = {
  color: '#6750a4',
  fontWeight: 600,
  textDecoration: 'none',
}

export default function BadRequestDetail() {
  const { id } = useParams<{ id: string }>()
  const n = Number(id)
  const method = methods[n % methods.length] || 'GET'
  const path = `/status/400/${id}`
  const apiUrl = buildApiUrl(path)

  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<CallResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const callApi = useCallback(async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(apiUrl, { method, cache: 'no-store' })
      const text = method === 'HEAD' ? '' : await res.text()
      setResult({
        status: res.status,
        statusText: res.statusText,
        method,
        url: apiUrl,
        body: text,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }, [apiUrl, method])

  useEffect(() => {
    callApi()
  }, [callApi])

  return (
    <div style={pageStyle} data-testid="bad-request-detail">
      <div style={headerBandStyle}>
        Angaadi Research Portal &nbsp;|&nbsp; Crawler QA &nbsp;|&nbsp; HTTP 400 Fixture
      </div>

      <div style={wrapperStyle}>
        <p style={metaStyle}>
          <Link to="/bad-request" style={linkStyle}>
            ← Back to fixture index
          </Link>
        </p>
        <h1 style={titleStyle}>Bad Request endpoint #{id}</h1>
        <p style={metaStyle}>
          UI endpoint: <code>/bad-request/{id}</code>
        </p>
        <p style={metaStyle}>
          API call: <code>{method} {apiUrl}</code>
        </p>

        <hr style={{ border: 'none', borderTop: '1px solid #d8cfe5', margin: '16px 0' }} />

        {loading ? (
          <p data-testid="bad-request-detail-loading">Calling API…</p>
        ) : error ? (
          <div data-testid="bad-request-detail-error">
            <p style={statusBadgeStyle(false)}>Request error</p>
            <p style={metaStyle}>{error}</p>
            <button className="btn btn-primary" onClick={callApi}>
              Retry
            </button>
          </div>
        ) : result ? (
          <div data-testid="bad-request-detail-result">
            <p>
              <span
                style={statusBadgeStyle(result.status >= 200 && result.status < 300)}
                data-testid="bad-request-detail-status"
              >
                {result.status} {result.statusText}
              </span>
            </p>
            {result.body && (
              <pre style={preStyle} data-testid="bad-request-detail-body">
                {result.body}
              </pre>
            )}
            <button className="btn btn-primary" onClick={callApi}>
              Call again
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
