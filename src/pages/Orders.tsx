import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { Footer } from '../components/Footer'
import { EmptyState, ErrorState } from '../components/States'
import { formatINR } from '../utils/currency'
import { placeholderFor } from '../data/catalog'
import { listOrders, type Order } from '../api/orders'

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

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function OrdersPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    listOrders().then((res) => {
      if (cancelled) return
      if (res.error) setError(res.error.message)
      else setOrders(res.data || [])
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return (
      <main className="app-main" id="orders-page" data-testid="orders-page">
        <section style={{ borderBottom: '2px solid var(--color-divider)' }}>
          <div className="section-head">
            <h1 style={{ margin: 0, fontSize: 28 }}>Your orders</h1>
          </div>
          <div style={{ padding: '0 40px 40px' }}>
            <EmptyState
              title="Sign in to see your orders."
              body="Orders are tied to your account."
              actions={[{ label: 'Sign in', variant: 'primary', href: '/login' }]}
            />
          </div>
        </section>
        <Footer />
      </main>
    )
  }

  return (
    <main className="app-main" id="orders-page" data-testid="orders-page">
      <section style={{ borderBottom: '2px solid var(--color-divider)' }}>
        <div className="section-head">
          <div>
            <h1 style={{ margin: '0 0 4px', fontSize: 28 }}>Your orders</h1>
            <div style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>
              {loading ? 'Loading…' : `${orders.length} order${orders.length === 1 ? '' : 's'}`}
            </div>
          </div>
        </div>

        <div style={{ padding: '0 40px 40px' }}>
          {loading ? (
            <p style={{ color: 'var(--color-neutral-700)' }}>Loading your orders…</p>
          ) : error ? (
            <ErrorState
              operation="/orders"
              title="Couldn't load your orders."
              body={error}
              actions={[{ label: 'Try again', variant: 'primary', onClick: () => window.location.reload() }]}
            />
          ) : orders.length === 0 ? (
            <EmptyState
              title="No orders yet."
              body="Once you place an order, it shows up here with its status and tracking."
              actions={[{ label: 'Browse products', variant: 'primary', href: '/products?category=all' }]}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} id="orders-list" data-testid="orders-list">
              {orders.map((order) => {
                const tag = statusTag(order.status)
                return (
                  <article
                    key={order.id}
                    className="state-block"
                    id={`order-${order.id}`}
                    data-testid={`order-${order.id}`}
                    style={{ padding: 20 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                      <div>
                        <div className="kicker">Order {order.orderNumber}</div>
                        <div style={{ fontSize: 13, color: 'var(--color-neutral-700)', marginTop: 4 }}>
                          Placed {formatDate(order.created_at)}
                        </div>
                      </div>
                      <span className={tag.className}>{tag.label}</span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: 10,
                        marginTop: 16,
                        overflowX: 'auto',
                      }}
                    >
                      {order.items.map((item) => (
                        <span
                          key={item.id}
                          className="grayscale summary-item-thumb"
                          style={{ flex: '0 0 auto' }}
                          title={`${item.productName} × ${item.quantity}`}
                        >
                          <img
                            src={item.productImage || placeholderFor({ name: item.productName })}
                            alt=""
                            loading="lazy"
                          />
                        </span>
                      ))}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 16,
                        flexWrap: 'wrap',
                        gap: 12,
                      }}
                    >
                      <span style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>
                        {order.items.length} item{order.items.length === 1 ? '' : 's'} · Total{' '}
                        <strong className="num" style={{ color: 'var(--color-text)' }}>
                          {formatINR(Number(order.total))}
                        </strong>
                      </span>
                      <Link className="btn btn-secondary" to={`/orders/${order.id}`} data-testid={`order-view-${order.id}`}>
                        View details
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  )
}
