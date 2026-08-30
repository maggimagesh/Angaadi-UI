import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchCategories, fetchProductsByCategory } from '../api/products'
import type { Category, ProductItem } from '../api/products'
import { ProductCard, ProductGridSkeleton, type CardProduct } from '../components/ProductCard'
import { Footer } from '../components/Footer'
import { EmptyState, ErrorState } from '../components/States'
import { ChevronLeft, ChevronRight, Stars } from '../components/icons'
import { storeCategoryInfo } from '../utils/categoryStorage'
import { formatINR } from '../utils/currency'
import {
  DEPARTMENTS,
  artUrl,
  placeholderFor,
  productsHref,
} from '../data/catalog'
import '../styles/home.css'

/** Categories the price-drop rail is drawn from. */
const DEAL_CATEGORY_IDS = [1, 2, 3, 4]
/** Categories the recommendation strip is drawn from. */
const PICK_CATEGORY_IDS = [11, 6, 4, 1, 2, 3]

type HomeDepartment = {
  id: number
  name: string
  slug: string
  art: string
  count: number
}

function toCardProduct(item: ProductItem): CardProduct {
  const price = parseFloat(item.price) || 0
  const oldPrice = parseFloat(item.oldprice) || undefined
  return {
    id: item.id,
    title: item.productname,
    brand: item.brand,
    price,
    oldPrice: oldPrice && oldPrice > price ? oldPrice : undefined,
    discountPercent: item.discountpercent,
    image: item.imageurl,
    rating: parseFloat(item.starrating) || undefined,
    ratingsCount: item.ratingscount,
    stockCount: item.stock,
    inStock: item.stock > 0,
    freeDelivery: item.freedelivery,
    categoryId: item.categoryid,
    description: item.description,
    badge: item.badge,
  }
}

/** Deals refresh at 06:00 IST; the countdown says how long is left today. */
function useCountdown() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])

  return useMemo(() => {
    const next = new Date(now)
    next.setHours(6, 0, 0, 0)
    if (next.getTime() <= now) next.setDate(next.getDate() + 1)
    const remaining = Math.max(0, next.getTime() - now)
    const pad = (n: number) => String(n).padStart(2, '0')
    return {
      h: pad(Math.floor(remaining / 3_600_000)),
      m: pad(Math.floor((remaining % 3_600_000) / 60_000)),
      s: pad(Math.floor((remaining % 60_000) / 1000)),
    }
  }, [now])
}

