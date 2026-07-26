import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCartStore } from '../store/cart'
import { useAuthStore } from '../store/auth'
import { Footer } from '../components/Footer'
import { EmptyState } from '../components/States'
import { CheckIcon } from '../components/icons'
import { formatINR } from '../utils/currency'
import { placeholderFor } from '../data/catalog'

/**
 * Checkout — three steps on one page.
 *
 * IMPORTANT: the API exposes no order endpoint. `/api/v1/cart` supports GET,
 * POST and DELETE and nothing else, so there is nowhere to submit an order to.
 * Rather than invent a route or fake a POST, the final action is rendered
 * disabled with the reason stated on the page. Wire the real call at the one
 * place marked PLACE-ORDER below and the rest of the flow works unchanged.
 */

const GST_RATE = 0.18

type Slot = { id: string; day: string; window: string; note: string; fee: number }

const SLOTS: Slot[] = [
  { id: 'standard', day: 'Tuesday', window: '09:00 – 13:00', note: 'Standard, tracked', fee: 0 },
  { id: 'evening', day: 'Tuesday', window: '18:00 – 21:00', note: 'Evening window', fee: 40 },
  { id: 'priority', day: 'Monday', window: 'before 12:00', note: 'Next-day, priority handling', fee: 120 },
]

const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI', note: 'Pay from any UPI app' },
  { id: 'card', label: 'Card', note: 'Credit, debit or EMI' },
  { id: 'cod', label: 'Cash on delivery', note: 'Pay the courier at the door' },
]

type Address = {
  fullName: string
  phone: string
  line1: string
  line2: string
  city: string
  state: string
  pincode: string
}

const EMPTY_ADDRESS: Address = {
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
}

/** Saved addresses live on the device — there is no address endpoint either. */
const ADDRESS_KEY = 'demo.checkout.address.v1'

function readSavedAddress(): Address | null {
  try {
    const raw = localStorage.getItem(ADDRESS_KEY)
    return raw ? (JSON.parse(raw) as Address) : null
  } catch {
    return null
  }
}

