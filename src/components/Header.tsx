import { Link, NavLink } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useUIStore } from '../store/ui'

export function Header() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const logout = useAuthStore(s => s.logout)
  const openSuccessWithDuration = useUIStore(s => s.openSuccessWithDuration)
  return (
    <header className="surface" style={{borderBottom: '1px solid var(--color-border)'}}>
      <nav className="container py-4" aria-label="Top Navigation">
        <div style={{display:'grid', gridTemplateColumns:'240px 1fr auto', gap:12, alignItems:'center'}}>
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <Link to="/" aria-label="Logo" id="logo" data-testid="logo" className="btn btn-ghost" style={{padding:'6px 10px'}}>Angaadi.com</Link>
          </div>

          <div style={{minWidth:0}}>
            <form role="search" aria-label="Site search" style={{display:'flex', gap:6}}>
              <select aria-label="Category" id="search-category" data-testid="search-category" className="select" style={{maxWidth:160}}>
                <option data-testid="option-all" value="all">All</option>
                <option data-testid="option-phones" value="phones">Mobiles</option>
                <option data-testid="option-laptops" value="laptops">Laptops</option>
                <option data-testid="option-audio" value="audio">Audio</option>
                <option data-testid="option-accessories" value="accessories">Accessories</option>
              </select>
              <input id="search-input" data-testid="search-input" className="input" role="searchbox" placeholder="Search electronics, models, brands..." aria-label="Search electronics, models, brands" style={{flex:1, minWidth:0}} />
              <button type="submit" id="search-submit" data-testid="search-submit" className="btn btn-primary" aria-label="Search">Search</button>
            </form>
            <div id="search-suggestions" data-testid="search-suggestions" className="mt-2" role="list" aria-label="Search suggestions" />
          </div>

          <div style={{display:'flex', alignItems:'center', gap:8, justifyContent:'flex-end'}}>
            <NavLink to="/compare" id="nav-compare" data-testid="nav-compare" className="btn btn-ghost" aria-label="Compare">Compare</NavLink>
            <NavLink to="/cart" id="nav-cart" data-testid="nav-cart" className="btn btn-ghost" aria-label="Cart">
              Cart <span id="nav-cart-count" data-testid="nav-cart-count" aria-label="Items in cart">0</span>
            </NavLink>
            <NavLink to="/profile" id="nav-profile" data-testid="nav-profile" className="btn btn-ghost" aria-haspopup="menu" aria-expanded="false">Profile</NavLink>
            {isAuthenticated ? (
              <button
                id="nav-signout"
                data-testid="nav-signout"
                className="btn btn-primary"
                style={{whiteSpace:'nowrap', padding:'6px 16px'}}
                onClick={async () => {
                  try {
                    const API_BASE: string = (import.meta as any).env?.BACKEND_URL || 'http://localhost:3300/api/v1'
                    const res = await fetch(`${API_BASE}/users/signOut`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                    })
                    const data = await res.json().catch(() => ({}))
                    if (res.ok) {
                      // Clear any local JWT storage keys if present
                      try { localStorage.removeItem('jwt'); sessionStorage.removeItem('jwt') } catch {}
                      logout()
                      const message = data?.message || 'Signed out successfully'
                      openSuccessWithDuration(message, 5000)
                    } else {
                      const errMessage = data?.message || 'Sign out failed'
                      openSuccessWithDuration(errMessage, 5000)
                    }
                  } catch (e: any) {
                    openSuccessWithDuration('Network error during sign out', 5000)
                  }
                }}
              >
                Sign Out
              </button>
            ) : (
              <NavLink to="/login" id="nav-signin" data-testid="nav-signin" className="btn btn-primary" style={{whiteSpace:'nowrap', padding:'6px 16px'}}>Sign In/Sign Up</NavLink>
            )}
          </div>
        </div>
      </nav>
      <div className="surface" style={{borderTop:'1px solid var(--color-border)'}}>
        <div className="container py-4" role="list" aria-label="Categories">
          <button className="btn" id="category-chip-Mobiles" data-testid="category-chip-Mobiles" role="listitem">Mobiles</button>
          <button className="btn" id="category-chip-Laptops" data-testid="category-chip-Laptops" role="listitem" style={{marginLeft:8}}>Laptops</button>
          <button className="btn" id="category-chip-Television" data-testid="category-chip-Television" role="listitem" style={{marginLeft:8}}>Television</button>
          <button className="btn" id="category-chip-Appliances" data-testid="category-chip-Appliances" role="listitem" style={{marginLeft:8}}>Appliances</button>
          <button className="btn" id="category-chip-Accessories" data-testid="category-chip-Accessories" role="listitem" style={{marginLeft:8}}>Accessories</button>
        </div>
      </div>
    </header>
  )
}


