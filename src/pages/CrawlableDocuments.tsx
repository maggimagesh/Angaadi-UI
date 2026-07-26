/*
 * CRAWLER TEST FIXTURE — /crawlableDocuments
 *
 * Purpose: QA fixture for verifying a web crawler's document-discovery feature.
 * Visual style: arXiv abstract page (main content column + right sidebar).
 *
 * Link categories embedded on this page:
 *   1. POSITIVE — Supported extensions: .pdf (3 links), .md (2), .txt (3), .docx (2)
 *   2. CASE VARIATIONS — uppercase .PDF and mixed-case .Pdf
 *   3. QUERY STRINGS & FRAGMENTS — ?version=2&lang=en, #page=3, ?download=true
 *   4. TRICKY PATHS — .pdf in middle of path segment, .pdf only in query param, percent-encoded %2Epdf
 *   5. NEGATIVE CONTROLS — unsupported extensions: .xlsx, .pptx, .zip, .csv, .html
 *   6. CROSS-DOMAIN — 2+ links to a domain different from primary sources
 *   7. INLINE LINKS — 3 document links embedded in flowing paragraph prose
 *   8. SIDEBAR "Access Documents" — 4–6 labelled direct download links
 */

import React from 'react'

const pageStyle: React.CSSProperties = {
  background: 'var(--color-bg, #f7f2f9)',
  minHeight: '100vh',
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  color: 'var(--color-text, #1c1b1f)',
  fontSize: '14px',
  lineHeight: '1.6',
}

const headerBandStyle: React.CSSProperties = {
  background: 'var(--color-primary, #6750a4)',
  color: '#fff',
  padding: '8px 0',
  fontSize: '13px',
  textAlign: 'center',
  letterSpacing: '0.02em',
}

const wrapperStyle: React.CSSProperties = {
  maxWidth: '960px',
  margin: '0 auto',
  padding: '24px 16px 48px',
}

const titleStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 700,
  color: 'var(--color-heading, #1c1b1f)',
  marginBottom: '4px',
  lineHeight: '1.3',
}

const metaStyle: React.CSSProperties = {
  color: 'var(--color-muted, #4a4458)',
  fontSize: '13px',
  marginBottom: '4px',
}

const dividerStyle: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid var(--color-border, #d8cfe5)',
  margin: '12px 0',
}

const bodyRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '28px',
  alignItems: 'flex-start',
  marginTop: '16px',
}

const mainColStyle: React.CSSProperties = {
  flex: '1 1 0',
  minWidth: 0,
}

const sidebarStyle: React.CSSProperties = {
  flex: '0 0 220px',
  width: '220px',
}

const sidebarBoxStyle: React.CSSProperties = {
  background: 'var(--color-card, #fff)',
  border: '1px solid var(--color-border, #d8cfe5)',
  borderRadius: 0,
  padding: '14px 16px',
  boxShadow: 'var(--elev-1, 0 1px 3px rgba(28,27,31,0.08))',
}

const sidebarTitleStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--color-muted, #4a4458)',
  marginBottom: '10px',
}

const sidebarLinkStyle: React.CSSProperties = {
  display: 'block',
  padding: '5px 0',
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--color-primary, #6750a4)',
  borderBottom: '1px solid var(--color-border, #d8cfe5)',
  textDecoration: 'none',
}

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 700,
  color: 'var(--color-heading, #1c1b1f)',
  marginTop: '24px',
  marginBottom: '8px',
  paddingBottom: '3px',
  borderBottom: '2px solid var(--color-primary-container, #eaddff)',
}

const subHeadingStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: 'var(--color-secondary, #625b71)',
  marginTop: '16px',
  marginBottom: '6px',
}

const ulStyle: React.CSSProperties = {
  listStyle: 'disc',
  paddingLeft: '20px',
  margin: '4px 0 8px',
}

const liStyle: React.CSSProperties = {
  marginBottom: '4px',
}

const noteStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--color-muted, #4a4458)',
  fontStyle: 'italic',
  marginLeft: '6px',
}

const inlineLink = (href: string, label: string) => (
  <a href={href} style={{ color: 'var(--color-primary, #6750a4)', fontWeight: 600 }}>
    {label}
  </a>
)

export default function CrawlableDocuments() {
  return (
    <div style={pageStyle}>
      {/* Decorative header band — mirrors arXiv's coloured top bar */}
      <div style={headerBandStyle}>
        Angaadi Research Portal &nbsp;|&nbsp; Document Repository &nbsp;|&nbsp; Open Access
      </div>

      <div style={wrapperStyle}>
        {/* ── Paper-style header ── */}
        <div style={{ marginBottom: '8px' }}>
          <p style={metaStyle}>
            <strong>arXiv:2404.00001</strong> [cs.IR] &nbsp;·&nbsp; Submitted 10 Apr 2024
          </p>
          <h1 style={titleStyle}>
            Comprehensive Survey of Document-Discovery Techniques in Focused Web Crawlers
          </h1>
          <p style={metaStyle}>
            A. Sharma, B. Krishnamurti, C. Osei-Bonsu, D. Lindqvist
          </p>
          <p style={metaStyle}>
            Angaadi Institute of Information Retrieval &nbsp;·&nbsp; Technical Report ARF-2024-04
          </p>
        </div>

        <hr style={dividerStyle} />

        {/* ── Two-column layout: main + sidebar ── */}
        <div style={bodyRowStyle}>
          {/* ── MAIN CONTENT COLUMN ── */}
          <div style={mainColStyle}>

            {/* Abstract with 3 INLINE document links */}
            <h2 style={sectionHeadingStyle}>Abstract</h2>
            <p>
              Modern focused crawlers must reliably discover documents of diverse formats across
              heterogeneous web deployments. This survey examines link-extraction strategies over
              corpora spanning PDFs, plain-text standards documents, and structured markup formats.
              The baseline corpus includes the canonical{' '}
              {inlineLink('https://www.africau.edu/images/default/sample.pdf', 'sample reference PDF')}
              {' '}from Africau University, the Internet Engineering Task Force specification{' '}
              {inlineLink('https://www.rfc-editor.org/rfc/rfc791.txt', 'RFC 791 (Internet Protocol)')}
              {' '}as a plain-text baseline, and the Project Gutenberg edition of{' '}
              {inlineLink('https://www.gutenberg.org/files/1342/1342-0.txt', 'Pride and Prejudice')}
              {' '}as a large prose corpus. Together these three anchors exercise the most common
              MIME types a production crawler will encounter.
            </p>
            <p>
              We further analyse edge cases introduced by case-insensitive file extensions, query
              string parameters that carry version metadata, and URL-encoded extension characters
              that naive parsers misclassify. Reproducibility artifacts are available through the
              access panel on the right.
            </p>

            <hr style={dividerStyle} />

            {/* ── SECTION 1: POSITIVE — Supported Extensions ── */}
            <h2 style={sectionHeadingStyle}>1 · Supported Extensions (Positive Controls)</h2>
            <p>
              Each subsection lists 2–3 independently hosted files of the same format so testers
              can verify consistent scheduling across domains.
            </p>

            <h3 style={subHeadingStyle}>1.1 PDF (.pdf)</h3>
            <ul style={ulStyle}>
              <li style={liStyle}>
                <a href="https://www.africau.edu/images/default/sample.pdf">
                  https://www.africau.edu/images/default/sample.pdf
                </a>
                <span style={noteStyle}>— Africau University sample PDF</span>
              </li>
              <li style={liStyle}>
                <a href="https://arxiv.org/pdf/2301.00774.pdf">
                  https://arxiv.org/pdf/2301.00774.pdf
                </a>
                <span style={noteStyle}>— arXiv preprint (cross-domain from irs.gov)</span>
              </li>
              <li style={liStyle}>
                <a href="https://www.irs.gov/pub/irs-pdf/f1040.pdf">
                  https://www.irs.gov/pub/irs-pdf/f1040.pdf
                </a>
                <span style={noteStyle}>— IRS Form 1040</span>
              </li>
            </ul>

            <h3 style={subHeadingStyle}>1.2 Markdown (.md)</h3>
            <ul style={ulStyle}>
              <li style={liStyle}>
                <a href="https://gitlab.com/gitlab-org/gitlab/-/raw/master/README.md">
                  https://gitlab.com/gitlab-org/gitlab/-/raw/master/README.md
                </a>
                <span style={noteStyle}>— GitLab CE readme (raw)</span>
              </li>
              <li style={liStyle}>
                <a href="https://gitlab.com/inkscape/inkscape/-/raw/master/README.md">
                  https://gitlab.com/inkscape/inkscape/-/raw/master/README.md
                </a>
                <span style={noteStyle}>— Inkscape project readme (raw)</span>
              </li>
            </ul>

            <h3 style={subHeadingStyle}>1.3 Plain Text (.txt)</h3>
            <ul style={ulStyle}>
              <li style={liStyle}>
                <a href="https://www.rfc-editor.org/rfc/rfc791.txt">
                  https://www.rfc-editor.org/rfc/rfc791.txt
                </a>
                <span style={noteStyle}>— RFC 791 (IETF)</span>
              </li>
              <li style={liStyle}>
                <a href="https://www.gutenberg.org/files/1342/1342-0.txt">
                  https://www.gutenberg.org/files/1342/1342-0.txt
                </a>
                <span style={noteStyle}>— Pride and Prejudice (Gutenberg)</span>
              </li>
              <li style={liStyle}>
                <a href="https://www.gutenberg.org/files/84/84-0.txt">
                  https://www.gutenberg.org/files/84/84-0.txt
                </a>
                <span style={noteStyle}>— Frankenstein (Gutenberg)</span>
              </li>
            </ul>

            <h3 style={subHeadingStyle}>1.4 Word Document (.docx)</h3>
            <ul style={ulStyle}>
              <li style={liStyle}>
                <a href="https://file-examples.com/storage/fe8c7eef0c6364f6c9504cc/2017/02/file-sample_100kB.docx">
                  https://file-examples.com/…/file-sample_100kB.docx
                </a>
                <span style={noteStyle}>— 100 kB sample DOCX (file-examples.com)</span>
              </li>
              <li style={liStyle}>
                <a href="https://filesamples.com/samples/document/docx/sample1.docx">
                  https://filesamples.com/samples/document/docx/sample1.docx
                </a>
                <span style={noteStyle}>— Sample DOCX (filesamples.com)</span>
              </li>
            </ul>

            <hr style={dividerStyle} />

            {/* ── SECTION 2: CASE VARIATIONS ── */}
            <h2 style={sectionHeadingStyle}>2 · Case Variations</h2>
            <p>
              Crawlers must normalise or detect extensions independent of capitalisation. The two
              links below use uppercase and mixed-case extensions on otherwise valid document URLs.
            </p>
            <ul style={ulStyle}>
              <li style={liStyle}>
                <a href="https://www.africau.edu/images/default/sample.PDF">
                  https://www.africau.edu/images/default/sample.PDF
                </a>
                <span style={noteStyle}>— uppercase extension (.PDF)</span>
              </li>
              <li style={liStyle}>
                <a href="https://www.africau.edu/images/default/sample.Pdf">
                  https://www.africau.edu/images/default/sample.Pdf
                </a>
                <span style={noteStyle}>— mixed-case extension (.Pdf)</span>
              </li>
            </ul>

            <hr style={dividerStyle} />

            {/* ── SECTION 3: QUERY STRINGS & FRAGMENTS ── */}
            <h2 style={sectionHeadingStyle}>3 · Query Strings and Fragments</h2>
            <p>
              Version metadata appended as query parameters and anchor fragments must not confuse
              the extension extractor. All three links below still point to a valid supported format.
            </p>
            <ul style={ulStyle}>
              <li style={liStyle}>
                <a href="https://www.africau.edu/images/default/sample.pdf?version=2&amp;lang=en">
                  https://www.africau.edu/images/default/sample.pdf?version=2&amp;lang=en
                </a>
                <span style={noteStyle}>— query string appended to .pdf</span>
              </li>
              <li style={liStyle}>
                <a href="https://www.africau.edu/images/default/sample.pdf#page=3">
                  https://www.africau.edu/images/default/sample.pdf#page=3
                </a>
                <span style={noteStyle}>— fragment appended to .pdf</span>
              </li>
              <li style={liStyle}>
                <a href="https://www.rfc-editor.org/rfc/rfc791.txt?download=true">
                  https://www.rfc-editor.org/rfc/rfc791.txt?download=true
                </a>
                <span style={noteStyle}>— query string appended to .txt</span>
              </li>
            </ul>

            <hr style={dividerStyle} />

            {/* ── SECTION 4: TRICKY PATHS (parser edge cases) ── */}
            <h2 style={sectionHeadingStyle}>4 · Tricky Paths — Parser Edge Cases</h2>
            <p>
              These three URLs exercise pathological patterns that naive extension-matching regexes
              misclassify. A robust crawler should handle all three correctly.
            </p>

            <h3 style={subHeadingStyle}>4.1 Extension in a Middle Path Segment</h3>
            <ul style={ulStyle}>
              <li style={liStyle}>
                <a href="https://www.irs.gov/forms.pdf/archive/f1040">
                  https://www.irs.gov/forms.pdf/archive/f1040
                </a>
                <span style={noteStyle}>
                  — ".pdf" appears in a path segment, not at the end; final segment has no extension
                </span>
              </li>
            </ul>

            <h3 style={subHeadingStyle}>4.2 Extension Only in Query Parameter</h3>
            <ul style={ulStyle}>
              <li style={liStyle}>
                <a href="https://www.irs.gov/view?file=report.pdf">
                  https://www.irs.gov/view?file=report.pdf
                </a>
                <span style={noteStyle}>
                  — ".pdf" is the value of a query param, not the URL path extension
                </span>
              </li>
            </ul>

            <h3 style={subHeadingStyle}>4.3 Percent-Encoded Extension</h3>
            <ul style={ulStyle}>
              <li style={liStyle}>
                <a href="https://www.africau.edu/images/default/sample%2Epdf">
                  https://www.africau.edu/images/default/sample%2Epdf
                </a>
                <span style={noteStyle}>
                  — the dot before "pdf" is percent-encoded as %2E; parsers must decode before matching
                </span>
              </li>
            </ul>

            <hr style={dividerStyle} />

            {/* ── SECTION 5: UNSUPPORTED EXTENSIONS (negative controls) ── */}
            <h2 style={sectionHeadingStyle}>5 · Unsupported Extensions — Negative Controls</h2>
            <p>
              When a crawler is configured to collect only the four supported formats above, it must
              skip every link in this section. These links confirm correct exclusion behaviour.
            </p>
            <ul style={ulStyle}>
              <li style={liStyle}>
                <a href="https://file-examples.com/storage/fe8c7eef0c6364f6c9504cc/2017/02/file_example_XLS_10.xlsx">
                  spreadsheet.xlsx
                </a>
                <span style={noteStyle}>— Excel workbook (.xlsx) — should be skipped</span>
              </li>
              <li style={liStyle}>
                <a href="https://file-examples.com/storage/fe8c7eef0c6364f6c9504cc/2017/08/file_example_PPT_250kB.pptx">
                  presentation.pptx
                </a>
                <span style={noteStyle}>— PowerPoint (.pptx) — should be skipped</span>
              </li>
              <li style={liStyle}>
                <a href="https://file-examples.com/storage/fe8c7eef0c6364f6c9504cc/2017/02/zip_2MB.zip">
                  archive.zip
                </a>
                <span style={noteStyle}>— ZIP archive (.zip) — should be skipped</span>
              </li>
              <li style={liStyle}>
                <a href="https://file-examples.com/storage/fe8c7eef0c6364f6c9504cc/2017/02/file_example_CSV_5000.csv">
                  dataset.csv
                </a>
                <span style={noteStyle}>— CSV data file (.csv) — should be skipped</span>
              </li>
              <li style={liStyle}>
                <a href="https://docs.python.org/3/library/index.html">
                  Python library index
                </a>
                <span style={noteStyle}>— HTML page (.html) — should be skipped</span>
              </li>
            </ul>

            <hr style={dividerStyle} />

            {/* ── SECTION 6: CROSS-DOMAIN LINKS ── */}
            <h2 style={sectionHeadingStyle}>6 · Cross-Domain Links</h2>
            <p>
              These two document links originate from domains distinct from the primary sources used
              elsewhere on this page, allowing testers to verify that same-domain vs cross-domain
              crawl rules apply correctly.
            </p>
            <ul style={ulStyle}>
              <li style={liStyle}>
                <a href="https://www.irs.gov/pub/irs-pdf/f1040ez.pdf">
                  https://www.irs.gov/pub/irs-pdf/f1040ez.pdf
                </a>
                <span style={noteStyle}>— cross-domain: irs.gov PDF</span>
              </li>
              <li style={liStyle}>
                <a href="https://www.rfc-editor.org/rfc/rfc2616.txt">
                  https://www.rfc-editor.org/rfc/rfc2616.txt
                </a>
                <span style={noteStyle}>— cross-domain: rfc-editor.org TXT (HTTP/1.1 spec)</span>
              </li>
            </ul>

          </div>{/* end mainColStyle */}

          {/* ── RIGHT SIDEBAR ── */}
          <aside style={sidebarStyle}>
            <div style={sidebarBoxStyle}>
              <div style={sidebarTitleStyle}>Access Documents</div>

              <a
                href="https://www.africau.edu/images/default/sample.pdf"
                style={sidebarLinkStyle}
              >
                ↓ View PDF
              </a>
              <a
                href="https://arxiv.org/pdf/2301.00774.pdf"
                style={sidebarLinkStyle}
              >
                ↓ Full-text PDF
              </a>
              <a
                href="https://file-examples.com/storage/fe8c7eef0c6364f6c9504cc/2017/02/file-sample_100kB.docx"
                style={sidebarLinkStyle}
              >
                ↓ Download DOCX
              </a>
              <a
                href="https://www.rfc-editor.org/rfc/rfc791.txt"
                style={sidebarLinkStyle}
              >
                ↓ Read TXT
              </a>
              <a
                href="https://gitlab.com/gitlab-org/gitlab/-/raw/master/README.md"
                style={sidebarLinkStyle}
              >
                ↓ Read Markdown
              </a>
              <a
                href="https://www.gutenberg.org/files/84/84-0.txt"
                style={{ ...sidebarLinkStyle, borderBottom: 'none' }}
              >
                ↓ Corpus TXT
              </a>
            </div>

            <div style={{ ...sidebarBoxStyle, marginTop: '16px', fontSize: '12px', color: 'var(--color-muted, #4a4458)' }}>
              <strong>Fixture metadata</strong>
              <p style={{ marginTop: '6px', marginBottom: 0 }}>
                Route: <code>/crawlableDocuments</code>
                <br />
                Purpose: crawler QA
                <br />
                Formats: PDF, MD, TXT, DOCX
              </p>
            </div>
          </aside>
        </div>{/* end bodyRowStyle */}
      </div>
    </div>
  )
}
