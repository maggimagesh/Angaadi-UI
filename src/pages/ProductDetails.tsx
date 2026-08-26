import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fetchProductById, fetchProductsByCategory, type ProductItem } from '../api/products'
import { mockReviews, mockRatingDistribution } from '../data/mockData'
import { useCartStore } from '../store/cart'
import { useUIStore } from '../store/ui'
import { useWishlistStore } from '../store/wishlist'
import { useCompareStore } from '../store/compare'
import { Footer } from '../components/Footer'
import { ErrorState } from '../components/States'
import { PriceTag } from '../components/PriceTag'
import { deliveryDate } from '../utils/delivery'
import {
  HeartIcon,
  CompareIcon,
  Stars,
  TruckIcon,
  ReturnIcon,
  ShieldIcon,
  LockIcon,
} from '../components/icons'
import { formatINR } from '../utils/currency'
import { placeholderFor } from '../data/catalog'
import { storeCategoryInfo, getCategoryInfo } from '../utils/categoryStorage'
import '../styles/product-details.css'

interface ProductDetail {
  id: number
  categoryid: number
  productname: string
  description: string
  imageurl: string
  badge: string
  price: string
  oldprice: string
  ratingscount: number
  starrating: string
  brand: string
  stock: number
  slug: string
  discountpercent: number
  freedelivery: boolean
  isactive: boolean
  created_at: string
  updated_at: string
  productdetails: string
  keyfeatures: { 'Key Features': string[] }
  categories: {
    id: number
    categoryname: string
    description: string
    slug: string
    badge: string
    imageurl: string
  }
  specifications: Array<{
    id: string
    productid: number
    screensize: string
    ram: string
    battery: string
    operating_system: string
    waterresistance: string
    storage: string
    camera: string
    processor: string
    displaytype: string
    connectivity: string
  }>
}

const STORAGE_OPTIONS = [
  { value: '256GB', premium: 0 },
  { value: '512GB', premium: 20000 },
  { value: '1TB', premium: 40000 },
]

const COLOUR_OPTIONS = ['Natural Titanium', 'Blue Titanium', 'White Titanium', 'Black Titanium']

