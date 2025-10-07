import { Link, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useCartStore } from '../store/cart'
import { formatINR } from '../utils/currency'
import '../styles/cart.css'

export default function CartPage() {
  const navigate = useNavigate()
  const items = useCartStore(s => s.items)
  const fetchServerCart = useCartStore(s => s.fetchServerCart)
  const updateQty = useCartStore(s => s.updateQty)
  const removeItem = useCartStore(s => s.removeItem)
  const clear = useCartStore(s => s.clear)
  const subtotal = useCartStore(s => s.subtotal)()
  const savings = useCartStore(s => s.totalSavings)()
  const summary = useCartStore(s => s.summary)
  const totalItems = useCartStore(s => s.totalItems)()

  const GST_RATE = 0.18
  const tax = summary.tax ?? Math.round(subtotal * GST_RATE)
  const total = (summary.total && summary.total > 0) ? summary.total : subtotal + tax

  useEffect(() => {
    void fetchServerCart()
  }, [fetchServerCart])

  return (
    <main className="app-main cart-main">
      <div className="surface">
        <div className="container" style={{paddingTop: 24}}>
          <div className="cart-header">
            <div style={{display:'flex', alignItems:'center', gap:12}}>
              <button className="btn" onClick={() => navigate(-1)} aria-label="Continue Shopping">← Continue Shopping</button>
              <h1 style={{margin:0}}>Shopping Cart ({totalItems} {totalItems === 1 ? 'item' : 'items'})</h1>
            </div>
            {items.length > 0 && (
              <button className="btn" onClick={clear} aria-label="Clear Cart">Clear Cart</button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="card empty-state">
              <p>Your cart is empty.</p>
              <Link to="/" className="btn btn-primary" style={{marginTop:12}}>Start Shopping</Link>
            </div>
          ) : (
            <div className="cart-layout">
              <section className="card">
                {items.map(item => (
                  <div key={item.id} className="cart-item">
                    <img className="cart-item-thumb" src={item.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&q=60'} alt={item.name} />
                    <div>
                      <div className="cart-item-title">{item.name}</div>
                      <div className="cart-item-meta">
                        {item.brand && <span className="meta-pill">{item.brand}</span>}
                        <span className="meta-pill" style={{background:'#ecfeff', color:'#0891b2', borderColor:'#cffafe'}}>Free Delivery</span>
                      </div>
                      <div className="price-row">
                        <span className="current">{formatINR(item.price)}</span>
                        {item.oldPrice && item.oldPrice > item.price && (
                          <>
                            <span className="old">{formatINR(item.oldPrice)}</span>
                            {item.discountPercent && <span className="off">{item.discountPercent}% off</span>}
                          </>
                        )}
                      </div>
                      {(item.options?.storage || item.options?.color) && (
                        <div style={{marginTop:6, color:'#64748b', fontSize:14}}>
                          {item.options?.storage && <span>Storage: {item.options.storage}</span>}
                          {item.options?.storage && item.options?.color && <span> • </span>}
                          {item.options?.color && <span>Color: {item.options.color}</span>}
                        </div>
                      )}
                    </div>
                    <div style={{display:'grid', justifyItems:'end', gap:10}}>
                      <div className="qty-controls" aria-label="Quantity selector">
                        <button onClick={() => updateQty(item.id, item.qty - 1)} aria-label="Decrease">-</button>
                        <span>{item.qty}</span>
                        <button onClick={() => updateQty(item.id, item.qty + 1)} aria-label="Increase">+</button>
                      </div>
                      <div className="cart-item-total">Total: {formatINR(item.price * item.qty)}</div>
                      <button className="remove-btn" onClick={() => void removeItem(item.id)} aria-label="Remove from cart">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M9 6v12m6-12v12M4 6l1 14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2l1-14"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}

                <div className="cart-card free-delivery-card" style={{margin:16}}>
                  <div className="free-delivery-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 7h11v10H3z"/><path d="M14 10h4l3 3v4h-7z"/></svg>
                  </div>
                  <div>
                    <div style={{fontWeight:600}}>Free Delivery</div>
                    <div style={{color:'#64748b'}}>Your order qualifies for free delivery!</div>
                  </div>
                </div>
              </section>

              <aside className="card summary-card">
                <h3 style={{marginTop:0}}>Order Summary</h3>
                <div className="summary-row"><span>Subtotal ({totalItems} {totalItems===1?'item':'items'})</span><span>{formatINR(summary.subtotal || subtotal)}</span></div>
                {(summary.youSave || savings) > 0 && (
                  <div className="summary-row muted"><span>You Save</span><span>-{formatINR(summary.youSave || savings)}</span></div>
                )}
                <div className="summary-row"><span>Delivery Fee</span><span>{summary.deliveryFee === 0 ? 'FREE' : formatINR(summary.deliveryFee || 0)}</span></div>
                <div className="summary-row"><span>Tax (GST)</span><span>{formatINR(tax)}</span></div>
                <div className="summary-total"><span>Total</span><span style={{color:'#16a34a'}}>{formatINR(total)}</span></div>

                <div style={{marginTop:16}} className="promo-row">
                  <input className="input" placeholder="Enter promo code" aria-label="Promo code" />
                  <button className="btn" aria-label="Apply">🏷️</button>
                </div>

                <button className="btn btn-primary" style={{width:'100%', marginTop:12}} aria-label="Proceed to Checkout">Proceed to Checkout</button>

                <div className="assurance-list">
                  <div className="assurance-item">💳 100% Secure Payments</div>
                  <div className="assurance-item">🚚 Fast & Reliable Delivery</div>
                  <div className="assurance-item">📍 Deliver to your location</div>
                </div>

                <Link to="/products" className="btn" style={{width:'100%', marginTop:16}}>Continue Shopping</Link>
              </aside>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
