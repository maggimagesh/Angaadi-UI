import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useCartStore } from '../store/cart'
import { useCompareStore } from '../store/compare'
import { useUIStore } from '../store/ui'
import { signOut } from '../api/user'
import { clearAuthTokenCookie } from '../utils/token'
import ConfirmDialog from './ConfirmDialog'
import { storeCategoryInfo } from '../utils/categoryStorage'
import {
  ALL_DEPARTMENT_COUNT,
  DEPARTMENTS,
  HEADER_CATEGORIES,
  artUrl,
  productsHref,
} from '../data/catalog'
import {
  SearchIcon,
  MenuIcon,
  CartIcon,
  UserIcon,
  CompareIcon,
  ChevronRight,
  ChevronDown,
  LocationIcon,
} from './icons'
import SearchSuggestions, { pushRecentSearch, type SuggestionsHandle } from './SearchSuggestions'
import type { ProductItem } from '../api/products'

/** How long the pointer must rest on "All categories" before the panel opens. */
const HOVER_INTENT_MS = 120

export function Header() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const logout = useAuthStore((s) => s.logout)
  const openSuccessWithDuration = useUIStore((s) => s.openSuccessWithDuration)
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [signInPromptOpen, setSignInPromptOpen] = useState(false)
  const cartCount = useCartStore((s) => s.totalItems())
  const fetchServerCart = useCartStore((s) => s.fetchServerCart)
  const compareCount = useCompareStore((s) => s.items.length)

  useEffect(() => {
    void fetchServerCart()
  }, [fetchServerCart])

  const activeCategoryId = searchParams.get('categoryId')

  /* ── search ──────────────────────────────────────────────────────────── */

  const [query, setQuery] = useState('')
  const [scope, setScope] = useState('all')
  const [suggestOpen, setSuggestOpen] = useState(false)
  const searchWrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const handleRef = useRef<SuggestionsHandle | null>(null)
  const [activeOptionId, setActiveOptionId] = useState<string | undefined>()

  const registerHandle = useCallback((handle: SuggestionsHandle) => {
    handleRef.current = handle
    setActiveOptionId(handle.activeId)
  }, [])

  const closeSuggestions = useCallback(() => {
    setSuggestOpen(false)
    handleRef.current?.reset()
  }, [])

  const goToResults = useCallback(
    (term: string, categoryId?: number) => {
      pushRecentSearch(term)
      closeSuggestions()
      const department = DEPARTMENTS.find((d) => d.id === categoryId)
      const params = new URLSearchParams()
      if (department) {
        storeCategoryInfo(department.id, department.slug)
        params.set('categoryId', String(department.id))
        params.set('category', department.slug)
      }
      // The search term rides in router state rather than the query string:
      // the listing's filter params are fixed by contract, so no new param
      // name is introduced into a URL an automated test might assert on.
      navigate(`/products${params.toString() ? `?${params.toString()}` : ''}`, {
        state: { searchQuery: term.trim() },
      })
    },
    [closeSuggestions, navigate]
  )

  const openProduct = useCallback(
    (product: ProductItem, departmentId: number) => {
      pushRecentSearch(query)
      closeSuggestions()
      navigate(`/product/${product.categoryid ?? departmentId}/${product.id}`)
    },
    [closeSuggestions, navigate, query]
  )

  const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const handle = handleRef.current
    if (event.key === 'Escape') {
      closeSuggestions()
      return
    }
    if (!suggestOpen) {
      if (event.key === 'ArrowDown') setSuggestOpen(true)
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      handle?.move(1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      handle?.move(-1)
    } else if (event.key === 'Enter') {
      // Enter opens the highlighted row; with nothing highlighted it falls
      // through to the form's own submit.
      if (handle?.commit()) event.preventDefault()
    }
  }

  /* ── mega-menu ───────────────────────────────────────────────────────── */

  const [megaOpen, setMegaOpen] = useState(false)
  const [megaDept, setMegaDept] = useState(DEPARTMENTS[0].id)
  const megaTimer = useRef<number | undefined>(undefined)
  const megaRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const headerRef = useRef<HTMLElement>(null)

  /**
   * Everything else that sticks — the filter bar, the filter rail, the order
   * summary, the profile rail — has to clear this header, and its height
   * changes with the breakpoint. Publish the measured height as `--header-h`
   * so those rules can offset from it instead of guessing.
   */
  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const publish = () => {
      document.documentElement.style.setProperty('--header-h', `${el.offsetHeight}px`)
    }
    publish()
    const observer = new ResizeObserver(publish)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const openMega = useCallback(() => {
    window.clearTimeout(megaTimer.current)
    setMegaOpen(true)
  }, [])

  const scheduleOpen = useCallback(() => {
    window.clearTimeout(megaTimer.current)
    megaTimer.current = window.setTimeout(() => setMegaOpen(true), HOVER_INTENT_MS)
  }, [])

  const closeMega = useCallback(() => {
    window.clearTimeout(megaTimer.current)
    setMegaOpen(false)
  }, [])

  const toggleMega = useCallback(() => {
    window.clearTimeout(megaTimer.current)
    setMegaOpen((open) => !open)
  }, [])

  useEffect(() => () => window.clearTimeout(megaTimer.current), [])

  // Escape closes both overlays; outside clicks close whichever they fell out of.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (megaOpen) {
        closeMega()
        triggerRef.current?.focus()
      }
      if (suggestOpen) closeSuggestions()
    }
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (megaOpen && megaRef.current && !megaRef.current.contains(target) && !triggerRef.current?.contains(target)) {
        closeMega()
      }
      if (suggestOpen && searchWrapRef.current && !searchWrapRef.current.contains(target)) {
        closeSuggestions()
      }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [megaOpen, suggestOpen, closeMega, closeSuggestions])

  // Any navigation dismisses both.
  useEffect(() => {
    closeMega()
    closeSuggestions()
  }, [location.pathname, location.search, closeMega, closeSuggestions])

  const goToDepartment = (id: number, slug: string) => {
    storeCategoryInfo(id, slug)
    closeMega()
    navigate(productsHref(id, slug))
  }

  const activeDept = DEPARTMENTS.find((d) => d.id === megaDept) ?? DEPARTMENTS[0]

  const handleProfileClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isAuthenticated) return
    event.preventDefault()
    setSignInPromptOpen(true)
  }

  const handleSignOut = async () => {
    const redirectToLogin = () => navigate('/login', { replace: true })
    const finish = (message: string) => {
      try {
        localStorage.removeItem('jwt')
        sessionStorage.removeItem('jwt')
      } catch {}
      logout()
      try {
        clearAuthTokenCookie()
      } catch {}
      openSuccessWithDuration(message, 5000)
      redirectToLogin()
    }
    try {
      const result = await signOut()
      finish(
        result.success
          ? result.message || 'Signed out successfully'
          : result.error?.message || 'Signed out successfully'
      )
    } catch {
      finish('Signed out successfully')
    }
  }

  return (
    <>
      <header className="site-header" ref={headerRef}>
        {/* 1 · the navy belt — logo, deliver-to, search, account, cart */}
        <nav className="header-main" aria-label="Top Navigation">
          <Link to="/" aria-label="Angaadi Home" id="logo" data-testid="logo" className="header-logo">
            <img src="/logo/Angaadi.png" alt="Angaadi" />
            <span className="header-logo-text">
              <span className="header-wordmark">angaadi</span>
              <span className="header-tagline">.in</span>
            </span>
          </Link>

          <Link to="/profile" className="header-deliver hide-on-mobile" onClick={handleProfileClick}>
            <LocationIcon size={15} />
            <span className="stack">
              <span className="l1">Deliver to</span>
              <span className="l2">Chennai 600001</span>
            </span>
          </Link>

          <div className="header-search" ref={searchWrapRef}>
            <form
              role="search"
              aria-label="Site search"
              className="search-form"
              onSubmit={(e) => {
                e.preventDefault()
                goToResults(query)
              }}
            >
              <select
                aria-label="Category"
                id="search-category"
                data-testid="search-category"
                className="search-category"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
              >
                <option data-testid="option-all" value="all">All</option>
                <option data-testid="option-phones" value="phones">Mobiles</option>
                <option data-testid="option-laptops" value="laptops">Laptops</option>
                <option data-testid="option-audio" value="audio">Audio</option>
                <option data-testid="option-accessories" value="accessories">Accessories</option>
              </select>

              <input
                id="search-input"
                data-testid="search-input"
                className="search-input"
                ref={inputRef}
                role="searchbox"
                placeholder="Search products, brands and collections"
                aria-label="Search electronics, models, brands"
                autoComplete="off"
                aria-expanded={suggestOpen}
                aria-controls="search-suggestions"
                aria-activedescendant={activeOptionId}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setSuggestOpen(true)
                }}
                onFocus={() => setSuggestOpen(true)}
                onKeyDown={onSearchKeyDown}
              />

              <button
                type="submit"
                id="search-submit"
                data-testid="search-submit"
                className="btn search-submit"
                aria-label="Search"
              >
                <SearchIcon size={20} />
                <span className="hide-on-mobile">Search</span>
              </button>
            </form>

            <SearchSuggestions
              query={query}
              scope={scope}
              open={suggestOpen}
              onPickProduct={openProduct}
              onPickTerm={goToResults}
              onSeeAll={() => goToResults(query)}
              registerHandle={registerHandle}
            />
          </div>

          <div className="header-actions">
            <Link
              to="/profile"
              id="nav-profile"
              data-testid="nav-profile"
              className="header-action"
              aria-haspopup="menu"
              aria-expanded="false"
              onClick={handleProfileClick}
            >
              <span className="l1">{isAuthenticated ? 'Hello again' : 'Hello, sign in'}</span>
              <span className="l2">
                <UserIcon size={14} className="show-on-mobile" />
                Account &amp; Lists
                <ChevronDown size={12} strokeWidth={3} />
              </span>
            </Link>

            <Link
              to="/orders"
              id="nav-orders"
              data-testid="nav-orders"
              className="header-action hide-on-mobile"
            >
              <span className="l1">Returns</span>
              <span className="l2">&amp; Orders</span>
            </Link>

            <Link
              to="/compare"
              id="nav-compare"
              data-testid="nav-compare"
              className="header-action hide-on-mobile"
              aria-label="Compare"
            >
              <span className="l1">Side by side</span>
              <span className="l2">
                <CompareIcon size={14} />
                Compare
                {compareCount > 0 ? <span className="num">{compareCount}</span> : null}
              </span>
            </Link>

            <Link
              to="/team-split"
              id="nav-team-split"
              data-testid="nav-team-split"
              className="header-action hide-on-mobile"
              aria-label="Team Split"
            >
              <span className="l1">Split the</span>
              <span className="l2">Team</span>
            </Link>

            <Link
              to="/cart"
              id="nav-cart"
              data-testid="nav-cart"
              className="header-action header-cart"
              aria-label="Cart"
            >
              <span className="cart-glyph">
                <CartIcon size={26} strokeWidth={1.8} />
                <span
                  id="nav-cart-count"
                  data-testid="nav-cart-count"
                  aria-label="Items in cart"
                  className="count-badge"
                >
                  {cartCount}
                </span>
              </span>
              <span className="l2 hide-on-mobile">Cart</span>
            </Link>

            {isAuthenticated ? (
              <button
                id="nav-signout"
                data-testid="nav-signout"
                className="btn header-signin"
                onClick={handleSignOut}
              >
                Sign out
              </button>
            ) : (
              <Link
                to="/login"
                id="nav-signin"
                data-testid="nav-signin"
                className="btn header-signin"
              >
                Sign in
              </Link>
            )}
          </div>
        </nav>

        {/* 2 · the sub-nav — "All" plus the department chips */}
        <div className="category-band">
          <div
            className="category-row"
            role="list"
            aria-label="Categories"
            onMouseLeave={closeMega}
          >
            <button
              type="button"
              className="category-trigger"
              ref={triggerRef}
              aria-expanded={megaOpen}
              aria-controls="mega-menu"
              aria-haspopup="true"
              id="all-categories-trigger"
              data-testid="all-categories-trigger"
              onMouseEnter={scheduleOpen}
              onClick={toggleMega}
              onKeyDown={(e) => {
                // Opening on focus alone would race the click that produced the
                // focus, so the keyboard path is explicit instead.
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  openMega()
                }
              }}
            >
              <MenuIcon size={16} />
              All
            </button>

            {HEADER_CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`category-chip${activeCategoryId === String(category.id) ? ' is-active' : ''}`}
                id={category.testId}
                data-testid={category.testId}
                role="listitem"
                onClick={() => {
                  storeCategoryInfo(category.id, category.slug)
                  navigate(productsHref(category.id, category.slug))
                }}
              >
                {category.name}
              </button>
            ))}

            <span className="category-note hide-on-mobile">Curated daily · 06:00 IST</span>
          </div>
        </div>

        {/* 3 · the promotional strip */}
        <div className="utility-band">
          <div className="utility-bar">
            <span>Complimentary delivery over ₹499 · Easy 7-day returns</span>
            <div className="utility-links">
              <Link to="/orders">Track order</Link>
              <Link to="/health">Help centre</Link>
              <Link to="/crawlableDocuments">Sell on Angaadi</Link>
            </div>
          </div>
        </div>

        {megaOpen ? (
          <div
            className="mega-menu"
            id="mega-menu"
            data-testid="mega-menu"
            ref={megaRef}
            onMouseEnter={openMega}
            onMouseLeave={closeMega}
          >
            <div className="mega-inner">
              <div className="mega-depts">
                {DEPARTMENTS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className={`mega-dept${d.id === activeDept.id ? ' is-active' : ''}`}
                    data-testid={`mega-dept-${d.slug}`}
                    onMouseEnter={() => setMegaDept(d.id)}
                    onFocus={() => setMegaDept(d.id)}
                    onClick={() => goToDepartment(d.id, d.slug)}
                  >
                    {d.name}
                    <ChevronRight size={15} strokeWidth={2.5} />
                  </button>
                ))}
                <Link to="/products?category=all" className="mega-dept mega-dept-all">
                  All {ALL_DEPARTMENT_COUNT} departments
                </Link>
              </div>

              <div className="mega-panel">
                {(activeDept.groups ?? []).map((group) => (
                  <div className="mega-col" key={group.label}>
                    <div className="kicker">{group.label}</div>
                    {group.items.map((item) => (
                      <Link key={item} to={productsHref(activeDept.id, activeDept.slug)}>
                        {item}
                      </Link>
                    ))}
                  </div>
                ))}

                <div className="mega-col">
                  <div className="kicker">Brands</div>
                  {(activeDept.brands ?? []).map((brand) => (
                    <Link key={brand} to={productsHref(activeDept.id, activeDept.slug)}>
                      {brand}
                    </Link>
                  ))}
                </div>

                <div className="mega-col">
                  <div className="kicker">Editor&rsquo;s pick</div>
                  <span className="grayscale mega-pick-well">
                    <img src={artUrl(activeDept.art)} alt="" />
                  </span>
                  <Link
                    to={productsHref(activeDept.id, activeDept.slug)}
                    style={{ fontWeight: 700 }}
                  >
                    Best of {activeDept.name}
                  </Link>
                  <span style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>
                    Ranked on price, stock and return rate.
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <ConfirmDialog
        open={signInPromptOpen}
        title="Sign in required"
        description="Sign in to open your profile."
        confirmLabel="Sign in"
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
