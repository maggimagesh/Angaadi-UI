import { Link, useLocation } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { EmptyState } from '../components/States'
import { formatINR } from '../utils/currency'

/**
 * `/checkout/confirmation`.
 *
 * This view reads the order the checkout hands over in router state. Because
 * no order endpoint exists yet, nothing currently produces that state — so the
 * page renders honestly rather than inventing an order number. Once the real
 * POST lands, pass its response through as `state.order` and this renders it.
 */

type ConfirmedOrder = {
  orderNumber: string
  paymentLabel: string
  email?: string
  arriving: string
  address: string
  items: { name: string; qty: number }[]
  total: number
}

export default function CheckoutConfirmation() {
  const location = useLocation()
  const order = (location.state as { order?: ConfirmedOrder } | null)?.order

  if (!order) {
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
            body="You reach this page after placing an order. Nothing has been placed in this session — the API has no order endpoint yet, so checkout stops before submission."
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
            Paid by {order.paymentLabel}
            {order.email ? ` · confirmation mailed to ${order.email}` : ''}
          </p>

          <table className="table">
            <tbody>
              <tr>
                <td style={{ width: '45%', color: 'var(--color-neutral-700)' }}>Arriving</td>
                <td>
                  <strong>{order.arriving}</strong>
                </td>
              </tr>
              <tr>
                <td style={{ color: 'var(--color-neutral-700)' }}>Delivering to</td>
                <td>{order.address}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--color-neutral-700)' }}>Items</td>
                <td>{order.items.map((i) => `${i.name} × ${i.qty}`).join(' · ')}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--color-neutral-700)' }}>Paid</td>
                <td className="num">{formatINR(order.total)}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
            <Link className="btn btn-primary" to="/profile">
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
