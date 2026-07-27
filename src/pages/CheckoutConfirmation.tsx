import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { EmptyState } from '../components/States'
import { formatINR } from '../utils/currency'
import { getOrder, type Order } from '../api/orders'

/**
 * `/checkout/confirmation`.
 *
 * Checkout hands over `{ orderId }` in router state once Razorpay verification
 * succeeds; this page re-fetches the order from the API rather than trusting
 * the navigation state alone, so a refresh or a shared link still resolves.
 */

export default function CheckoutConfirmation() {
  const location = useLocation()
  const orderId = (location.state as { orderId?: string } | null)?.orderId

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(!!orderId)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) return
    let cancelled = false
    setLoading(true)
    getOrder(orderId).then((res) => {
      if (cancelled) return
      if (res.error || !res.data) {
        setError(res.error?.message || 'Could not load this order')
      } else {
        setOrder(res.data)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [orderId])

  if (!orderId) {
    return (
      <main className="app-main">
        <div className="checkout-bar">
          <Link to="/" className="brand" style={{ color: 'var(--color-text)' }}>
            ANGAADI
          </Link>
          <span style={{ color: 'var(--color-neutral-700)' }}>Order confirmation</span>
        </div>
        <div style={{ padding: '28px 40px 48px' }}>
          <EmptyState
            title="There is no order to show."
            body="You reach this page after placing an order. Nothing has been placed in this session."
            actions={[
              { label: 'Back to cart', variant: 'primary', href: '/cart' },
              { label: 'Continue shopping', href: '/products?category=all' },
            ]}
          />
        </div>
        <Footer />
      </main>
    )
  }

  if (loading) {
    return (
      <main className="app-main">
        <div className="checkout-bar">
          <Link to="/" className="brand" style={{ color: 'var(--color-text)' }}>
            ANGAADI
          </Link>
          <span style={{ color: 'var(--color-neutral-700)' }}>Order confirmation</span>
        </div>
        <div style={{ padding: '28px 40px 48px' }}>
          <p style={{ color: 'var(--color-neutral-700)' }}>Loading your order…</p>
        </div>
        <Footer />
      </main>
    )
  }

  if (error || !order) {
    return (
      <main className="app-main">
        <div className="checkout-bar">
          <Link to="/" className="brand" style={{ color: 'var(--color-text)' }}>
            ANGAADI
          </Link>
          <span style={{ color: 'var(--color-neutral-700)' }}>Order confirmation</span>
        </div>
        <div style={{ padding: '28px 40px 48px' }}>
          <EmptyState
            title="Couldn't load that order."
            body={error || 'Something went wrong.'}
            actions={[
              { label: 'View your orders', variant: 'primary', href: '/orders' },
              { label: 'Continue shopping', href: '/products?category=all' },
            ]}
          />
        </div>
        <Footer />
      </main>
    )
  }

  const address = order.address

  return (
    <main className="app-main" id="checkout-confirmation" data-testid="checkout-confirmation">
      <div className="checkout-bar">
        <Link to="/" className="brand" style={{ color: 'var(--color-text)' }}>
          ANGAADI
        </Link>
        <span style={{ color: 'var(--color-neutral-700)' }}>Order confirmation</span>
      </div>

      <div className="confirmation">
        <div className="confirmation-main">
          <div className="kicker kicker-accent">Order placed</div>
          <h1 data-testid="confirmation-order-number">{order.orderNumber}</h1>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--color-neutral-800)' }}>
            Paid by Razorpay
          </p>

          <table className="table">
            <tbody>
              <tr>
                <td style={{ width: '45%', color: 'var(--color-neutral-700)' }}>Arriving</td>
                <td>
                  <strong>{order.deliverySlot || 'Standard delivery'}</strong>
                </td>
              </tr>
              <tr>
                <td style={{ color: 'var(--color-neutral-700)' }}>Delivering to</td>
                <td>
                  {address ? `${address.line1}, ${address.city} ${address.pincode}` : '—'}
                </td>
              </tr>
              <tr>
                <td style={{ color: 'var(--color-neutral-700)' }}>Items</td>
                <td>{order.items.map((i) => `${i.productName} × ${i.quantity}`).join(' · ')}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--color-neutral-700)' }}>Paid</td>
                <td className="num">{formatINR(Number(order.total))}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
            <Link className="btn btn-primary" to={`/orders/${order.id}`}>
              Track this order
            </Link>
            <Link className="btn btn-secondary" to="/products?category=all">
              Continue shopping
            </Link>
          </div>
        </div>

        <div className="confirmation-next">
          <div className="kicker">What happens next</div>
          <div className="confirmation-step">
            <span className="n">01</span>
            <span className="d">Packed at the Chennai warehouse — today, by 20:00.</span>
          </div>
          <div className="confirmation-step">
            <span className="n">02</span>
            <span className="d">Handed to the courier the following morning.</span>
          </div>
          <div className="confirmation-step">
            <span className="n">03</span>
            <span className="d">Out for delivery — you get an SMS with a 2-hour window.</span>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
