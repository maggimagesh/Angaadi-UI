import { useState, useEffect, type MouseEvent } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useCartStore } from '../store/cart'
import { useUIStore } from '../store/ui'
import { signOut } from '../api/user'
import { clearAuthTokenCookie } from '../utils/token'
import ConfirmDialog from './ConfirmDialog'

import { storeCategoryInfo } from '../utils/categoryStorage'

const HEADER_CATEGORIES = [
  { id: 1, name: 'Mobiles', slug: 'mobiles-tablets', testId: 'category-chip-Mobiles' },
  { id: 2, name: 'Laptops', slug: 'laptops-computers', testId: 'category-chip-Laptops' },
  { id: 3, name: 'Television', slug: 'tvs-appliances', testId: 'category-chip-Television' },
  { id: 6, name: 'Appliances', slug: 'home-kitchen', testId: 'category-chip-Appliances' },
  { id: 4, name: 'Accessories', slug: 'audio-headphones', testId: 'category-chip-Accessories' },
]

export function Header() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const logout = useAuthStore(s => s.logout)
  const openSuccessWithDuration = useUIStore(s => s.openSuccessWithDuration)
  const navigate = useNavigate()
  const [signInPromptOpen, setSignInPromptOpen] = useState(false)
  const cartCount = useCartStore(s => s.totalItems())
  const fetchServerCart = useCartStore(s => s.fetchServerCart)

  useEffect(() => { void fetchServerCart() }, [fetchServerCart])

  const handleProfileClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isAuthenticated) return
    event.preventDefault()
    setSignInPromptOpen(true)
  }
  return (
    <>
      <header className="surface header-mobile" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <nav className="container py-4" aria-label="Top Navigation">
          <div className="header-grid">
            <div className="header-logo">
              <Link to="/" aria-label="Angaadi Home" id="logo" data-testid="logo" style={{ display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                <img src="/logo/Angaadi.png" alt="Angaadi" style={{ height: 40, width: 'auto' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span className="header-logo-text">Angaadi</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', fontWeight: '400' }}>Your Global Market</span>
                </div>
              </Link>
            </div>

            <div className="header-search">
              <form role="search" aria-label="Site search" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: '8px' }}>
                  <select aria-label="Category" id="search-category" data-testid="search-category" className="select" style={{ flex: '0 0 auto', width: '80px', height: '40px' }}>
                    <option data-testid="option-all" value="all">All</option>
                    <option data-testid="option-phones" value="phones">Mobiles</option>
                    <option data-testid="option-laptops" value="laptops">Laptops</option>
                    <option data-testid="option-audio" value="audio">Audio</option>
                    <option data-testid="option-accessories" value="accessories">Accessories</option>
                  </select>
                  <input id="search-input" data-testid="search-input" className="input" role="searchbox" placeholder="Search products..." aria-label="Search electronics, models, brands" style={{ flex: 1, minWidth: 0, height: '40px' }} />
                  <button type="submit" id="search-submit" data-testid="search-submit" className="btn btn-primary" aria-label="Search" style={{ padding: '0 12px', height: '40px' }}>
                    <span className="hide-on-mobile">Search</span>
                    <span className="show-on-mobile">🔍</span>
                  </button>
                </div>
                <div id="search-suggestions" data-testid="search-suggestions" role="list" aria-label="Search suggestions" />
              </form>
            </div>

            <div className="header-actions">
              <NavLink to="/compare" id="nav-compare" data-testid="nav-compare" className="btn btn-ghost hide-on-mobile" aria-label="Compare">Compare</NavLink>
              <NavLink to="/cart" id="nav-cart" data-testid="nav-cart" className="btn btn-ghost" aria-label="Cart">
                <span className="hide-on-mobile">Cart</span>
                <span className="show-on-mobile">🛒</span>
                <span id="nav-cart-count" data-testid="nav-cart-count" aria-label="Items in cart">{cartCount}</span>
              </NavLink>
              <NavLink
                to="/profile"
                id="nav-profile"
                data-testid="nav-profile"
                className="btn btn-ghost"
                aria-haspopup="menu"
                aria-expanded="false"
                onClick={handleProfileClick}
              >
                <span className="hide-on-mobile">Profile</span>
                <span className="show-on-mobile">👤</span>
              </NavLink>
              {isAuthenticated ? (
                <button
                  id="nav-signout"
                  data-testid="nav-signout"
                  className="btn btn-primary"
                  style={{ whiteSpace: 'nowrap', padding: '6px 12px' }}
                  onClick={async () => {
                    const redirectToLogin = () => navigate('/login', { replace: true })
                    try {
                      const result = await signOut()
                      if (result.success) {
                        // Clear any local JWT storage keys if present
                        try { localStorage.removeItem('jwt'); sessionStorage.removeItem('jwt') } catch { }
                        logout()
                        try { clearAuthTokenCookie() } catch { }
                        openSuccessWithDuration(result.message || 'Signed out successfully', 5000)
                        redirectToLogin()
                      } else {
                        // Even if API call fails, still perform local logout
                        try { localStorage.removeItem('jwt'); sessionStorage.removeItem('jwt') } catch { }
                        logout()
                        try { clearAuthTokenCookie() } catch { }
                        openSuccessWithDuration(result.error?.message || 'Signed out successfully', 5000)
                        redirectToLogin()
                      }
                    } catch (error) {
                      // In case of network error, still perform local logout
                      try { localStorage.removeItem('jwt'); sessionStorage.removeItem('jwt') } catch { }
                      logout()
                      try { clearAuthTokenCookie() } catch { }
                      openSuccessWithDuration('Signed out successfully', 5000)
                      redirectToLogin()
                    }
                  }}
                >
                  <span className="hide-on-mobile">Sign Out</span>
                  <span className="show-on-mobile">Out</span>
                </button>
              ) : (
                <NavLink to="/login" id="nav-signin" data-testid="nav-signin" className="btn btn-primary" style={{ whiteSpace: 'nowrap', padding: '6px 12px' }}>
                  <span className="hide-on-mobile">Sign In/Sign Up</span>
                  <span className="show-on-mobile">Sign In</span>
                </NavLink>
              )}
            </div>
          </div>
        </nav>
        <div className="surface" style={{ borderTop: '1px solid var(--color-border)' }}>
          <div className="container category-chips" role="list" aria-label="Categories">
            {HEADER_CATEGORIES.map((category) => (
              <button
                key={category.id}
                className="btn"
                id={category.testId}
                data-testid={category.testId}
                role="listitem"
                onClick={() => {
                  storeCategoryInfo(category.id, category.slug)
                  navigate(`/products?categoryId=${category.id}&category=${category.slug}`)
                }}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </header>
      <ConfirmDialog
        open={signInPromptOpen}
        title="Sign In required"
        description="Please Sign In to access your profile."
        confirmLabel="Sign In"
        cancelLabel="Cancel"
        onConfirm={() => {
          setSignInPromptOpen(false)
          navigate('/login')
        }}
        onCancel={() => setSignInPromptOpen(false)}
        testIdPrefix="sign-in-required"
      />
    </>
  )
}


