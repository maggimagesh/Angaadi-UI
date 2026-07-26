import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCartStore } from '../store/cart'
import { useWishlistStore } from '../store/wishlist'
import { Footer } from '../components/Footer'
import { EmptyState } from '../components/States'
import { formatINR } from '../utils/currency'
import { placeholderFor } from '../data/catalog'
import '../styles/cart.css'

const GST_RATE = 0.18

export default function CartPage() {
  const navigate = useNavigate()
  const items = useCartStore((s) => s.items)
  const fetchServerCart = useCartStore((s) => s.fetchServerCart)
  const updateQty = useCartStore((s) => s.updateQty)
  const removeItem = useCartStore((s) => s.removeItem)
  const clear = useCartStore((s) => s.clear)
  const subtotal = useCartStore((s) => s.subtotal)()
  const savings = useCartStore((s) => s.totalSavings)()
  const summary = useCartStore((s) => s.summary)
  const totalItems = useCartStore((s) => s.totalItems)()

  const wishAdd = useWishlistStore((s) => s.add)
  const wishCount = useWishlistStore((s) => s.items.length)

  const [coupon, setCoupon] = useState('')
  const [couponNote, setCouponNote] = useState<string | null>(null)

  const tax = summary.tax ?? Math.round(subtotal * GST_RATE)
  const delivery = summary.deliveryFee ?? 0
  const total = summary.total && summary.total > 0 ? summary.total : subtotal + tax + delivery

  useEffect(() => {
    void fetchServerCart()
  }, [fetchServerCart])

  if (items.length === 0) {
    return (
      <main className="app-main">
        <div className="cart-head">
          <h1>Your cart</h1>
        </div>
        <div style={{ padding: '28px 40px 48px' }}>
          <EmptyState
            title="Your cart is empty."
            body="Anything you add stays here for 30 days, on this device. Two places worth starting:"
            actions={[
              { label: "Browse today's price drops", variant: 'primary', href: '/' },
              { label: `Open your wishlist (${wishCount})`, href: '/wishlist' },
            ]}
          />
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main className="app-main">
      <div className="cart-layout">
        <div className="cart-lines">
          <div className="cart-head">
            <h1>Your cart</h1>
            <span className="meta">
              {totalItems} item{totalItems === 1 ? '' : 's'}
            </span>
          </div>

          {items.map((item) => (
            <article className="cart-line" key={item.id} data-testid={`cart-line-${item.id}`}>
              <span className="grayscale cart-thumb">
                <img
                  src={item.image || placeholderFor({ name: item.name })}
                  alt={item.name}
                  loading="lazy"
                />
              </span>

              <div>
                {item.brand ? <div className="kicker">{item.brand}</div> : null}
                <h3>{item.name}</h3>
                <div className="cart-line-unit">{formatINR(item.price)} each</div>
                {item.options?.storage || item.options?.color ? (
                  <div className="cart-line-unit">
                    {[item.options?.storage, item.options?.color].filter(Boolean).join(' · ')}
                  </div>
                ) : null}
                <div className="cart-line-stock">In stock · free delivery</div>

                <div className="cart-line-tools">
                  <div className="qty-stepper is-small">
                    <button
                      type="button"
                      aria-label={`Decrease quantity of ${item.name}`}
                      disabled={item.qty <= 1}
                      onClick={() => updateQty(item.id, item.qty - 1)}
                    >
                      −
                    </button>
                    <span className="value">{item.qty}</span>
                    <button
                      type="button"
                      aria-label={`Increase quantity of ${item.name}`}
                      onClick={() => updateQty(item.id, item.qty + 1)}
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    className="linkish"
                    aria-label={`Remove ${item.name} from cart`}
                    onClick={() => void removeItem(item.id)}
                  >
                    Remove
                  </button>

                  <button
                    type="button"
                    className="linkish"
                    onClick={() => {
                      wishAdd({
                        id: item.id,
                        name: item.name,
                        brand: item.brand,
                        image: item.image,
                        price: item.price,
                        oldPrice: item.oldPrice,
                        inStock: true,
                      })
                      void removeItem(item.id)
                    }}
                  >
                    Move to wishlist
                  </button>
                </div>
              </div>

              <div className="cart-line-total">{formatINR(item.price * item.qty)}</div>
            </article>
          ))}

          <div className="cart-foot">
            <button
              type="button"
              className="linkish"
              style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 14 }}
              onClick={() => navigate('/products?category=all')}
            >
              ← Continue shopping
            </button>
            <button type="button" className="linkish" onClick={clear}>
              Clear cart
            </button>
          </div>
        </div>

        <aside className="summary-aside" aria-label="Order summary">
          <div className="summary-sticky">
            <h2>Order summary</h2>

            <div className="summary-lines">
              <div className="summary-row">
                <span className="k">
                  Subtotal ({totalItems} item{totalItems === 1 ? '' : 's'})
                </span>
                <span>{formatINR(summary.subtotal || subtotal)}</span>
              </div>
              <div className="summary-row">
                <span className="k">Delivery</span>
                <span>{delivery === 0 ? 'Free' : formatINR(delivery)}</span>
              </div>
              <div className="summary-row">
                <span className="k">GST (included)</span>
                <span style={{ color: 'var(--color-neutral-700)' }}>{formatINR(tax)}</span>
              </div>
              {(summary.youSave || savings) > 0 ? (
                <div className="summary-row is-saving">
                  <span>You save against MRP</span>
                  <span>−{formatINR(summary.youSave || savings)}</span>
                </div>
              ) : null}
            </div>

            <div className="summary-total">
              <span className="k">Total</span>
              <span className="v">{formatINR(total)}</span>
            </div>

            <Link className="btn btn-primary btn-block" to="/checkout">
              Proceed to checkout
            </Link>
            <Link className="btn btn-secondary btn-block" to="/products?category=all">
              Continue shopping
            </Link>

            <div className="coupon-box">
              <div className="kicker" style={{ marginBottom: 8 }}>Coupon</div>
              <form
                className="coupon-field"
                onSubmit={(e) => {
                  e.preventDefault()
                  setCouponNote(
                    coupon.trim()
                      ? `${coupon.trim().toUpperCase()} is not valid on this cart.`
                      : 'Enter a code first.'
                  )
                }}
              >
                <input
                  placeholder="Enter code"
                  aria-label="Coupon code"
                  id="cart-coupon"
                  data-testid="cart-coupon"
                  value={coupon}
                  onChange={(e) => {
                    setCoupon(e.target.value)
                    setCouponNote(null)
                  }}
                />
                <button type="submit" className="btn btn-secondary">
                  Apply
                </button>
              </form>
              {couponNote ? (
                <div className="summary-note" role="status">
                  {couponNote}
                </div>
              ) : null}
            </div>

            <div className="summary-note">
              Delivering to <strong style={{ color: 'var(--color-text)' }}>600001, Chennai</strong> ·
              change at checkout. Cash on delivery available.
            </div>
          </div>
        </aside>
      </div>

      <Footer />
    </main>
  )
}
