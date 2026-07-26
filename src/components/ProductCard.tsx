import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatINR } from '../utils/currency'
import { useCartStore } from '../store/cart'
import { useUIStore } from '../store/ui'
import { useWishlistStore } from '../store/wishlist'
import { useCompareStore } from '../store/compare'
import { placeholderFor } from '../data/catalog'
import { HeartIcon, CompareIcon, CloseIcon } from './icons'

/**
 * The one product cell, used on the home grids, the listing, the details page
 * and anywhere else a product appears.
 *
 * Treatment A from the design system: no fill, no shadow, no radius. The grid
 * that holds these cells draws the 1px rules; the cell itself only carries an
 * inset accent ring on hover.
 */

export type CardProduct = {
  id: string | number
  title: string
  brand?: string
  price: number
  oldPrice?: number
  discountPercent?: number
  image?: string
  rating?: number
  ratingsCount?: number
  /** Numeric stock count when the API gives one. */
  stockCount?: number
  inStock: boolean
  freeDelivery?: boolean
  categoryId?: number | string
  categorySlug?: string
  description?: string
  /** Four short spec strings, shown in the list-row variant. */
  specs?: string[]
  badge?: string
}

/**
 * The cart API keys on a numeric product id. Real catalogue ids are numeric;
 * the mock fixtures use string ids, so those are hashed into a high range that
 * cannot collide with a real one. This is the same derivation the listing and
 * home pages already used.
 */
export function numericProductId(id: string | number, offset = 800000): number {
  if (typeof id === 'number') return id
  if (/^\d+$/.test(id)) return parseInt(id, 10)
  return Math.abs(id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) + offset
}

function imageFor(p: CardProduct): string {
  if (p.image && p.image.trim() !== '') return p.image
  return placeholderFor({ categoryId: p.categoryId, slug: p.categorySlug, name: p.title })
}

function detailHref(p: CardProduct): string {
  const cat = p.categoryId ?? 1
  return `/product/${cat}/${p.id}`
}

/** "Only 4 left · free delivery Tue" — specific, never "Hurry!". */
function stockLine(p: CardProduct): { text: string; low: boolean } {
  if (!p.inStock) return { text: 'Out of stock · tell me when it returns', low: false }
  const delivery = p.freeDelivery ? ' · free delivery' : ''
  if (typeof p.stockCount === 'number' && p.stockCount > 0 && p.stockCount <= 10) {
    return { text: `Only ${p.stockCount} left${delivery}`, low: true }
  }
  return { text: `In stock${delivery}`, low: false }
}

function discountOf(p: CardProduct): number {
  if (typeof p.discountPercent === 'number' && p.discountPercent > 0) return p.discountPercent
  if (p.oldPrice && p.oldPrice > p.price) {
    return Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100)
  }
  return 0
}

/** Shared behaviour for the wishlist / compare / add-to-cart controls. */
function useProductActions(p: CardProduct) {
  const addByProductId = useCartStore((s) => s.addByProductId)
  const openSuccess = useUIStore((s) => s.openSuccess)
  const wishHas = useWishlistStore((s) => s.has)
  const wishToggle = useWishlistStore((s) => s.toggle)
  const wishItems = useWishlistStore((s) => s.items)
  const compareHas = useCompareStore((s) => s.has)
  const compareToggle = useCompareStore((s) => s.toggle)
  const compareItems = useCompareStore((s) => s.items)

  const pid = numericProductId(p.id)
  // Subscribing to the arrays keeps these booleans reactive; `has` alone is a
  // stable function reference and would not re-render on change.
  void wishItems
  void compareItems

  const addToCart = () => {
    void addByProductId(pid, 1, {
      name: p.title,
      brand: p.brand,
      image: imageFor(p),
      price: p.price,
      oldPrice: p.oldPrice,
      discountPercent: p.discountPercent,
    })
    openSuccess('Added to cart')
  }

  const toggleWishlist = () => {
    wishToggle({
      id: pid,
      name: p.title,
      brand: p.brand,
      image: imageFor(p),
      price: p.price,
      oldPrice: p.oldPrice,
      inStock: p.inStock,
      categoryId: typeof p.categoryId === 'string' ? parseInt(p.categoryId, 10) : p.categoryId,
    })
  }

  const toggleCompare = () => {
    const ok = compareToggle({
      id: pid,
      name: p.title,
      brand: p.brand,
      image: imageFor(p),
      price: p.price,
      rating: p.rating,
      ratingsCount: p.ratingsCount,
      categoryId: typeof p.categoryId === 'string' ? parseInt(p.categoryId, 10) : p.categoryId,
      specs: (p.specs ?? []).reduce<Record<string, string>>((acc, s, i) => {
        acc[`Spec ${i + 1}`] = s
        return acc
      }, {}),
    })
    if (!ok) openSuccess('Compare holds four products. Remove one first.')
  }

  return {
    pid,
    addToCart,
    toggleWishlist,
    toggleCompare,
    wishlisted: wishHas(pid),
    comparing: compareHas(pid),
  }
}

/* ── quick view ─────────────────────────────────────────────────────────── */

