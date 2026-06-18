/*
 * CRAWLER TEST FIXTURE — /bad-request
 *
 * Purpose: QA fixture for verifying a crawler's handling of HTTP 400 responses.
 * Renders 100 <a href> links, each pointing at the Angaadi-API endpoint
 *   GET {API_BASE}/status/400/<n>
 * which always responds 400 Bad Request. A crawler that schedules these links
 * for crawling should record 100 terminal 400 (non-retryable) responses.
 *
 * Links are built from API_BASE (VITE_BACKEND_URL) so they resolve to the
 * configured backend in both development and production.
 */
import React from 'react'
import { buildApiUrl, API_BASE } from '../lib/api'

const LINK_COUNT = 100
const methods = ['GET', 'POST', 'HEAD', 'PUT', 'DELETE']

// Build the 100 absolute endpoint URLs once.
const links = Array.from({ length: LINK_COUNT }, (_, i) => {
  const n = i + 1
  return {
    n,
    href: buildApiUrl(`/status/400/${n}`),
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
          <strong>Each returns:</strong> 400 Bad Request
        </p>
        <h1 style={titleStyle}>
          HTTP 400 Bad Request — Crawler Error-Handling Fixture
        </h1>
        <p style={metaStyle}>
          Endpoint base: <code>{API_BASE}/status/400/&lt;n&gt;</code>
        </p>
        <p>
          This page lists {LINK_COUNT} links, each pointing at an Angaadi-API
          endpoint that always responds with <strong>HTTP 400 Bad Request</strong>.
          A crawler that schedules these links should record {LINK_COUNT} terminal,
          non-retryable 400 responses.
        </p>

        <hr style={dividerStyle} />

        {batches.map((batch, b) => (
          <section key={b}>
            <h2 style={sectionHeadingStyle}>
              Batch {b + 1} · endpoints {b * 10 + 1}–{b * 10 + 10}
            </h2>
            <ul style={ulStyle}>
              {batch.map(({ n, href, method }) => (
                <li key={n} style={liStyle}>
                  <code style={methodStyle}>{method}</code>{' '}
                  <a href={href} style={linkStyle}>
                    {href}
                  </a>
                  <span style={noteStyle}>
                    — fixture endpoint #{n}, always responds 400 Bad Request
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