export default function ProductDetails() {
  const { categoryId, productId } = useParams<{ categoryId: string; productId: string }>()
  const navigate = useNavigate()

  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imageIndex, setImageIndex] = useState(0)
  const [storage, setStorage] = useState('256GB')
  const [colour, setColour] = useState(COLOUR_OPTIONS[0])
  const [quantity, setQuantity] = useState(1)
  const [related, setRelated] = useState<ProductItem[]>([])

  const addByProductId = useCartStore((s) => s.addByProductId)
  const openSuccess = useUIStore((s) => s.openSuccess)
  const wishItems = useWishlistStore((s) => s.items)
  const wishToggle = useWishlistStore((s) => s.toggle)
  const compareItems = useCompareStore((s) => s.items)
  const compareToggle = useCompareStore((s) => s.toggle)

  const loadProduct = useCallback(async () => {
    if (!categoryId || !productId) {
      setError('Invalid product parameters')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await fetchProductById(categoryId, productId)
      if (response.error) {
        setError(response.error.message)
      } else if (response.data) {
        const data = response.data as ProductDetail
        setProduct(data)
        storeCategoryInfo(data.categoryid || parseInt(categoryId, 10), data.categories?.slug)
      }
    } catch {
      setError('The catalogue service did not answer in time.')
    } finally {
      setLoading(false)
    }
  }, [categoryId, productId])

  useEffect(() => {
    void loadProduct()
  }, [loadProduct])

  // "Compared with these" reads the same by-category call the listing uses.
  useEffect(() => {
    if (!product) return
    let stale = false
    void fetchProductsByCategory(product.categoryid, 1, 8)
      .then((res) => {
        if (stale) return
        setRelated((res.data?.products ?? []).filter((p) => p.id !== product.id).slice(0, 4))
      })
      .catch(() => undefined)
    return () => {
      stale = true
    }
  }, [product])

  const images = useMemo(() => {
    if (!product) return []
    const primary =
      product.imageurl && product.imageurl.trim() !== ''
        ? product.imageurl
        : placeholderFor({ categoryId: product.categoryid, name: product.productname })
    // The API exposes one image per product; the strip still renders so the
    // gallery geometry is stable when more arrive.
    return [primary]
  }, [product])

  const specRows = useMemo(() => {
    if (!product?.specifications?.length) return []
    const s = product.specifications[0]
    const rows: { label: string; value: string }[] = []
    if (s.displaytype || s.screensize) {
      rows.push({ label: 'Display', value: [s.screensize, s.displaytype].filter(Boolean).join(' · ') })
    }
    if (s.processor) rows.push({ label: 'Processor', value: s.processor })
    if (s.ram) rows.push({ label: 'Memory', value: `${s.ram} GB RAM · ${storage} storage` })
    if (s.camera) rows.push({ label: 'Camera', value: s.camera })
    if (s.battery) rows.push({ label: 'Battery', value: s.battery })
    if (s.operating_system) rows.push({ label: 'Software', value: s.operating_system })
    if (s.connectivity) rows.push({ label: 'Connectivity', value: s.connectivity })
    if (s.waterresistance) rows.push({ label: 'Water resistance', value: s.waterresistance })
    return rows
  }, [product, storage])

  const price = useMemo(() => {
    if (!product) return 0
    const base = parseFloat(product.price) || 0
    return base + (STORAGE_OPTIONS.find((s) => s.value === storage)?.premium ?? 0)
  }, [product, storage])

  const oldPrice = product ? parseFloat(product.oldprice) || 0 : 0
  const savings = oldPrice > price ? oldPrice - price : 0
  const rating = product ? parseFloat(product.starrating) || 0 : 0
  const ratingsCount = product?.ratingscount ?? 0
  const inStock = (product?.stock ?? 0) > 0
  const lowStock = inStock && (product?.stock ?? 0) <= 10

  const wishlisted = product ? wishItems.some((i) => i.id === product.id) : false
  const comparing = product ? compareItems.some((i) => i.id === product.id) : false

  const backToCategory = () => {
    const info = getCategoryInfo()
    if (info?.categorySlug) navigate(`/products?categoryId=${info.categoryId}&category=${info.categorySlug}`)
    else navigate('/products')
  }

  if (loading) {
    return (
      <main className="app-main">
        <div className="pdp-top">
          <div className="pdp-gallery">
            <div className="pdp-thumbs">
              {Array.from({ length: 4 }).map((_, i) => (
                <div className="sk sk-cell" key={i} style={{ height: 78, animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
            <div className="sk sk-cell" style={{ minHeight: 420 }} />
          </div>
          <div className="pdp-info">
            <div className="sk sk-cell" style={{ height: 12, width: '30%' }} />
            <div className="sk sk-cell" style={{ height: 40, width: '85%', marginTop: 12 }} />
            <div className="sk sk-cell" style={{ height: 16, width: '50%', marginTop: 12 }} />
            <div className="sk sk-cell" style={{ height: 90, marginTop: 24 }} />
            <div className="sk sk-cell" style={{ height: 44, marginTop: 24 }} />
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  if (error || !product) {
    return (
      <main className="app-main">
        <div style={{ padding: '24px 0' }}>
          <ErrorState
            operation="/products/by-ids"
            title={error ? "We couldn't load this product." : 'This product is no longer listed.'}
            body={
              error
                ? 'The catalogue service didn’t answer in time. Your cart is safe.'
                : 'It may have been removed, or the id in the URL is wrong.'
            }
            actions={[
              { label: 'Retry', variant: 'primary', onClick: () => void loadProduct() },
              { label: 'Back to the department', onClick: backToCategory },
            ]}
          />
        </div>
        <Footer />
      </main>
    )
  }

  const addToCart = () => {
    void addByProductId(product.id, quantity, {
      name: product.productname,
      image: images[0],
      brand: product.brand,
      price,
      oldPrice: oldPrice || undefined,
      discountPercent: product.discountpercent,
    })
    openSuccess('Added to cart')
  }

  return (
    <main className="app-main">
      <nav aria-label="Breadcrumb">
        <ol className="breadcrumb">
          <li>
            <button type="button" onClick={() => navigate('/')}>Home</button>
          </li>
          <li>/</li>
          <li>
            <button type="button" onClick={backToCategory}>
              {product.categories?.description || product.categories?.categoryname || 'Products'}
            </button>
          </li>
          <li>/</li>
          <li aria-current="page">{product.productname}</li>
        </ol>
      </nav>

      <div className="pdp-top">
        <div className="pdp-gallery">
          <div className="pdp-thumbs">
            {images.map((src, i) => (
              <button
                type="button"
                key={src}
                className={`grayscale pdp-thumb${i === imageIndex ? ' is-active' : ''}`}
                aria-label={`View image ${i + 1}`}
                aria-pressed={i === imageIndex}
                onClick={() => setImageIndex(i)}
              >
                <img src={src} alt="" />
              </button>
            ))}
          </div>
          <div className="grayscale pdp-main-well">
            <img src={images[imageIndex]} alt={product.productname} />
          </div>
        </div>

        <div className="pdp-info">
          <h1 className="pdp-title">{product.productname}</h1>

          <a className="pdp-byline" href="#specifications">
            Visit the {product.brand} Store
            {product.categories?.description ? ` · ${product.categories.description}` : ''}
          </a>

          {rating > 0 ? (
            <div className="pdp-ratingline">
              <span className="rating-chip">{rating.toFixed(1)}</span>
              <Stars rating={rating} size={16} />
              <a href="#reviews" className="rating-count">
                {ratingsCount.toLocaleString('en-IN')} ratings
              </a>
            </div>
          ) : null}

          <div className="pdp-price-block">
            <div className="pdp-price-row">
              {savings > 0 ? (
                <span className="pdp-discount">
                  -{product.discountpercent || Math.round((savings / oldPrice) * 100)}%
                </span>
              ) : null}
              <PriceTag value={price} className="pdp-price" />
            </div>
            {savings > 0 ? (
              <div className="pdp-price-note">
                M.R.P: <span className="strike">{formatINR(oldPrice)}</span> · you save{' '}
                {formatINR(savings)}
              </div>
            ) : null}
            <div className="pdp-price-note">
              Inclusive of all taxes{product.freedelivery ? ' · no delivery charge on this item' : ''}
            </div>
          </div>

          <div className="pdp-options">
            <div>
              <div className="kicker" style={{ marginBottom: 8 }}>Storage</div>
              <div className="opt-row">
                {STORAGE_OPTIONS.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    className={`opt-btn${storage === option.value ? ' is-selected' : ''}`}
                    aria-pressed={storage === option.value}
                    onClick={() => setStorage(option.value)}
                  >
                    {option.value}
                    {option.premium > 0 ? ` · +${formatINR(option.premium)}` : ''}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="kicker" style={{ marginBottom: 8 }}>Colour</div>
              <div className="opt-row">
                {COLOUR_OPTIONS.map((option) => (
                  <button
                    type="button"
                    key={option}
                    className={`opt-btn${colour === option ? ' is-selected' : ''}`}
                    aria-pressed={colour === option}
                    onClick={() => setColour(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* ── the buy box ───────────────────────────────────────────────── */}
        <aside className="pdp-buybox" aria-label="Buying options">
          <PriceTag value={price} className="bb-price" />

          <div className="bb-delivery">
            {product.freedelivery ? (
              <>
                <strong>FREE delivery</strong> {deliveryDate(2)}
              </>
            ) : (
              <>Delivery by {deliveryDate(4)}</>
            )}
          </div>
          <div className="bb-note">Order within 6 hrs 12 mins · Deliver to Chennai 600001</div>

          <div className={`bb-stock${inStock ? '' : ' is-out'}`}>
            {inStock ? 'In stock' : 'Currently unavailable'}
          </div>
          {inStock && lowStock ? (
            <div className="bb-note" style={{ color: 'var(--color-price)', fontWeight: 700 }}>
              Only {product.stock} left — order soon
            </div>
          ) : null}

          <div>
            <div className="kicker" style={{ marginBottom: 6 }}>Quantity</div>
            <div className="qty-stepper is-small">
              <button
                type="button"
                aria-label="Decrease quantity"
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                −
              </button>
              <span className="value" aria-live="polite">{quantity}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => setQuantity((q) => q + 1)}
              >
                +
              </button>
            </div>
          </div>

          <div className="pdp-buy">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!inStock}
              onClick={addToCart}
            >
              {inStock ? 'Add to Cart' : 'Out of stock'}
            </button>

            <button
              type="button"
              className="btn btn-buy"
              disabled={!inStock}
              onClick={() => {
                addToCart()
                navigate('/cart')
              }}
            >
              Buy Now
            </button>

            <div className="pdp-buy-row">
              <button
                type="button"
                className={`btn btn-secondary${wishlisted ? ' is-on' : ''}`}
                aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                aria-pressed={wishlisted}
                onClick={() =>
                  wishToggle({
                    id: product.id,
                    name: product.productname,
                    brand: product.brand,
                    image: images[0],
                    price,
                    oldPrice: oldPrice || undefined,
                    inStock,
                    categoryId: product.categoryid,
                  })
                }
              >
                <HeartIcon size={16} filled={wishlisted} />
                {wishlisted ? 'Saved' : 'Save'}
              </button>

              <button
                type="button"
                className={`btn btn-secondary${comparing ? ' is-on' : ''}`}
                aria-label="Add to compare"
                aria-pressed={comparing}
                onClick={() => {
                  const ok = compareToggle({
                    id: product.id,
                    name: product.productname,
                    brand: product.brand,
                    image: images[0],
                    price,
                    rating,
                    ratingsCount,
                    categoryId: product.categoryid,
                    specs: specRows.reduce<Record<string, string>>((acc, r) => {
                      acc[r.label] = r.value
                      return acc
                    }, {}),
                  })
                  if (!ok) openSuccess('Compare holds four products. Remove one first.')
                }}
              >
                <CompareIcon size={16} />
                Compare
              </button>
            </div>
          </div>

          <div className="bb-secure">
            <LockIcon size={13} />
            Secure transaction
          </div>
          <div className="bb-note">Sold by Angaadi Retail · Dispatched from Chennai</div>
        </aside>

        <div className="pdp-assurance">
          <div>
            <ReturnIcon size={22} />
            <div className="t">7-day returns</div>
            <div className="d">Door pickup</div>
          </div>
          <div>
            <ShieldIcon size={22} />
            <div className="t">1-year warranty</div>
            <div className="d">{product.brand} India</div>
          </div>
          <div>
            <TruckIcon size={22} />
            <div className="t">Cash on delivery</div>
            <div className="d">Available at 600001</div>
          </div>
        </div>
      </div>

      <div className="pdp-lower">
        <div className="pdp-specs" id="specifications">
          <h2>Specifications</h2>
          {specRows.length > 0 ? (
            <table className="table">
              <tbody>
                {specRows.map((row) => (
                  <tr key={row.label}>
                    <td className="spec-key">{row.label}</td>
                    <td>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>The seller has not published a spec sheet for this unit.</p>
          )}

          <h2>About this product</h2>
          {product.productdetails ? <p>{product.productdetails}</p> : null}
          {product.description ? <p>{product.description}</p> : null}
          {!product.productdetails && !product.description ? (
            <p>No description has been published for this product.</p>
          ) : null}

          {product.keyfeatures?.['Key Features']?.length ? (
            <>
              <h2>Key features</h2>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: 'var(--color-neutral-800)' }}>
                {product.keyfeatures['Key Features'].map((feature) => (
                  <li key={feature} style={{ marginBottom: 6 }}>
                    {feature}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>

        <div className="pdp-reviews" id="reviews">
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2>Reviews</h2>
          </div>

          {rating > 0 ? (
            <div className="review-summary">
              <div>
                <div className="review-score">{rating.toFixed(1)}</div>
                <div style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>
                  {ratingsCount.toLocaleString('en-IN')} ratings
                </div>
              </div>
              <div className="review-bars">
                {([5, 4, 3, 2, 1] as const).map((star) => {
                  const key = (['one', 'two', 'three', 'four', 'five'] as const)[star - 1]
                  const count = mockRatingDistribution[key] ?? 0
                  const totalRated = Object.values(mockRatingDistribution).reduce((a, b) => a + b, 0) || 1
                  const pct = Math.round((count / totalRated) * 100)
                  return (
                    <div className="review-bar" key={star}>
                      <span className="lab">{star}★</span>
                      <span className="track">
                        <span className="fill" style={{ width: `${pct}%` }} />
                      </span>
                      <span className="pct">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>
              No one has rated this product yet.
            </p>
          )}

          {mockReviews.map((review) => (
            <div className="review-item" key={review.id}>
              <div className="review-head">
                <Stars rating={review.rating} size={13} />
                <strong style={{ fontSize: 14 }}>{review.headline}</strong>
              </div>
              <p>{review.body}</p>
              <div className="review-meta">
                {review.userName}
                {review.verifiedPurchase ? ' · verified purchase' : ''} · {review.date}
              </div>
            </div>
          ))}
        </div>
      </div>

      {related.length > 0 ? (
        <section className="shelf">
          <div className="section-head">
            <h2>Compared with these</h2>
            <Link className="section-link" to="/compare">
              Open compare →
            </Link>
          </div>
          <div className="compact-grid">
            {related.map((item) => (
              <Link
                className="compact-cell"
                key={item.id}
                to={`/product/${item.categoryid}/${item.id}`}
              >
                <span className="grayscale compact-well">
                  <img
                    src={
                      item.imageurl?.trim()
                        ? item.imageurl
                        : placeholderFor({ categoryId: item.categoryid, name: item.productname })
                    }
                    alt=""
                    loading="lazy"
                  />
                </span>
                <h3>{item.productname}</h3>
                <span className="compact-price">{formatINR(parseFloat(item.price) || 0)}</span>
                <span className="compact-meta">
                  {parseFloat(item.starrating) ? `${parseFloat(item.starrating).toFixed(1)} ★` : 'Not yet rated'}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <Footer />
    </main>
  )
}