export default function HomePage() {
  const navigate = useNavigate()
  const countdown = useCountdown()

  const [departments, setDepartments] = useState<HomeDepartment[]>([])
  const [departmentsLoading, setDepartmentsLoading] = useState(true)
  const [departmentsError, setDepartmentsError] = useState<string | null>(null)

  const [deals, setDeals] = useState<CardProduct[]>([])
  const [dealsLoading, setDealsLoading] = useState(true)
  const [dealsError, setDealsError] = useState<string | null>(null)
  const [dealPage, setDealPage] = useState(0)

  const [picks, setPicks] = useState<CardProduct[]>([])
  const [picksLoading, setPicksLoading] = useState(true)

  const [alertEmail, setAlertEmail] = useState('')
  const [alertSet, setAlertSet] = useState(false)

  const hasLoaded = useRef(false)

  const loadDeals = async () => {
    setDealsLoading(true)
    setDealsError(null)
    try {
      const results = await Promise.all(
        DEAL_CATEGORY_IDS.map((id) =>
          fetchProductsByCategory(id, 1, 4).catch(() => ({ data: undefined }))
        )
      )
      const collected: ProductItem[] = []
      results.forEach((res) => {
        if (res.data?.products) collected.push(...res.data.products)
      })
      if (collected.length === 0) {
        setDealsError('The catalogue service returned no price drops.')
      }
      // Deepest discount first — the section is called "price drops".
      collected.sort((a, b) => (b.discountpercent || 0) - (a.discountpercent || 0))
      setDeals(collected.map(toCardProduct))
    } catch {
      setDealsError('The catalogue service did not answer in time.')
      setDeals([])
    } finally {
      setDealsLoading(false)
    }
  }

  const loadPicks = async () => {
    setPicksLoading(true)
    try {
      const results = await Promise.all(
        PICK_CATEGORY_IDS.map((id) =>
          fetchProductsByCategory(id, 1, 1).catch(() => ({ data: undefined }))
        )
      )
      const collected: ProductItem[] = []
      results.forEach((res) => {
        if (res.data?.products?.length) collected.push(res.data.products[0])
      })
      setPicks(collected.slice(0, 6).map(toCardProduct))
    } catch {
      setPicks([])
    } finally {
      setPicksLoading(false)
    }
  }

  const loadDepartments = async () => {
    setDepartmentsLoading(true)
    setDepartmentsError(null)
    try {
      const response = await fetchCategories()
      if (response.error || !response.data) {
        setDepartmentsError(response.error?.message || 'Failed to load departments')
        setDepartments(
          DEPARTMENTS.map((d) => ({ id: d.id, name: d.name, slug: d.slug, art: artUrl(d.art), count: 0 }))
        )
        return
      }
      const mapped = response.data
        .filter((c: Category) => c.isactive)
        .sort((a, b) => a.displayorder - b.displayorder)
        .slice(0, 6)
        .map((c: Category) => ({
          id: c.id,
          name: c.description || c.productname,
          slug: c.slug || String(c.id),
          art: c.imageurl || placeholderFor({ categoryId: c.id, slug: c.slug, name: c.productname }),
          count: c.productcount || 0,
        }))
      setDepartments(mapped)
    } catch {
      setDepartmentsError('Failed to load departments')
      setDepartments(
        DEPARTMENTS.map((d) => ({ id: d.id, name: d.name, slug: d.slug, art: artUrl(d.art), count: 0 }))
      )
    } finally {
      setDepartmentsLoading(false)
    }
  }

  useEffect(() => {
    if (hasLoaded.current) return
    hasLoaded.current = true
    void loadDepartments()
    void loadDeals()
    void loadPicks()
  }, [])

  const dealWindow = deals.slice(dealPage * 4, dealPage * 4 + 4)
  const dealPages = Math.max(1, Math.ceil(deals.length / 4))
  const featured = deals[0]

  const openDepartment = (id: number, slug: string) => {
    storeCategoryInfo(id, slug)
    navigate(productsHref(id, slug))
  }

  return (
    <main className="app-main" id="home-page" data-testid="home-page">
      {/* ── the hero band ──────────────────────────────────────────────── */}
      <section
        className="home-hero"
        role="region"
        aria-label="Featured promotions"
        id="hero-banner"
        data-testid="hero-banner"
      >
        <div className="hero-inner">
          <div className="hero-copy">
            <div className="hero-label">
              <span className="tag tag-outline">Monsoon Electronics Week</span>
              <span style={{ fontSize: 12, color: '#ccd2d8' }}>Ends 06:00 daily</span>
            </div>

            <h1 className="hero-title">Specs, not spin.</h1>

            <p className="hero-lede">
              Every listing shows the real landed price, the stock count and the delivery date
              before you click. No countdown theatre.
            </p>

            <div className="hero-actions">
              <Link className="btn btn-primary" to={productsHref(1, 'mobiles-tablets')}>
                Shop the week
              </Link>
              <Link className="btn btn-secondary" to="/compare">
                Compare top phones
              </Link>
            </div>

            <div className="hero-stats">
              <div className="hero-stat">
                <div className="hero-stat-value">4.2L</div>
                <div className="hero-stat-label">products listed</div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-value">48h</div>
                <div className="hero-stat-label">median delivery</div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-value">7 days</div>
                <div className="hero-stat-label">no-question returns</div>
              </div>
            </div>
          </div>

          <div className="grayscale hero-figure">
            <img
              src={featured ? (featured.image || placeholderFor({ name: featured.title })) : artUrl('smartphone')}
              alt={featured ? featured.title : 'Featured product'}
            />
          </div>
        </div>
      </section>

      {/* ── the card row that overlaps the hero ────────────────────────── */}
      <section aria-labelledby="home-categories-title" data-testid="home-categories">
        <h2 id="home-categories-title" className="visually-hidden">
          Shop by department
        </h2>

        {departmentsError ? (
          <div className="dept-grid" style={{ gridTemplateColumns: '1fr', marginTop: 20 }}>
            <ErrorState
              operation="/products"
              title="We couldn't load the departments."
              body="Showing the standing list instead. Your cart is safe."
              actions={[{ label: 'Retry', variant: 'primary', onClick: () => void loadDepartments() }]}
            />
          </div>
        ) : (
          <div className="dept-grid">
            {departmentsLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div className="dept-cell sk-cell" key={i} style={{ animationDelay: `${i * 0.2}s` }} aria-hidden="true">
                    <div className="sk" style={{ height: 170 }} />
                    <div>
                      <div className="sk" style={{ height: 17, width: '80%' }} />
                      <div className="sk" style={{ height: 13, width: '45%', marginTop: 6 }} />
                    </div>
                  </div>
                ))
              : departments.slice(0, 4).map((d) => (
                  <button
                    type="button"
                    className="dept-cell"
                    key={`${d.slug}-${d.id}`}
                    onClick={() => openDepartment(d.id, d.slug)}
                    aria-label={`Shop ${d.name}`}
                  >
                    <span className="dept-name">{d.name}</span>
                    <span className="grayscale dept-icon">
                      <img src={d.art} alt="" loading="lazy" />
                    </span>
                    <span className="dept-count">
                      {d.count > 0 ? `Shop all ${d.count.toLocaleString('en-IN')} items` : 'Shop now'}
                    </span>
                  </button>
                ))}
          </div>
        )}
      </section>

      {/* ── today's price drops ────────────────────────────────────────── */}
      <section className="shelf" aria-labelledby="home-deals-title" data-testid="deals-of-day">
        <div className="section-head">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
            <h2 id="home-deals-title">Today&rsquo;s price drops</h2>
            <span className="countdown">
              Ends in
              <span className="unit">{countdown.h}</span>
              <span className="unit">{countdown.m}</span>
              <span className="unit">{countdown.s}</span>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary btn-icon"
              aria-label="Previous price drops"
              disabled={dealPage === 0}
              onClick={() => setDealPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-icon"
              aria-label="Next price drops"
              disabled={dealPage >= dealPages - 1}
              onClick={() => setDealPage((p) => Math.min(dealPages - 1, p + 1))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {dealsLoading ? (
          <ProductGridSkeleton count={4} />
        ) : dealsError ? (
          <div style={{ padding: '0 20px 20px' }}>
            <ErrorState
              operation="/products/by-category"
              title="We couldn't load today's price drops."
              body="The catalogue service didn't answer in time. Your cart is safe."
              actions={[
                { label: 'Retry', variant: 'primary', onClick: () => void loadDeals() },
                { label: 'Check system health', href: '/health' },
              ]}
            />
          </div>
        ) : (
          <div className="pgrid">
            {dealWindow.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* ── two editorial cards ────────────────────────────────────────── */}
      <section
        aria-labelledby="home-spotlight-title"
        data-testid="seasonal-spotlights"
        className="spotlight-grid"
      >
        <div className="spotlight">
          <h2 id="home-spotlight-title">Work-from-anywhere kit</h2>
          <p>
            Six pieces our buyers actually use — a 14&quot; ultrabook, a 65 W charger, and the dock
            that survives daily travel.
          </p>
          <span className="grayscale spotlight-figure">
            <img src={artUrl('laptop')} alt="" loading="lazy" />
          </span>
          <Link className="btn btn-secondary" to={productsHref(2, 'laptops-computers')}>
            See the kit — laptops from {formatINR(36990)}
          </Link>
        </div>

        <div className="spotlight">
          <h2>Upgrade your living room</h2>
          <p>
            QLED panels, soundbars and the wall mounts that fit them. Installation is booked at
            checkout, not chased later.
          </p>
          <span className="grayscale spotlight-figure">
            <img src={artUrl('tv')} alt="" loading="lazy" />
          </span>
          <Link className="btn btn-secondary" to={productsHref(3, 'tvs-appliances')}>
            Browse televisions — from {formatINR(12499)}
          </Link>
        </div>
      </section>

      {/* ── recommendations ────────────────────────────────────────────── */}
      <section className="shelf" aria-labelledby="home-recommendations-title" data-testid="recommended-products">
        <div className="section-head">
          <h2 id="home-recommendations-title">Picked from your last visit</h2>
          <Link className="section-link" to="/profile">
            Manage recommendations →
          </Link>
        </div>

        {!picksLoading && picks.length === 0 ? (
          <div style={{ padding: '0 20px 20px' }}>
            <EmptyState
              title="No recommendations yet."
              body="We build these from what you have looked at. Open a few products and they will show up here."
              actions={[
                { label: 'Browse all products', variant: 'primary', href: '/products?category=all' },
              ]}
            />
          </div>
        ) : (
        <div className={picksLoading ? 'pgrid' : 'compact-grid'}>
          {picksLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div className="pskel sk-cell" key={i} style={{ animationDelay: `${i * 0.2}s` }} aria-hidden="true">
                  <div className="sk sk-well" style={{ marginTop: 0, height: 140 }} />
                  <div className="sk sk-title" />
                  <div className="sk sk-price" />
                </div>
              ))
            : picks.map((p) => (
                <Link
                  className="compact-cell"
                  key={p.id}
                  to={`/product/${p.categoryId ?? 1}/${p.id}`}
                >
                  <span className="grayscale compact-well">
                    <img
                      src={p.image || placeholderFor({ categoryId: p.categoryId, name: p.title })}
                      alt=""
                      loading="lazy"
                    />
                  </span>
                  <h3>{p.title}</h3>
                  <span className="compact-price">{formatINR(p.price)}</span>
                  <span className="compact-meta">
                    {p.rating ? <Stars rating={p.rating} size={12} /> : 'Not yet rated'}
                    {p.ratingsCount ? ` ${p.ratingsCount.toLocaleString('en-IN')}` : ''}
                  </span>
                </Link>
              ))}
        </div>
        )}
      </section>

      {/* ── the trust row ──────────────────────────────────────────────── */}
      <section
        aria-labelledby="home-trust-title"
        data-testid="trust-highlights"
        className="trust-grid"
      >
        <div className="trust-cell">
          <h2 id="home-trust-title">Landed price, always</h2>
          <p>GST, delivery and installation show on the card — not at step four of checkout.</p>
        </div>
        <div className="trust-cell">
          <h2>Real stock counts</h2>
          <p>Live from the warehouse feed, updated every 30 seconds.</p>
        </div>
        <div className="trust-cell">
          <h2>7-day returns</h2>
          <p>Pickup from your door, refund inside 48 hours of collection.</p>
        </div>
        <div className="trust-cell">
          <h2>Brand warranty</h2>
          <p>Every unit sold with the manufacturer&rsquo;s India warranty, invoice attached.</p>
        </div>
      </section>

      {/* ── the price-alert panel ──────────────────────────────────────── */}
      <section aria-labelledby="home-cta-title" data-testid="home-footer-cta" className="poster">
        <div className="poster-grid">
          <div>
            <h2 id="home-cta-title">Price alerts beat panic buying.</h2>
          </div>
          <div>
            <p>
              Tell us the product and the price you want. We watch the feed and mail you once — no
              daily digest.
            </p>
            <form
              className="poster-capture"
              onSubmit={(e) => {
                e.preventDefault()
                if (alertEmail.trim()) setAlertSet(true)
              }}
            >
              <input
                type="email"
                required
                placeholder="you@example.com"
                aria-label="Email for price alerts"
                id="price-alert-email"
                data-testid="price-alert-email"
                value={alertEmail}
                onChange={(e) => {
                  setAlertEmail(e.target.value)
                  setAlertSet(false)
                }}
              />
              <button type="submit" id="price-alert-submit" data-testid="price-alert-submit">
                Set alert
              </button>
            </form>
            {alertSet ? (
              <p className="poster-note" role="status">
                We&rsquo;ll mail {alertEmail} when a watched price moves.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