function QuickView({ product, onClose }: { product: CardProduct; onClose: () => void }) {
  const { addToCart } = useProductActions(product)
  const stock = stockLine(product)
  const discount = discountOf(product)

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onClick={onClose}
      id={`quickview-backdrop-${product.id}`}
      data-testid={`quickview-backdrop-${product.id}`}
    >
      <div
        className="dialog elev-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`quickview-title-${product.id}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-head">
          <h2 className="dialog-title" id={`quickview-title-${product.id}`}>
            {product.title}
          </h2>
          <button
            type="button"
            className="dialog-close"
            aria-label="Close quick view"
            onClick={onClose}
            data-testid={`quickview-close-${product.id}`}
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="dialog-body">
          <div className="grayscale pcard-well" style={{ marginTop: 0 }}>
            <img src={imageFor(product)} alt="" />
          </div>
          {product.brand ? <div className="pcard-brand">{product.brand}</div> : null}
          {product.description ? (
            <p style={{ marginTop: 10, fontSize: 13, color: 'var(--color-neutral-800)' }}>
              {product.description}
            </p>
          ) : null}
          <div className="pcard-price">
            <span className="now">{formatINR(product.price)}</span>
            {product.oldPrice && product.oldPrice > product.price ? (
              <span className="was strike">{formatINR(product.oldPrice)}</span>
            ) : null}
            {discount > 0 ? <span className="tag tag-accent">{discount}% off</span> : null}
          </div>
          <div className={`pcard-stock${stock.low ? ' is-low' : ''}`}>{stock.text}</div>
        </div>

        <div className="dialog-actions">
          <Link className="btn btn-secondary" to={detailHref(product)} onClick={onClose}>
            Full details
          </Link>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!product.inStock}
            onClick={() => {
              addToCart()
              onClose()
            }}
          >
            Add to cart
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── the ruled cell ─────────────────────────────────────────────────────── */

export function ProductCard({ product }: { product: CardProduct }) {
  const [quickOpen, setQuickOpen] = useState(false)
  const { addToCart, toggleWishlist, toggleCompare, wishlisted, comparing } =
    useProductActions(product)

  const id = product.id
  const discount = discountOf(product)
  const stock = stockLine(product)
  const titleId = `product-card-${id}-title`

  return (
    <article
      className={`pcard${product.inStock ? '' : ' is-out'}`}
      id={`product-card-${id}`}
      data-testid={`product-card-${id}`}
      role="article"
      aria-labelledby={titleId}
    >
      <div className="pcard-top">
        {!product.inStock ? (
          <span className="tag tag-outline">Out of stock</span>
        ) : discount > 0 ? (
          <span className="tag tag-accent">{discount}% off</span>
        ) : product.badge ? (
          <span className="tag tag-neutral">{product.badge}</span>
        ) : (
          <span />
        )}
        <button
          type="button"
          className={`icon-btn${wishlisted ? ' is-on' : ''}`}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Save for later'}
          aria-pressed={wishlisted}
          onClick={toggleWishlist}
          data-testid={`wishlist-toggle-${id}`}
        >
          <HeartIcon size={18} filled={wishlisted} />
        </button>
      </div>

      <div className="grayscale pcard-well">
        <img
          src={imageFor(product)}
          alt={product.title}
          id={`prod-image-${id}`}
          data-testid={`prod-image-${id}`}
          loading="lazy"
          onError={(e) => {
            const img = e.currentTarget
            const fallback = placeholderFor({
              categoryId: product.categoryId,
              slug: product.categorySlug,
              name: product.title,
            })
            if (img.src !== fallback) {
              img.onerror = null
              img.src = fallback
            }
          }}
        />
        <div className="pcard-hover">
          <button
            type="button"
            className="btn btn-secondary"
            id={`result-quickview-${id}`}
            data-testid={`result-quickview-${id}`}
            aria-label="Quick view"
            onClick={() => setQuickOpen(true)}
          >
            Quick view
          </button>
          <button
            type="button"
            className={`btn btn-secondary${wishlisted ? ' is-on' : ''}`}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            onClick={toggleWishlist}
          >
            <HeartIcon size={15} filled={wishlisted} />
          </button>
          <label
            className="btn btn-secondary"
            aria-label="Compare this product"
            title="Compare this product"
          >
            <input
              type="checkbox"
              id={`compare-checkbox-${id}`}
              data-testid={`compare-checkbox-${id}`}
              aria-label="Compare this product"
              checked={comparing}
              onChange={toggleCompare}
              className="visually-hidden"
            />
            <CompareIcon size={15} />
          </label>
        </div>
      </div>

      {product.brand ? <div className="pcard-brand">{product.brand}</div> : null}

      <h3 id={titleId} className="pcard-title">
        <Link to={detailHref(product)}>{product.title}</Link>
      </h3>

      {product.rating ? (
        <div className="pcard-rating">
          <span className="rating-chip">{product.rating.toFixed(1)} ★</span>
          {product.ratingsCount ? (
            <span className="count">{product.ratingsCount.toLocaleString('en-IN')} ratings</span>
          ) : null}
        </div>
      ) : null}

      <div className="pcard-price">
        <span className="now" id={`result-price-${id}`} data-testid={`result-price-${id}`}>
          {formatINR(product.price)}
        </span>
        {product.inStock && product.oldPrice && product.oldPrice > product.price ? (
          <span className="was strike">{formatINR(product.oldPrice)}</span>
        ) : null}
      </div>

      <div className={`pcard-stock${stock.low ? ' is-low' : ''}`}>{stock.text}</div>

      <div className="pcard-actions">
        {product.inStock ? (
          <button
            type="button"
            className="btn btn-primary"
            id={`result-addtocart-${id}`}
            data-testid={`result-addtocart-${id}`}
            aria-label="Add to cart"
            onClick={addToCart}
          >
            Add to cart
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-secondary"
            id={`result-addtocart-${id}`}
            data-testid={`result-addtocart-${id}`}
            aria-label="Notify me when back in stock"
            onClick={toggleWishlist}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            Notify me
          </button>
        )}
        {product.inStock ? (
          <button
            type="button"
            className={`btn btn-secondary${comparing ? ' is-on' : ''}`}
            aria-label="Add to compare"
            aria-pressed={comparing}
            onClick={toggleCompare}
          >
            {comparing ? 'Comparing' : 'Compare'}
          </button>
        ) : null}
      </div>

      {quickOpen ? <QuickView product={product} onClose={() => setQuickOpen(false)} /> : null}
    </article>
  )
}

