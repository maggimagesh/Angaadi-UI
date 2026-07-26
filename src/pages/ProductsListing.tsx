import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { products as mockProducts } from '../data/products'
import { fetchProductsByCategory, type ProductItem } from '../api/products'
import { PaginationOld } from '../components/PaginationOld'
import {
  ProductCard,
  ProductRow,
  ProductCardSkeleton,
  type CardProduct,
} from '../components/ProductCard'
import { Footer } from '../components/Footer'
import { EmptyState, ErrorState } from '../components/States'
import { FilterIcon, GridIcon, ListIcon, CloseIcon } from '../components/icons'
import { storeCategoryInfo } from '../utils/categoryStorage'
import { useStockUpdates, type StockUpdateEvent } from '../hooks/useStockUpdates'
import '../styles/products-listing-old.css'

/* The category maps below are unchanged — the same slugs, ids and defaults the
   app already navigates with. Nothing here introduces a new query param. */

const categoryDisplayNames: Record<string, string> = {
  'mobiles-tablets': 'Mobiles & Tablets',
  'laptops-computers': 'Laptops & Computers',
  'tvs-appliances': 'TVs & Appliances',
  'audio-headphones': 'Audio & Headphones',
  'fashion-lifestyle': 'Fashion & Lifestyle',
  'home-kitchen': 'Home & Kitchen',
  'beauty-personal-care': 'Beauty & Personal Care',
  'books-media': 'Books & Media',
  'sports-fitness': 'Sports & Fitness',
  'grocery-gourmet': 'Grocery & Gourmet',
  smartwatches: 'Smartwatches',
  all: 'All Products',
}

const categoryIdMap: Record<string, number> = {
  'mobiles-tablets': 1,
  'laptops-computers': 2,
  'tvs-appliances': 3,
  'audio-headphones': 4,
  'fashion-lifestyle': 5,
  'home-kitchen': 6,
  'beauty-personal-care': 7,
  'books-media': 8,
  'sports-fitness': 9,
  'grocery-gourmet': 10,
  smartwatches: 11,
  all: 0,
}

const ITEMS_PER_PAGE = 12
const BRANDS_COLLAPSED = 4

type PriceBand = { id: string; label: string; min: number; max: number }

const PRICE_BANDS: PriceBand[] = [
  { id: 'u10', label: 'Under ₹10,000', min: 0, max: 10_000 },
  { id: '10-20', label: '₹10,000 – ₹20,000', min: 10_000, max: 20_000 },
  { id: '20-40', label: '₹20,000 – ₹40,000', min: 20_000, max: 40_000 },
  { id: 'a40', label: 'Above ₹40,000', min: 40_000, max: Number.POSITIVE_INFINITY },
]

type Filters = {
  bands: string[]
  brands: string[]
  minRating: number
  inStockOnly: boolean
  freeDeliveryOnly: boolean
}

const EMPTY_FILTERS: Filters = {
  bands: [],
  brands: [],
  minRating: 0,
  inStockOnly: false,
  freeDeliveryOnly: false,
}