export default function CheckoutPage() {
  const navigate = useNavigate()
  const items = useCartStore((s) => s.items)
  const fetchServerCart = useCartStore((s) => s.fetchServerCart)
  const subtotal = useCartStore((s) => s.subtotal)()
  const savings = useCartStore((s) => s.totalSavings)()
  const summary = useCartStore((s) => s.summary)
  const totalItems = useCartStore((s) => s.totalItems)()
  const user = useAuthStore((s) => s.user)

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [address, setAddress] = useState<Address>(() => readSavedAddress() ?? EMPTY_ADDRESS)
  const [addressSaved, setAddressSaved] = useState(() => readSavedAddress() !== null)
  const [addressErrors, setAddressErrors] = useState<Partial<Record<keyof Address, string>>>({})
  const [slot, setSlot] = useState<string | null>(null)
  const [payment, setPayment] = useState<string | null>(null)

  useEffect(() => {
    void fetchServerCart()
  }, [fetchServerCart])

  const chosenSlot = SLOTS.find((s) => s.id === slot)
  const deliveryFee = chosenSlot?.fee ?? 0
  const tax = summary.tax ?? Math.round(subtotal * GST_RATE)
  const total = subtotal + tax + deliveryFee

  const validateAddress = (): boolean => {
    const errors: Partial<Record<keyof Address, string>> = {}
    if (!address.fullName.trim()) errors.fullName = 'Enter the name on the door.'
    if (!/^\+?[\d\s-]{10,15}$/.test(address.phone.trim())) errors.phone = 'Enter a 10-digit mobile number.'
    if (!address.line1.trim()) errors.line1 = 'Enter the flat and street.'
    if (!address.city.trim()) errors.city = 'Enter the city.'
    if (!address.state.trim()) errors.state = 'Enter the state.'
    if (!/^\d{6}$/.test(address.pincode.trim())) errors.pincode = 'A pin code is six digits.'
    setAddressErrors(errors)
    return Object.keys(errors).length === 0
  }

  const saveAddress = () => {
    if (!validateAddress()) return
    try {
      localStorage.setItem(ADDRESS_KEY, JSON.stringify(address))
    } catch {
      /* ignore */
    }
    setAddressSaved(true)
    setStep(2)
  }

  const stepState = (n: 1 | 2 | 3) => {
    if (n === step) return 'is-current'
    if (n === 1 && addressSaved) return 'is-done'
    if (n === 2 && slot) return 'is-done'
    if (n === 3 && payment) return 'is-done'
    return ''
  }

  const orderLines = useMemo(
    () =>
      items.map((item) => ({
        id: item.id,
        name: item.name,
        qty: item.qty,
        line: item.price * item.qty,
        image: item.image || placeholderFor({ name: item.name }),
      })),
    [items]
  )

  if (items.length === 0) {
    return (
      <main className="app-main">
        <div className="checkout-bar">
          <span className="brand">ANGAADI</span>
          <span style={{ color: 'var(--color-neutral-700)' }}>Secure checkout</span>
        </div>
        <div style={{ padding: '28px 40px 48px' }}>
          <EmptyState
            title="There is nothing to check out."
            body="Your cart is empty, so there is no order to place yet."
            actions={[
              { label: 'Browse products', variant: 'primary', href: '/products?category=all' },
              { label: 'Open your wishlist', href: '/wishlist' },
            ]}
          />
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main className="app-main" id="checkout-page" data-testid="checkout-page">
      <div className="checkout-bar">
        <Link to="/" className="brand" style={{ color: 'var(--color-text)' }}>
          ANGAADI
        </Link>
        <span style={{ color: 'var(--color-neutral-700)' }}>
          Secure checkout · nothing is charged until you confirm
        </span>
      </div>

      <div className="steps">
        <button
          type="button"
          className={`step ${stepState(1)}`}
          onClick={() => setStep(1)}
          data-testid="checkout-step-1"
        >
          <span className="step-num">{addressSaved && step !== 1 ? <CheckIcon size={16} /> : '1'}</span>
          <span>
            <span className="step-title">1 · Delivery address</span>
            <span className="step-note" style={{ display: 'block' }}>
              {addressSaved ? `${address.fullName}, ${address.pincode} ${address.city}` : 'Where it goes'}
            </span>
          </span>
        </button>

        <button
          type="button"
          className={`step ${stepState(2)}`}
          disabled={!addressSaved}
          onClick={() => addressSaved && setStep(2)}
          data-testid="checkout-step-2"
        >
          <span className="step-num">{slot && step !== 2 ? <CheckIcon size={16} /> : '2'}</span>
          <span>
            <span className="step-title">2 · Delivery slot</span>
            <span className="step-note" style={{ display: 'block' }}>
              {chosenSlot ? `${chosenSlot.day} ${chosenSlot.window}` : 'Choose a window'}
            </span>
          </span>
        </button>

        <button
          type="button"
          className={`step ${stepState(3)}`}
          disabled={!slot}
          onClick={() => slot && setStep(3)}
          data-testid="checkout-step-3"
        >
          <span className="step-num">3</span>
          <span>
            <span className="step-title">3 · Payment</span>
            <span className="step-note" style={{ display: 'block' }}>
              {payment ? PAYMENT_METHODS.find((m) => m.id === payment)?.label : 'Card, UPI or cash'}
            </span>
          </span>
        </button>
      </div>

      <div className="checkout-layout">
        <div className="checkout-panels">
          {/* ── 1 · address ───────────────────────────────────────────── */}
          <section className="checkout-section" aria-labelledby="checkout-address-title">
            <div className="checkout-section-head">
              <h2 id="checkout-address-title">1 · Delivery address</h2>
              {addressSaved && step !== 1 ? (
                <button type="button" className="linkish" onClick={() => setStep(1)}>
                  Change
                </button>
              ) : null}
            </div>

            {step === 1 ? (
              <>
                <p className="checkout-hint">
                  Saved on this device only. There is no address book on the server yet.
                </p>
                <div className="field-grid">
                  <div className="field">
                    <label className="field-label" htmlFor="checkout-name">Full name</label>
                    <input
                      className={`input${addressErrors.fullName ? ' has-error' : ''}`}
                      id="checkout-name"
                      data-testid="checkout-name"
                      value={address.fullName}
                      onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                    />
                    {addressErrors.fullName ? <div className="field-error">{addressErrors.fullName}</div> : null}
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor="checkout-phone">Phone</label>
                    <input
                      className={`input${addressErrors.phone ? ' has-error' : ''}`}
                      id="checkout-phone"
                      data-testid="checkout-phone"
                      inputMode="tel"
                      value={address.phone}
                      onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                    />
                    {addressErrors.phone ? <div className="field-error">{addressErrors.phone}</div> : null}
                  </div>

                  <div className="field span-2">
                    <label className="field-label" htmlFor="checkout-line1">Flat and street</label>
                    <input
                      className={`input${addressErrors.line1 ? ' has-error' : ''}`}
                      id="checkout-line1"
                      data-testid="checkout-line1"
                      value={address.line1}
                      onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                    />
                    {addressErrors.line1 ? <div className="field-error">{addressErrors.line1}</div> : null}
                  </div>

                  <div className="field span-2">
                    <label className="field-label" htmlFor="checkout-line2">Area or landmark</label>
                    <input
                      className="input"
                      id="checkout-line2"
                      data-testid="checkout-line2"
                      value={address.line2}
                      onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor="checkout-city">City</label>
                    <input
                      className={`input${addressErrors.city ? ' has-error' : ''}`}
                      id="checkout-city"
                      data-testid="checkout-city"
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    />
                    {addressErrors.city ? <div className="field-error">{addressErrors.city}</div> : null}
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor="checkout-state">State</label>
                    <input
                      className={`input${addressErrors.state ? ' has-error' : ''}`}
                      id="checkout-state"
                      data-testid="checkout-state"
                      value={address.state}
                      onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    />
                    {addressErrors.state ? <div className="field-error">{addressErrors.state}</div> : null}
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor="checkout-pincode">Pin code</label>
                    <input
                      className={`input${addressErrors.pincode ? ' has-error' : ''}`}
                      id="checkout-pincode"
                      data-testid="checkout-pincode"
                      inputMode="numeric"
                      value={address.pincode}
                      onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                    />
                    {addressErrors.pincode ? <div className="field-error">{addressErrors.pincode}</div> : null}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ marginTop: 16, padding: '11px 18px' }}
                  onClick={saveAddress}
                  data-testid="checkout-address-save"
                >
                  Use this address
                </button>
              </>
            ) : (
              <div style={{ fontSize: 14, marginTop: 10, lineHeight: 1.6, color: 'var(--color-neutral-800)' }}>
                {address.fullName} · {address.phone}
                <br />
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ''}
                <br />
                {address.city} {address.pincode}, {address.state}
              </div>
            )}
          </section>

          {/* ── 2 · slot ──────────────────────────────────────────────── */}
          <section
            className={`checkout-section${addressSaved ? '' : ' is-locked'}`}
            aria-labelledby="checkout-slot-title"
          >
            <h2 id="checkout-slot-title">2 · Delivery slot</h2>
            <p className="checkout-hint">
              {addressSaved
                ? 'Every item ships together from the Chennai warehouse.'
                : 'Unlocks once an address is saved.'}
            </p>

            <div className="radio-stack">
              {SLOTS.map((s) => (
                <label
                  key={s.id}
                  className={`radio-row${slot === s.id ? ' is-selected' : ''}`}
                  data-testid={`checkout-slot-${s.id}`}
                >
                  <input
                    type="radio"
                    name="delivery-slot"
                    value={s.id}
                    checked={slot === s.id}
                    disabled={!addressSaved}
                    onChange={() => {
                      setSlot(s.id)
                      setStep(3)
                    }}
                  />
                  <span>
                    <span className="t" style={{ display: 'block' }}>
                      {s.day} · {s.window}
                    </span>
                    <span className="d">{s.note}</span>
                  </span>
                  <span className="fee">{s.fee === 0 ? 'Free' : formatINR(s.fee)}</span>
                </label>
              ))}
            </div>
          </section>

          {/* ── 3 · payment and review ────────────────────────────────── */}
          <section
            className={`checkout-section${slot ? '' : ' is-locked'}`}
            aria-labelledby="checkout-payment-title"
          >
            <h2 id="checkout-payment-title">3 · Payment</h2>
            <p className="checkout-hint">
              {slot ? 'Nothing is charged until you confirm.' : 'Unlocks once a slot is chosen.'}
            </p>

            <div className="radio-stack">
              {PAYMENT_METHODS.map((m) => (
                <label
                  key={m.id}
                  className={`radio-row${payment === m.id ? ' is-selected' : ''}`}
                  data-testid={`checkout-payment-${m.id}`}
                  style={{ gridTemplateColumns: '22px 1fr' }}
                >
                  <input
                    type="radio"
                    name="payment-method"
                    value={m.id}
                    checked={payment === m.id}
                    disabled={!slot}
                    onChange={() => setPayment(m.id)}
                  />
                  <span>
                    <span className="t" style={{ display: 'block' }}>{m.label}</span>
                    <span className="d">{m.note}</span>
                  </span>
                </label>
              ))}
            </div>

            {payment ? (
              <div className="state-block" style={{ marginTop: 20 }}>
                <h2 style={{ fontSize: 18 }}>Review</h2>
                <table className="table">
                  <tbody>
                    <tr>
                      <td style={{ width: '40%', color: 'var(--color-neutral-700)' }}>Delivering to</td>
                      <td>
                        {address.line1}, {address.city} {address.pincode}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ color: 'var(--color-neutral-700)' }}>Arriving</td>
                      <td>
                        <strong>
                          {chosenSlot?.day}, {chosenSlot?.window}
                        </strong>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ color: 'var(--color-neutral-700)' }}>Paying by</td>
                      <td>{PAYMENT_METHODS.find((m) => m.id === payment)?.label}</td>
                    </tr>
                    <tr>
                      <td style={{ color: 'var(--color-neutral-700)' }}>To pay</td>
                      <td className="num">{formatINR(total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        </div>

        <aside className="summary-aside" aria-label="Order summary">
          <div className="summary-sticky">
            <h2>Order summary</h2>

            <div className="summary-items">
              {orderLines.map((line) => (
                <div className="summary-item" key={line.id}>
                  <span className="grayscale summary-item-thumb">
                    <img src={line.image} alt="" loading="lazy" />
                  </span>
                  <span className="n">
                    {line.name}
                    <span className="q" style={{ display: 'block' }}>Qty {line.qty}</span>
                  </span>
                  <span className="p">{formatINR(line.line)}</span>
                </div>
              ))}
            </div>

            <div className="summary-lines" style={{ paddingTop: 14 }}>
              <div className="summary-row">
                <span className="k">Subtotal ({totalItems})</span>
                <span>{formatINR(subtotal)}</span>
              </div>
              <div className="summary-row">
                <span className="k">Delivery</span>
                <span>{deliveryFee === 0 ? (slot ? 'Free' : '—') : formatINR(deliveryFee)}</span>
              </div>
              <div className="summary-row">
                <span className="k">GST (included)</span>
                <span style={{ color: 'var(--color-neutral-700)' }}>{formatINR(tax)}</span>
              </div>
              {savings > 0 ? (
                <div className="summary-row is-saving">
                  <span>You save against MRP</span>
                  <span>−{formatINR(savings)}</span>
                </div>
              ) : null}
            </div>

            <div className="summary-total">
              <span className="k">To pay</span>
              <span className="v">{formatINR(total)}</span>
            </div>

            {/* PLACE-ORDER: there is no order endpoint on the API, so this stays
                disabled rather than faking a POST. Add the call here once
                `/api/v1/orders` exists, then route to /checkout/confirmation
                with the real order number. */}
            <button
              type="button"
              className="btn btn-primary btn-block"
              id="checkout-place-order"
              data-testid="checkout-place-order"
              disabled
              aria-describedby="checkout-place-order-note"
              onClick={() => navigate('/checkout/confirmation')}
            >
              Place order
            </button>

            <div className="state-block state-error" style={{ marginTop: 16, padding: 14 }}>
              <div className="state-label">Not wired · no order endpoint</div>
              <p style={{ margin: 0, fontSize: 13 }} id="checkout-place-order-note">
                The API exposes <code>/cart</code> only — there is nowhere to submit an order to
                yet. The button stays disabled rather than pretending the order went through.
              </p>
            </div>

            <div className="summary-note">
              {user?.emailId
                ? `Confirmation will go to ${user.emailId}.`
                : 'Sign in before checkout to get an emailed confirmation.'}{' '}
              You can still change the slot on the review step.
            </div>
          </div>
        </aside>
      </div>

      <Footer />
    </main>
  )
}
