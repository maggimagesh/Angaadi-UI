/*
 * CRAWLER TEST FIXTURE — /bad-request
 *
 * Purpose: QA fixture for verifying a crawler's handling of HTTP 400 responses.
 * Renders 100 links, each pointing at the UI route
 *   /bad-request/<n>
 * Clicking a link navigates within the UI (no direct API URL in the href).
 * The detail page (BadRequestDetail) then issues the actual API call
 *   GET {API_BASE}/status/400/<n>
 * which always responds 400 Bad Request. This keeps the API call an
 * in-app fetch triggered by a UI interaction, rather than the browser
 * navigating straight to the backend endpoint.
 */
import React from 'react'
import { Link } from 'react-router-dom'

const LINK_COUNT = 100
const methods = ['GET', 'POST', 'HEAD', 'PUT', 'DELETE']

// Build the 100 UI endpoint paths once. These are in-app routes; the API
// call is performed by the detail page, not by following the href.
const links = Array.from({ length: LINK_COUNT }, (_, i) => {
  const n = i + 1
  return {
    n,
    to: `/bad-request/${n}`,
    method: methods[n % methods.length],
  }
})

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
  maxWidth: '960px',
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

const dividerStyle: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid #d8cfe5',
  margin: '16px 0',
}

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 700,
  marginTop: '22px',
  marginBottom: '8px',
  paddingBottom: '3px',
  borderBottom: '2px solid #f9dedc',
}

const ulStyle: React.CSSProperties = {
  listStyle: 'none',
  paddingLeft: 0,
  margin: '4px 0 8px',
}

const liStyle: React.CSSProperties = {
  padding: '4px 0',
  borderBottom: '1px solid #e4d9ea',
}

const methodStyle: React.CSSProperties = {
  display: 'inline-block',
  minWidth: '52px',
  fontWeight: 700,
  color: '#b3261e',
}

const linkStyle: React.CSSProperties = {
  color: '#6750a4',
  fontWeight: 600,
  textDecoration: 'none',
}

const noteStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#4a4458',
  fontStyle: 'italic',
  marginLeft: '6px',
}

export default function BadRequestPage() {
  // Group the 100 links into 10 batches of 10 for readability.
  const batches = Array.from({ length: 10 }, (_, b) =>
    links.slice(b * 10, b * 10 + 10),
  )

  return (
    <div style={pageStyle}>
      <div style={headerBandStyle}>
        Angaadi Research Portal &nbsp;|&nbsp; Crawler QA &nbsp;|&nbsp; HTTP 400 Fixture
      </div>

      <div style={wrapperStyle}>
        <p style={metaStyle}>
          <strong>Fixture:</strong> /bad-request &nbsp;·&nbsp;{' '}
          <strong>Links:</strong> {LINK_COUNT} &nbsp;·&nbsp;{' '}
          <strong>Each triggers:</strong> 400 Bad Request
        </p>
        <h1 style={titleStyle}>
          HTTP 400 Bad Request — Crawler Error-Handling Fixture
        </h1>
        <p style={metaStyle}>
          UI endpoint base: <code>/bad-request/&lt;n&gt;</code>
        </p>
        <p>
          This page lists {LINK_COUNT} UI links, each pointing at an in-app route{' '}
          <code>/bad-request/&lt;n&gt;</code>. Clicking a link navigates within the
          UI; the detail page then issues the API call to{' '}
          <code>/status/400/&lt;n&gt;</code>, which always responds with{' '}
          <strong>HTTP 400 Bad Request</strong>.
        </p>

        <hr style={dividerStyle} />

        {batches.map((batch, b) => (
          <section key={b}>
            <h2 style={sectionHeadingStyle}>
              Batch {b + 1} · endpoints {b * 10 + 1}–{b * 10 + 10}
            </h2>
            <ul style={ulStyle}>
              {batch.map(({ n, to, method }) => (
                <li key={n} style={liStyle}>
                  <code style={methodStyle}>{method}</code>{' '}
                  <Link to={to} style={linkStyle} data-testid={`bad-request-link-${n}`}>
                    {to}
                  </Link>
                  <span style={noteStyle}>
                    — UI endpoint #{n}, triggers a 400 Bad Request API call
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
