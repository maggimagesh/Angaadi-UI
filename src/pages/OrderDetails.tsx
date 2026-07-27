import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { EmptyState } from '../components/States'
import { formatINR } from '../utils/currency'
import { placeholderFor } from '../data/catalog'
import { getOrder, type Order } from '../api/orders'

function statusTag(status: string): { label: string; className: string } {
  switch (status) {
    case 'paid':
      return { label: 'Paid', className: 'tag tag-neutral' }
    case 'payment_failed':
      return { label: 'Payment failed', className: 'tag tag-accent' }
    case 'pending_payment':
      return { label: 'Payment pending', className: 'tag tag-outline' }
    default:
      return { label: status, className: 'tag tag-neutral' }
  }
}

function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function OrderDetailsPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) return
    let cancelled = false
    setLoading(true)
    getOrder(orderId).then((res) => {
      if (cancelled) return
      if (res.error || !res.data) setError(res.error?.message || 'Order not found')
      else setOrder(res.data)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [orderId])

  if (loading) {
    return (
      <main className="app-main" id="order-details-page" data-testid="order-details-page">
        <div className="checkout-bar">
          <Link to="/" className="brand" style={{ color: 'var(--color-text)' }}>
            ANGAADI
          </Link>
          <span style={{ color: 'var(--color-neutral-700)' }}>Order details</span>
        </div>
        <div style={{ padding: '28px 40px 48px' }}>
          <p style={{ color: 'var(--color-neutral-700)' }}>Loading order…</p>
        </div>
        <Footer />
      </main>
    )
  }

  if (error || !order) {
    return (
      <main className="app-main" id="order-details-page" data-testid="order-details-page">
        <div className="checkout-bar">
          <Link to="/" className="brand" style={{ color: 'var(--color-text)' }}>
            ANGAADI
          </Link>
          <span style={{ color: 'var(--color-neutral-700)' }}>Order details</span>
        </div>
        <div style={{ padding: '28px 40px 48px' }}>
          <EmptyState
            title="Couldn't find that order."
            body={error || 'It may belong to a different account.'}
            actions={[{ label: 'Back to your orders', variant: 'primary', href: '/orders' }]}
          />
        </div>
        <Footer />
      </main>
    )
  }

  const tag = statusTag(order.status)
  const address = order.address

  return (
    <main className="app-main" id="order-details-page" data-testid="order-details-page">
      <div className="checkout-bar">
        <Link to="/" className="brand" style={{ color: 'var(--color-text)' }}>
          ANGAADI
        </Link>
        <span style={{ color: 'var(--color-neutral-700)' }}>Order details</span>
      </div>

      <div style={{ padding: '28px 40px 48px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div>
            <div className="kicker kicker-accent">Order</div>
            <h1 style={{ margin: '2px 0 4px', fontSize: 28 }} data-testid="order-details-number">
              {order.orderNumber}
            </h1>
            <div style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>Placed {formatDateTime(order.created_at)}</div>
          </div>
          <span className={tag.className} style={{ alignSelf: 'flex-start' }}>{tag.label}</span>
        </div>

        <div className="checkout-layout" style={{ gridTemplateColumns: '1fr 380px' }}>
          <div className="checkout-panels">
            <section className="checkout-section">
              <h2>Items</h2>
              <div className="summary-items">
                {order.items.map((item) => (
                  <div className="summary-item" key={item.id}>
                    <span className="grayscale summary-item-thumb">
                      <img src={item.productImage || placeholderFor({ name: item.productName })} alt="" loading="lazy" />
                    </span>
                    <span className="n">
                      {item.productName}
                      <span className="q" style={{ display: 'block' }}>Qty {item.quantity}</span>
                    </span>
                    <span className="p">{formatINR(Number(item.total))}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="checkout-section">
              <h2>Delivery</h2>
              {address ? (
                <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-neutral-800)' }}>
                  {address.fullName} · {address.phone}
                  <br />
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ''}
                  <br />
                  {address.city} {address.pincode}, {address.state}
                </div>
              ) : (
                <p className="checkout-hint">No address on file for this order.</p>
              )}
              {order.deliverySlot ? (
                <p style={{ fontSize: 13, color: 'var(--color-neutral-700)', marginTop: 12 }}>
                  Arriving: <strong style={{ color: 'var(--color-text)' }}>{order.deliverySlot}</strong>
                </p>
              ) : null}
            </section>

            <section className="checkout-section">
              <h2>Payment</h2>
              <table className="table">
                <tbody>
                  <tr>
                    <td style={{ width: '40%', color: 'var(--color-neutral-700)' }}>Method</td>
                    <td>Razorpay</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--color-neutral-700)' }}>Status</td>
                    <td>{tag.label}</td>
                  </tr>
                  {order.gatewayPaymentId ? (
                    <tr>
                      <td style={{ color: 'var(--color-neutral-700)' }}>Razorpay payment ID</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{order.gatewayPaymentId}</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </section>
          </div>

          <aside className="summary-aside" aria-label="Order totals">
            <div className="summary-sticky">
              <h2>Order total</h2>
              <div className="summary-lines">
                <div className="summary-row">
                  <span className="k">Subtotal</span>
                  <span>{formatINR(Number(order.subtotal))}</span>
                </div>
                <div className="summary-row">
                  <span className="k">Delivery</span>
                  <span>{Number(order.deliveryFee) === 0 ? 'Free' : formatINR(Number(order.deliveryFee))}</span>
                </div>
                <div className="summary-row">
                  <span className="k">GST (included)</span>
                  <span style={{ color: 'var(--color-neutral-700)' }}>{formatINR(Number(order.tax))}</span>
                </div>
              </div>
              <div className="summary-total">
                <span className="k">Total</span>
                <span className="v">{formatINR(Number(order.total))}</span>
              </div>

              {order.status === 'payment_failed' ? (
                <Link className="btn btn-primary btn-block" to="/checkout">
                  Retry checkout
                </Link>
              ) : null}
              <Link className="btn btn-secondary btn-block" to="/orders" style={{ marginTop: 10 }}>
                Back to your orders
              </Link>
            </div>
          </aside>
        </div>
      </div>

      <Footer />
    </main>
  )
}