/* ── the spec-dense list row ────────────────────────────────────────────── */

export function ProductRow({ product }: { product: CardProduct }) {
  const navigate = useNavigate()
  const { addToCart, toggleCompare, comparing } = useProductActions(product)
  const id = product.id
  const stock = stockLine(product)
  const savings = product.oldPrice && product.oldPrice > product.price ? product.oldPrice - product.price : 0

  return (
    <article
      className="prow"
      id={`product-card-${id}`}
      data-testid={`product-card-${id}`}
      role="article"
      aria-labelledby={`product-card-${id}-title`}
    >
      <div className="grayscale prow-well">
        <img
          src={imageFor(product)}
          alt={product.title}
          id={`prod-image-${id}`}
          data-testid={`prod-image-${id}`}
          loading="lazy"
        />
      </div>

      <div>
        {product.brand ? <div className="pcard-brand" style={{ marginTop: 0 }}>{product.brand}</div> : null}
        <h4 id={`product-card-${id}-title`}>
          <Link to={detailHref(product)}>{product.title}</Link>
        </h4>
        {product.specs?.length ? (
          <div className="prow-specs">
            {product.specs.slice(0, 4).map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
        ) : product.description ? (
          <div className="prow-specs">
            <span>{product.description}</span>
          </div>
        ) : null}
        <div className={`prow-delivery${stock.low ? ' is-low' : ''}`}>{stock.text}</div>
      </div>

      <div className="prow-buy">
        <div className="price" id={`result-price-${id}`} data-testid={`result-price-${id}`}>
          {formatINR(product.price)}
        </div>
        {savings > 0 ? (
          <div className="save">
            <span className="strike">{formatINR(product.oldPrice!)}</span> · save {formatINR(savings)}
          </div>
        ) : null}
        {product.inStock ? (
          <button
            type="button"
            className="btn btn-primary"
            id={`result-addtocart-${id}`}
            data-testid={`result-addtocart-${id}`}
            aria-label="Add to cart"
            onClick={addToCart}
          >
            Add to cart
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-secondary"
            id={`result-addtocart-${id}`}
            data-testid={`result-addtocart-${id}`}
            aria-label="Notify me when back in stock"
          >
            Notify me
          </button>
        )}
        <button
          type="button"
          className="btn btn-secondary"
          id={`result-quickview-${id}`}
          data-testid={`result-quickview-${id}`}
          aria-label="Quick view"
          onClick={() => navigate(detailHref(product))}
        >
          Quick view
        </button>
        <label className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
          <input
            type="checkbox"
            id={`compare-checkbox-${id}`}
            data-testid={`compare-checkbox-${id}`}
            aria-label="Compare this product"
            checked={comparing}
            onChange={toggleCompare}
            className="visually-hidden"
          />
          {comparing ? 'Comparing' : 'Compare'}
        </label>
      </div>
    </article>
  )
}

/* ── the skeleton ───────────────────────────────────────────────────────── */

/**
 * Same cell geometry as `.pcard`, so nothing shifts when the data lands.
 * Cells stagger 200ms apart.
 */
export function ProductCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div
      className="pskel sk-cell"
      style={{ animationDelay: `${(index % 4) * 0.2}s` }}
      aria-hidden="true"
    >
      <div className="sk sk-tag" />
      <div className="sk sk-well" />
      <div className="sk sk-brand" />
      <div className="sk sk-title" />
      <div className="sk sk-price" />
      <div className="sk sk-cta" />
    </div>
  )
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="pgrid" role="status" aria-label="Loading products">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} index={i} />
      ))}
    </div>
  )
}

export default ProductCard
