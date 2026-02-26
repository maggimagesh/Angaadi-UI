import '../styles/infinite-scroll.css'

export default function IframePage() {
  return (
    <main className="app-main iframe-page">
      <div className="iframe-page-header">
        <h1>Iframe — Infinite Scroll</h1>
        <p>The product listing below is rendered inside an <code>&lt;iframe&gt;</code></p>
      </div>

      <div className="iframe-wrapper">
        <iframe
          src="/infinite-scroll"
          title="Infinite Scroll Products (iframe)"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </main>
  )
}