function apiToCard(item: ProductItem): CardProduct {
  const price = parseFloat(item.price) || 0
  const oldPrice = parseFloat(item.oldprice) || 0
  return {
    id: item.id,
    title: item.productname,
    brand: item.brand,
    price,
    oldPrice: oldPrice > price ? oldPrice : undefined,
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

function mockToCard(p: (typeof mockProducts)[number], categoryId: number): CardProduct {
  return {
    id: p.id,
    title: p.title,
    brand: p.brand,
    price: p.price,
    image: p.image,
    rating: p.rating,
    inStock: p.stock === 'In Stock',
    freeDelivery: p.freeDelivery,
    categoryId,
  }
}

/** A product passes when it satisfies every filter except the one being counted. */
function passes(p: CardProduct, f: Filters, skip?: keyof Filters): boolean {
  if (skip !== 'bands' && f.bands.length) {
    const inBand = f.bands.some((id) => {
      const band = PRICE_BANDS.find((b) => b.id === id)
      return band ? p.price >= band.min && p.price < band.max : false
    })
    if (!inBand) return false
  }
  if (skip !== 'brands' && f.brands.length && !f.brands.includes(p.brand ?? '')) return false
  if (skip !== 'minRating' && f.minRating > 0 && (p.rating ?? 0) < f.minRating) return false
  if (skip !== 'inStockOnly' && f.inStockOnly && !p.inStock) return false
  if (skip !== 'freeDeliveryOnly' && f.freeDeliveryOnly && !p.freeDelivery) return false
  return true
}

export default function ProductsListing() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const categoryParam = searchParams.get('category') || 'all'
  const categoryIdParam = searchParams.get('categoryId')

  const [allProducts, setAllProducts] = useState<CardProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [usingFallback, setUsingFallback] = useState(false)

  const [sortBy, setSortBy] = useState<'relevance' | 'price-low' | 'price-high' | 'rating'>('relevance')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [showAllBrands, setShowAllBrands] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  // The header's search box hands its term over in router state so no new
  // query param enters a URL an automated test might assert on.
  const searchQuery = ((location.state as { searchQuery?: string } | null)?.searchQuery ?? '').trim()

  const loadProducts = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    setUsingFallback(false)

    const categoryId = categoryIdParam
      ? parseInt(categoryIdParam, 10)
      : categoryIdMap[categoryParam] !== undefined
        ? categoryIdMap[categoryParam]
        : parseInt(categoryParam, 10) || 1

    storeCategoryInfo(categoryId, categoryParam)

    const fallback = () => {
      setAllProducts(mockProducts.map((p) => mockToCard(p, categoryId)))
      setUsingFallback(true)
    }

    try {
      const response = await fetchProductsByCategory(categoryId, 1, 100)
      if (response.error) {
        setLoadError(response.error.message)
        fallback()
      } else if (response.data) {
        setAllProducts(response.data.products.map(apiToCard))
      }
    } catch {
      setLoadError('The catalogue service did not answer in time.')
      fallback()
    } finally {
      setIsLoading(false)
    }
  }, [categoryParam, categoryIdParam])

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  // Live stock updates over the websocket feed — unchanged behaviour.
  const handleStockUpdate = useCallback((event: StockUpdateEvent) => {
    const updated = event.product
    setAllProducts((prev) =>
      prev.map((p) => {
        if (String(p.id) !== String(updated.id)) return p
        const parsed = Number(updated.stock)
        const newStock = Number.isFinite(parsed) ? parsed : 0
        return { ...p, stockCount: newStock, inStock: newStock > 0 }
      })
    )
  }, [])

  useStockUpdates(handleStockUpdate)

  /* ── filtering ───────────────────────────────────────────────────────── */

  const searched = useMemo(() => {
    if (!searchQuery) return allProducts
    const needle = searchQuery.toLowerCase()
    return allProducts.filter(
      (p) => p.title.toLowerCase().includes(needle) || (p.brand ?? '').toLowerCase().includes(needle)
    )
  }, [allProducts, searchQuery])

  const availableBrands = useMemo(
    () => Array.from(new Set(searched.map((p) => p.brand).filter(Boolean) as string[])).sort(),
    [searched]
  )

  /** Facet counts: each option counts against every other active filter. */
  const counts = useMemo(() => {
    const band: Record<string, number> = {}
    PRICE_BANDS.forEach((b) => {
      band[b.id] = searched.filter(
        (p) => passes(p, filters, 'bands') && p.price >= b.min && p.price < b.max
      ).length
    })

    const brand: Record<string, number> = {}
    availableBrands.forEach((b) => {
      brand[b] = searched.filter((p) => passes(p, filters, 'brands') && p.brand === b).length
    })

    const rating: Record<number, number> = {}
    ;[4, 3].forEach((r) => {
      rating[r] = searched.filter((p) => passes(p, filters, 'minRating') && (p.rating ?? 0) >= r).length
    })

    return {
      band,
      brand,
      rating,
      inStock: searched.filter((p) => passes(p, filters, 'inStockOnly') && p.inStock).length,
      freeDelivery: searched.filter((p) => passes(p, filters, 'freeDeliveryOnly') && p.freeDelivery).length,
    }
  }, [searched, filters, availableBrands])

  const results = useMemo(() => {
    const filtered = searched.filter((p) => passes(p, filters))
    return [...filtered].sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price
      if (sortBy === 'price-high') return b.price - a.price
      if (sortBy === 'rating') return (b.rating ?? 0) - (a.rating ?? 0)
      return 0
    })
  }, [searched, filters, sortBy])

  useEffect(() => {
    setCurrentPage(1)
  }, [results.length, sortBy])

  const totalPages = Math.max(1, Math.ceil(results.length / ITEMS_PER_PAGE))
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const pageItems = results.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const categoryName = categoryDisplayNames[categoryParam] || 'All Products'

  /* ── active-filter chips ─────────────────────────────────────────────── */

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; clear: () => void }[] = []
    filters.bands.forEach((id) => {
      const band = PRICE_BANDS.find((b) => b.id === id)
      if (!band) return
      chips.push({
        key: `band-${id}`,
        label: band.label,
        clear: () => setFilters((f) => ({ ...f, bands: f.bands.filter((x) => x !== id) })),
      })
    })
    filters.brands.forEach((brand) => {
      chips.push({
        key: `brand-${brand}`,
        label: brand,
        clear: () => setFilters((f) => ({ ...f, brands: f.brands.filter((x) => x !== brand) })),
      })
    })
    if (filters.minRating > 0) {
      chips.push({
        key: 'rating',
        label: `${filters.minRating}★ & above`,
        clear: () => setFilters((f) => ({ ...f, minRating: 0 })),
      })
    }
    if (filters.inStockOnly) {
      chips.push({
        key: 'stock',
        label: 'In stock',
        clear: () => setFilters((f) => ({ ...f, inStockOnly: false })),
      })
    }
    if (filters.freeDeliveryOnly) {
      chips.push({
        key: 'delivery',
        label: 'Free delivery',
        clear: () => setFilters((f) => ({ ...f, freeDeliveryOnly: false })),
      })
    }
    return chips
  }, [filters])

  const clearAll = () => {
    setFilters(EMPTY_FILTERS)
    setShowAllBrands(false)
  }

  const toggleBand = (id: string) =>
    setFilters((f) => ({
      ...f,
      bands: f.bands.includes(id) ? f.bands.filter((x) => x !== id) : [...f.bands, id],
    }))

  const toggleBrand = (brand: string) =>
    setFilters((f) => ({
      ...f,
      brands: f.brands.includes(brand) ? f.brands.filter((x) => x !== brand) : [...f.brands, brand],
    }))

  /** The filter groups, shared verbatim by the rail and the drawer. */
  const filterGroups = (
    <>
      <div className="filter-group-label">Price</div>
      <div className="filter-options">
        {PRICE_BANDS.map((band) => {
          const on = filters.bands.includes(band.id)
          return (
            <label key={band.id} className={`filter-option${on ? ' is-on' : ''}`}>
              <input type="checkbox" checked={on} onChange={() => toggleBand(band.id)} />
              {band.label} <span className="count">({counts.band[band.id] ?? 0})</span>
            </label>
          )
        })}
      </div>

      <div className="filter-group-label">Brand</div>
      <div className="filter-options">
        {availableBrands.length === 0 ? (
          <span className="count">No brands in this department yet.</span>
        ) : null}
        {(showAllBrands ? availableBrands : availableBrands.slice(0, BRANDS_COLLAPSED)).map((brand) => {
          const on = filters.brands.includes(brand)
          return (
            <label key={brand} className={`filter-option${on ? ' is-on' : ''}`}>
              <input type="checkbox" checked={on} onChange={() => toggleBrand(brand)} />
              {brand} <span className="count">({counts.brand[brand] ?? 0})</span>
            </label>
          )
        })}
        {availableBrands.length > BRANDS_COLLAPSED ? (
          <button type="button" className="filter-more" onClick={() => setShowAllBrands((v) => !v)}>
            {showAllBrands ? 'Show fewer' : `+ ${availableBrands.length - BRANDS_COLLAPSED} more`}
          </button>
        ) : null}
      </div>

      <div className="filter-group-label">Rating</div>
      <div className="filter-options">
        {[4, 3].map((r) => {
          const on = filters.minRating === r
          return (
            <label key={r} className={`filter-option${on ? ' is-on' : ''}`}>
              <input
                type="checkbox"
                checked={on}
                onChange={() => setFilters((f) => ({ ...f, minRating: on ? 0 : r }))}
              />
              {r}★ &amp; above <span className="count">({counts.rating[r] ?? 0})</span>
            </label>
          )
        })}
      </div>

      <div className="filter-group-label">Availability</div>
      <div className="filter-options">
        <label className={`filter-option${filters.inStockOnly ? ' is-on' : ''}`}>
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={(e) => setFilters((f) => ({ ...f, inStockOnly: e.target.checked }))}
          />
          In stock only <span className="count">({counts.inStock})</span>
        </label>
        <label className={`filter-option${filters.freeDeliveryOnly ? ' is-on' : ''}`}>
          <input
            type="checkbox"
            checked={filters.freeDeliveryOnly}
            onChange={(e) => setFilters((f) => ({ ...f, freeDeliveryOnly: e.target.checked }))}
          />
          Free delivery <span className="count">({counts.freeDelivery})</span>
        </label>
      </div>
    </>
  )

  const sortControl = (
    <select
      aria-label="Sort by"
      className="sort-select"
      value={sortBy}
      onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
    >
      <option value="relevance">Sort: Relevance</option>
      <option value="price-low">Sort: Price low → high</option>
      <option value="price-high">Sort: Price high → low</option>
      <option value="rating">Sort: Rating</option>
    </select>
  )

  const bandSummary = filters.bands
    .map((id) => PRICE_BANDS.find((b) => b.id === id)?.label)
    .filter(Boolean)
    .join(', ')

  return (
    <main className="app-main">
      <nav aria-label="Breadcrumb">
        <ol className="breadcrumb">
          <li>
            <button type="button" onClick={() => navigate('/')}>
              Home
            </button>
          </li>
          <li>/</li>
          <li aria-current="page">{categoryName}</li>
          {searchQuery ? (
            <>
              <li>/</li>
              <li>“{searchQuery}”</li>
            </>
          ) : null}
        </ol>
      </nav>

      {/* Below 1200px the rail collapses into this bar. */}
      <div className="filter-bar">
        <button type="button" className="btn btn-secondary" onClick={() => setDrawerOpen(true)}>
          <FilterIcon size={15} />
          Filters
          {activeChips.length > 0 ? <span className="count-badge">{activeChips.length}</span> : null}
        </button>
        {activeChips.map((chip) => (
          <span className="tag tag-accent" key={chip.key}>
            {chip.label}
            <button
              type="button"
              className="chip-remove"
              aria-label={`Remove filter ${chip.label}`}
              onClick={chip.clear}
            >
              ✕
            </button>
          </span>
        ))}
        {activeChips.length > 0 ? (
          <button type="button" className="rail-clear" onClick={clearAll}>
            Clear all
          </button>
        ) : null}
        <span className="filter-bar-count">
          {results.length} result{results.length === 1 ? '' : 's'}
        </span>
        {sortControl}
      </div>

      <div className="listing-layout">
        <aside className="filter-rail" aria-label="Filters">
          <div className="rail-head">
            <span>Filters</span>
            <button type="button" className="rail-clear" onClick={clearAll}>
              Clear
            </button>
          </div>
          {filterGroups}
        </aside>

        <div>
          <div className="results-head">
            <div>
              <h1>{searchQuery ? `“${searchQuery}”` : categoryName}</h1>
              <div className="results-count">
                <strong>
                  {results.length} result{results.length === 1 ? '' : 's'}
                </strong>
                {' · '}
                {categoryName}
                {bandSummary ? ` · ${bandSummary}` : ''}
                {filters.inStockOnly ? ' · in stock' : ''}
              </div>
            </div>

            <div className="results-tools">
              {activeChips.slice(0, 3).map((chip) => (
                <span className="tag tag-accent hide-on-mobile" key={chip.key}>
                  {chip.label}
                  <button
                    type="button"
                    className="chip-remove"
                    aria-label={`Remove filter ${chip.label}`}
                    onClick={chip.clear}
                  >
                    ✕
                  </button>
                </span>
              ))}
              {sortControl}
              <div className="view-toggle" role="group" aria-label="View mode">
                <button
                  type="button"
                  className={viewMode === 'grid' ? 'is-active' : ''}
                  aria-label="Grid view"
                  aria-pressed={viewMode === 'grid'}
                  onClick={() => setViewMode('grid')}
                >
                  <GridIcon size={15} />
                </button>
                <button
                  type="button"
                  className={viewMode === 'list' ? 'is-active' : ''}
                  aria-label="List view"
                  aria-pressed={viewMode === 'list'}
                  onClick={() => setViewMode('list')}
                >
                  <ListIcon size={15} />
                </button>
              </div>
            </div>
          </div>

          {usingFallback && loadError ? (
            <div style={{ padding: '20px 40px 0' }}>
              <ErrorState
                operation="/products/by-category"
                title="We couldn't load this category."
                body="The catalogue service didn't answer in time, so these are sample products. Your cart is safe."
                actions={[
                  { label: 'Retry', variant: 'primary', onClick: () => void loadProducts() },
                  { label: 'Check system health', href: '/health' },
                ]}
              />
            </div>
          ) : null}

          {isLoading ? (
            <div className="pgrid" role="status" aria-label="Loading products">
              {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                <ProductCardSkeleton key={i} index={i} />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: '28px 40px 40px' }}>
              {allProducts.length === 0 ? (
                <EmptyState
                  title="Nothing is listed in this department yet."
                  body="The catalogue has no active products here. Another department will have stock."
                  actions={[
                    { label: 'Browse all products', variant: 'primary', href: '/products?category=all' },
                    { label: 'Back to home', href: '/' },
                  ]}
                />
              ) : (
                <EmptyState
                  title={`No matches${bandSummary ? ` ${bandSummary.toLowerCase()}` : ''} with these filters.`}
                  body={`Your filters are fighting each other. Drop one and we'll show ${searched.length} result${searched.length === 1 ? '' : 's'}.`}
                  actions={[
                    ...(filters.bands.length
                      ? [
                          {
                            label: 'Remove price cap',
                            variant: 'primary' as const,
                            onClick: () => setFilters((f) => ({ ...f, bands: [] })),
                          },
                        ]
                      : []),
                    { label: 'Clear all filters', onClick: clearAll },
                  ]}
                />
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="pgrid">
              {pageItems.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="prow-list">
              {pageItems.map((product) => (
                <ProductRow key={product.id} product={product} />
              ))}
            </div>
          )}

          {!isLoading && results.length > 0 ? (
            <PaginationOld
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => {
                setCurrentPage(page)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              meta={
                <>
                  Showing {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, results.length)} of{' '}
                  {results.length} · {ITEMS_PER_PAGE} per page
                </>
              }
            />
          ) : null}
        </div>
      </div>

      {drawerOpen ? (
        <>
          <div
            className="filter-drawer-backdrop"
            role="presentation"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="filter-drawer" role="dialog" aria-modal="true" aria-label="Filters">
            <div className="drawer-head">
              <h2>Filters</h2>
              <button
                type="button"
                className="dialog-close"
                aria-label="Close filters"
                onClick={() => setDrawerOpen(false)}
              >
                <CloseIcon size={16} />
              </button>
            </div>
            {filterGroups}
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button type="button" className="btn btn-primary" onClick={() => setDrawerOpen(false)}>
                Show {results.length} result{results.length === 1 ? '' : 's'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={clearAll}>
                Clear all
              </button>
            </div>
          </div>
        </>
      ) : null}

      <Footer />
    </main>
  )
}
