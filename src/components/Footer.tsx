import { Link } from 'react-router-dom'
import { DEPARTMENTS, productsHref } from '../data/catalog'

/**
 * Site footer — five ruled columns on the darkest neutral.
 *
 * The Developers column is the only route into the unlisted fixture pages
 * from ordinary chrome; everything it links is a real route in App.tsx.
 */
export function Footer() {
  return (
    <footer className="site-footer" id="site-footer" data-testid="site-footer">
      <div className="footer-grid">
        <div>
          <div className="footer-brand">ANGAADI</div>
          <div className="footer-tagline">Your Global Market</div>
          <p className="footer-blurb">
            angaadi.online · Electronics retail, Chennai. Test environment for automation
            practice.
          </p>
        </div>

        <nav className="footer-col" aria-label="Shop">
          <div className="footer-col-title">Shop</div>
          {DEPARTMENTS.slice(0, 4).map((d) => (
            <Link key={d.slug} to={productsHref(d.id, d.slug)}>
              {d.chip ?? d.name}
            </Link>
          ))}
        </nav>

        <nav className="footer-col" aria-label="Account">
          <div className="footer-col-title">Account</div>
          <Link to="/login">Sign in</Link>
          <Link to="/profile">Profile &amp; fit</Link>
          <Link to="/wishlist">Wishlist</Link>
          <Link to="/cart">Cart</Link>
        </nav>

        <nav className="footer-col" aria-label="Developers">
          <div className="footer-col-title">Developers</div>
          <Link to="/health">Health status</Link>
          <Link to="/valid-webhooks">Webhook inspector</Link>
          <Link to="/playground" id="footer-playground" data-testid="footer-playground">
            Playground
          </Link>
        </nav>

        <nav className="footer-col" aria-label="Legal">
          <div className="footer-col-title">Legal</div>
          <Link to="/crawlableDocuments">Terms</Link>
          <Link to="/crawlableDocuments">Privacy</Link>
          <Link to="/cookie-consent">Cookie choices</Link>
          <Link to="/health">Contact</Link>
        </nav>
      </div>
    </footer>
  )
}

export default Footer
