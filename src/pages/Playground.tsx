import { Link } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { FIXTURE_ROUTES, GROUP_LABELS, GROUP_ORDER } from '../routes'

/**
 * `/playground` — the unlisted routes, finally listed.
 *
 * Everything on this page is derived from the route table in src/routes.tsx,
 * which is the same table App.tsx renders. Add a fixture there and it appears
 * here without anyone remembering to update this file.
 */

/** A parameterised path needs a real value before it can be opened. */
const SAMPLE_PARAMS: Record<string, string> = {
  ':token': 'demo-token',
  ':designId': 'banner-1',
  ':categoryId': '1',
  ':productId': '1',
}

function openablePath(path: string): string {
  return path
    .split('/')
    .map((segment) => (segment.startsWith(':') ? (SAMPLE_PARAMS[segment] ?? segment.slice(1)) : segment))
    .join('/')
}

export default function PlaygroundPage() {
  const grouped = GROUP_ORDER.map((group) => ({
    group,
    routes: FIXTURE_ROUTES.filter((r) => r.group === group),
  })).filter((g) => g.routes.length > 0)

  return (
    <main className="app-main" id="playground-page" data-testid="playground-page">
      <section className="pg-hero">
        <div className="pg-hero-copy">
          <span className="tag tag-outline">For test authors</span>
          <h1>Every fixture, on one page.</h1>
          <p>
            These routes exist to be automated against, not shopped. Each one isolates a single
            thing that breaks naive selectors — a shadow root, a nested iframe, a list that grows as
            you scroll. The DOM behaviour is unchanged by the revamp; only the chrome is new.
          </p>
        </div>

        <div className="pg-stats">
          <div className="pg-stat">
            <div className="v">{FIXTURE_ROUTES.length}</div>
            <div className="l">fixture routes</div>
          </div>
          <div className="pg-stat">
            <div className="v">{grouped.length}</div>
            <div className="l">categories</div>
          </div>
          <div className="pg-stat">
            <div className="v">0</div>
            <div className="l">behaviour changes</div>
          </div>
          <div className="pg-stat">
            <div className="v">100%</div>
            <div className="l">testids preserved</div>
          </div>
        </div>
      </section>

      {grouped.map(({ group, routes }) => (
        <section className="pg-group" key={group}>
          <div className="pg-group-head">
            <h2>
              {GROUP_LABELS[group]} · {routes.length} route{routes.length === 1 ? '' : 's'}
            </h2>
          </div>
          <div className="pg-scroll">
            <table className="table pg-table">
              <thead>
                <tr>
                  <th>Route</th>
                  <th>What it exercises</th>
                  <th>Watch out for</th>
                  <th>
                    <span className="visually-hidden">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {routes.map((route) => (
                  <tr key={route.path}>
                    <td className="pg-route">{route.path}</td>
                    <td>{route.description}</td>
                    <td>{route.watchOut}</td>
                    <td>
                      <Link className="pg-open" to={openablePath(route.path)}>
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <Footer />
    </main>
  )
}
