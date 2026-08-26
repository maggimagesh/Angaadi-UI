import type { MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DEPARTMENTS, productsHref } from '../data/catalog'
import { useAuthStore } from '../store/auth'
import { useUIStore } from '../store/ui'
import { authRedirectState, loginPathWithRedirect, rememberAuthRedirect } from '../utils/authRedirect'

/**
 * Site footer — four navy bands, in Amazon's order:
 *
 *   1 · the "Back to top" bar
 *   2 · the link farm
 *   3 · the brand row with the locale control
 *   4 · the fine print
 *
 * The Developers column is the only route into the unlisted fixture pages
 * from ordinary chrome; everything it links is a real route in App.tsx.
 */
export function Footer() {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const openSuccessWithDuration = useUIStore((s) => s.openSuccessWithDuration)

  const handleProfileFitClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isAuthenticated) {
      openSuccessWithDuration('Opening Profile & fit.', 1800)
      return
    }

    event.preventDefault()
    rememberAuthRedirect('/profile')
    openSuccessWithDuration('Please sign in to continue to Profile & fit.', 3500)
    navigate(loginPathWithRedirect('/profile'), {
      state: authRedirectState('/profile'),
    })
  }

  const backToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
  }

  return (
    <footer className="site-footer" id="site-footer" data-testid="site-footer">
      <button
        type="button"
        className="footer-top"
        id="footer-back-to-top"
        data-testid="footer-back-to-top"
        onClick={backToTop}
      >
        Back to top
      </button>

      <div className="footer-links">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">angaadi</div>
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
            <div className="footer-col-title">Your account</div>
            <Link to="/login">Sign in</Link>
            <Link to="/profile" onClick={handleProfileFitClick}>Profile &amp; fit</Link>
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
            <div className="footer-col-title">Let us help you</div>
            <Link to="/crawlableDocuments">Terms</Link>
            <Link to="/crawlableDocuments">Privacy</Link>
            <Link to="/cookie-consent">Cookie choices</Link>
            <Link to="/health">Contact</Link>
          </nav>
        </div>
      </div>

      <div className="footer-base">
        <span className="footer-brand">angaadi</span>
        <Link to="/crawlableDocuments" className="footer-locale">
          English
        </Link>
        <Link to="/crawlableDocuments" className="footer-locale">
          ₹ INR — India
        </Link>
      </div>

      <div className="footer-legal">
        <div className="footer-fine">
          <Link to="/crawlableDocuments">Conditions of Use &amp; Sale</Link>
          <Link to="/crawlableDocuments">Privacy Notice</Link>
          <Link to="/crawlableDocuments">Interest-Based Ads</Link>
          <Link to="/health">System status</Link>
        </div>
        <div className="footer-copy">
          © 2018–{new Date().getFullYear()} Angaadi.online, or its affiliates
        </div>
      </div>
    </footer>
  )
}

export default Footer
