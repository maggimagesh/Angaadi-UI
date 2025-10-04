import { useState, type MouseEvent } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useUIStore } from '../store/ui'
import { signOut } from '../api/user'
import { clearAuthTokenCookie } from '../utils/token'
import ConfirmDialog from './ConfirmDialog'

export function Header() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const logout = useAuthStore(s => s.logout)
  const openSuccessWithDuration = useUIStore(s => s.openSuccessWithDuration)
  const navigate = useNavigate()
  const [signInPromptOpen, setSignInPromptOpen] = useState(false)

  const handleProfileClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isAuthenticated) return
    event.preventDefault()
    setSignInPromptOpen(true)
  }
  return (
    <>
      <header className="surface header-mobile" style={{borderBottom: '1px solid var(--color-border)'}}>
        <nav className="container py-4" aria-label="Top Navigation">
          <div className="header-grid">
            <div className="header-logo">
              <Link to="/" aria-label="Angaadi Home" id="logo" data-testid="logo" style={{display:'flex', alignItems:'center', gap:8, textDecoration:'none'}}>
                <img src="/logo/Angaadi.png" alt="Angaadi" style={{height:40, width:'auto'}} />
                <span className="header-logo-text">Angaadi</span>
              </Link>
            </div>

            <div className="header-search">
              <form role="search" aria-label="Site search" style={{display:'flex', flexDirection:'column', gap:8}}>
                <div style={{display:'flex', gap:6}}>
                  <select aria-label="Category" id="search-category" data-testid="search-category" className="select" style={{flex:'0 0 auto', width:'80px'}}>
                    <option data-testid="option-all" value="all">All</option>
                    <option data-testid="option-phones" value="phones">Mobiles</option>
                    <option data-testid="option-laptops" value="laptops">Laptops</option>
                    <option data-testid="option-audio" value="audio">Audio</option>
                    <option data-testid="option-accessories" value="accessories">Accessories</option>
                  </select>
                  <input id="search-input" data-testid="search-input" className="input" role="searchbox" placeholder="Search products..." aria-label="Search electronics, models, brands" style={{flex:1, minWidth:0}} />
                  <button type="submit" id="search-submit" data-testid="search-submit" className="btn btn-primary" aria-label="Search" style={{padding:'0 12px'}}>
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
                <span id="nav-cart-count" data-testid="nav-cart-count" aria-label="Items in cart">0</span>
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
                  style={{whiteSpace:'nowrap', padding:'6px 12px'}}
                  onClick={async () => {
                    const redirectToLogin = () => navigate('/login', { replace: true })
                    try {
                      const result = await signOut()
                      if (result.success) {
                        // Clear any local JWT storage keys if present
                        try { localStorage.removeItem('jwt'); sessionStorage.removeItem('jwt') } catch {}
                        logout()
                        try { clearAuthTokenCookie() } catch {}
                        openSuccessWithDuration(result.message || 'Signed out successfully', 5000)
                        redirectToLogin()
                      } else {
                        // Even if API call fails, still perform local logout
                        try { localStorage.removeItem('jwt'); sessionStorage.removeItem('jwt') } catch {}
                        logout()
                        try { clearAuthTokenCookie() } catch {}
                        openSuccessWithDuration(result.error?.message || 'Signed out successfully', 5000)
                        redirectToLogin()
                      }
                    } catch (error) {
                      // In case of network error, still perform local logout
                      try { localStorage.removeItem('jwt'); sessionStorage.removeItem('jwt') } catch {}
                      logout()
                      try { clearAuthTokenCookie() } catch {}
                      openSuccessWithDuration('Signed out successfully', 5000)
                      redirectToLogin()
                    }
                  }}
                >
                  <span className="hide-on-mobile">Sign Out</span>
                  <span className="show-on-mobile">Out</span>
                </button>
              ) : (
                <NavLink to="/login" id="nav-signin" data-testid="nav-signin" className="btn btn-primary" style={{whiteSpace:'nowrap', padding:'6px 12px'}}>
                  <span className="hide-on-mobile">Sign In/Sign Up</span>
                  <span className="show-on-mobile">Sign In</span>
                </NavLink>
              )}
            </div>
          </div>
        </nav>
        <div className="surface" style={{borderTop:'1px solid var(--color-border)'}}>
          <div className="container category-chips" role="list" aria-label="Categories">
            <button className="btn" id="category-chip-Mobiles" data-testid="category-chip-Mobiles" role="listitem">Mobiles</button>
            <button className="btn" id="category-chip-Laptops" data-testid="category-chip-Laptops" role="listitem">Laptops</button>
            <button className="btn" id="category-chip-Television" data-testid="category-chip-Television" role="listitem">Television</button>
            <button className="btn" id="category-chip-Appliances" data-testid="category-chip-Appliances" role="listitem">Appliances</button>
            <button className="btn" id="category-chip-Accessories" data-testid="category-chip-Accessories" role="listitem">Accessories</button>
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


