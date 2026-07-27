import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import { useCartStore } from '../store/cart'
import { useAuthStore } from '../store/auth'
import { Footer } from '../components/Footer'
import { EmptyState } from '../components/States'
import { CheckIcon } from '../components/icons'
import { formatINR } from '../utils/currency'
import { placeholderFor } from '../data/catalog'
import { listAddresses, createAddress, type Address, type AddressInput } from '../api/address'
import { createOrder, type Order } from '../api/orders'
import { createPaypalOrder, capturePaypalOrder, cancelPaypalOrder } from '../api/payments'

const GST_RATE = 0.18

type Slot = { id: string; day: string; window: string; note: string; fee: number }

const SLOTS: Slot[] = [
  { id: 'standard', day: 'Tuesday', window: '09:00 – 13:00', note: 'Standard, tracked', fee: 0 },
  { id: 'evening', day: 'Tuesday', window: '18:00 – 21:00', note: 'Evening window', fee: 40 },
  { id: 'priority', day: 'Monday', window: 'before 12:00', note: 'Next-day, priority handling', fee: 120 },
]

const EMPTY_ADDRESS: AddressInput = {
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
}

const PAYPAL_CLIENT_ID: string = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'sb'

export default function CheckoutPage() {
  const navigate = useNavigate()
  const items = useCartStore((s) => s.items)
  const fetchServerCart = useCartStore((s) => s.fetchServerCart)
  const subtotal = useCartStore((s) => s.subtotal)()
  const savings = useCartStore((s) => s.totalSavings)()
  const summary = useCartStore((s) => s.summary)
  const totalItems = useCartStore((s) => s.totalItems)()
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const [step, setStep] = useState<1 | 2 | 3>(1)

  /* ── addresses ─────────────────────────────────────────────────────── */
  const [addresses, setAddresses] = useState<Address[]>([])
  const [addressesLoading, setAddressesLoading] = useState(true)
  const [addressesError, setAddressesError] = useState<string | null>(null)
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState<AddressInput>(EMPTY_ADDRESS)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof AddressInput, string>>>({})
  const [savingAddress, setSavingAddress] = useState(false)

  const [slot, setSlot] = useState<string | null>(null)

  /* ── order + payment ──────────────────────────────────────────────── */
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null)
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null)
  const [paypalDemo, setPaypalDemo] = useState(false)
  const [placingOrder, setPlacingOrder] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)
  const [paymentFailed, setPaymentFailed] = useState(false)
  const [paymentFailedReason, setPaymentFailedReason] = useState<string | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    void fetchServerCart()
  }, [fetchServerCart])

  useEffect(() => {
    if (!isAuthenticated) {
      setAddressesLoading(false)
      return
    }
    let cancelled = false
    setAddressesLoading(true)
    listAddresses().then((res) => {
      if (cancelled) return
      if (res.error) {
        setAddressesError(res.error.message)
      } else {
        const list = res.data || []
        setAddresses(list)
        const preferred = list.find((a) => a.isDefault) ?? list[0]
        if (preferred) setSelectedAddressId(preferred.id)
        else setShowAddForm(true)
      }
      setAddressesLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  const chosenSlot = SLOTS.find((s) => s.id === slot)
  const deliveryFee = chosenSlot?.fee ?? 0
  const tax = summary.tax ?? Math.round(subtotal * GST_RATE)
  const total = subtotal + tax + deliveryFee

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) ?? null
  const addressSaved = !!selectedAddress

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof AddressInput, string>> = {}
    if (!form.fullName.trim()) errors.fullName = 'Enter the name on the door.'
    if (!/^\+?[\d\s-]{10,15}$/.test(form.phone.trim())) errors.phone = 'Enter a 10-digit mobile number.'
    if (!form.line1.trim()) errors.line1 = 'Enter the flat and street.'
    if (!form.city.trim()) errors.city = 'Enter the city.'
    if (!form.state.trim()) errors.state = 'Enter the state.'
    if (!/^\d{6}$/.test(form.pincode.trim())) errors.pincode = 'A pin code is six digits.'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const saveNewAddress = async () => {
    if (!validateForm()) return
    setSavingAddress(true)
    setAddressesError(null)
    const res = await createAddress(form)
    setSavingAddress(false)
    if (res.error || !res.data) {
      setAddressesError(res.error?.message || 'Failed to save address')
      return
    }
    setAddresses((prev) => [res.data!, ...prev.map((a) => ({ ...a, isDefault: false }))])
    setSelectedAddressId(res.data.id)
    setShowAddForm(false)
    setForm(EMPTY_ADDRESS)
    setStep(2)
  }

  const useSelectedAddress = () => {
    if (!selectedAddress) return
    setStep(2)
  }

  const stepState = (n: 1 | 2 | 3) => {
    if (n === step) return 'is-current'
    if (n === 1 && addressSaved) return 'is-done'
    if (n === 2 && slot) return 'is-done'
    if (n === 3 && pendingOrder?.status === 'paid') return 'is-done'
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

  /* ── payment step: create the order, then start a PayPal session ───── */
  const beginPayment = async () => {
    if (!selectedAddress) return
    setPlacingOrder(true)
    setOrderError(null)
    setPaymentFailed(false)
    setPaymentFailedReason(null)

    let order = pendingOrder
    if (!order) {
      const res = await createOrder({
        addressId: selectedAddress.id,
        deliverySlot: chosenSlot ? `${chosenSlot.day} ${chosenSlot.window}` : undefined,
        deliveryFee,
      })
      if (res.error || !res.data) {
        setOrderError(res.error?.message || 'Could not place the order')
        setPlacingOrder(false)
        return
      }
      order = res.data
      setPendingOrder(order)
    }

    const pp = await createPaypalOrder(order.id)
    if (pp.error || !pp.data) {
      setOrderError(pp.error?.message || 'Could not start PayPal checkout')
      setPlacingOrder(false)
      return
    }
    setPaypalOrderId(pp.data.paypalOrderId)
    setPaypalDemo(pp.data.demo)
    setPlacingOrder(false)
  }

  useEffect(() => {
    if (step === 3 && selectedAddress && !pendingOrder && !placingOrder) {
      void beginPayment()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedAddress])

  const finishPayment = async (capturedOrder: Order) => {
    setPendingOrder(capturedOrder)
    await fetchServerCart()
    navigate('/checkout/confirmation', { state: { orderId: capturedOrder.id } })
  }

  const handleCapture = async (paypalOrderIdFromSdk: string) => {
    if (!pendingOrder) return
    setCapturing(true)
    const res = await capturePaypalOrder(pendingOrder.id, paypalOrderIdFromSdk)
    setCapturing(false)
    if (res.error || !res.data) {
      setPaymentFailed(true)
      setPaymentFailedReason(res.error?.message || 'Payment was declined.')
      return
    }
    await finishPayment(res.data)
  }

  const handlePaymentCancelled = async (reason: string) => {
    if (pendingOrder) {
      await cancelPaypalOrder(pendingOrder.id).catch(() => null)
    }
    setPaymentFailed(true)
    setPaymentFailedReason(reason)
  }

  const retryPayment = () => {
    setPaymentFailed(false)
    setPaymentFailedReason(null)
    setPaypalOrderId(null)
    setPaypalDemo(false)
    setAttempt((n) => n + 1)
    void beginPayment()
  }

  if (!isAuthenticated) {
    return (
      <main className="app-main">
        <div className="checkout-bar">
          <span className="brand">ANGAADI</span>
          <span style={{ color: 'var(--color-neutral-700)' }}>Secure checkout</span>
        </div>
        <div style={{ padding: '28px 40px 48px' }}>
          <EmptyState
            title="Sign in to check out."
            body="Your saved addresses and orders live on your account, so checkout needs you signed in first."
            actions={[
              { label: 'Sign in', variant: 'primary', href: '/login' },
              { label: 'Back to cart', href: '/cart' },
            ]}
          />
        </div>
        <Footer />
      </main>
    )
  }

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
              {addressSaved ? `${selectedAddress!.fullName}, ${selectedAddress!.pincode} ${selectedAddress!.city}` : 'Where it goes'}
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
            <span className="step-title">3 · Pay with PayPal</span>
            <span className="step-note" style={{ display: 'block' }}>
              {pendingOrder?.status === 'paid' ? 'Paid' : 'PayPal sandbox'}
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
              addressesLoading ? (
                <p className="checkout-hint">Loading your saved addresses…</p>
              ) : (
                <>
                  {addressesError ? (
                    <div className="state-block state-error" style={{ marginBottom: 16, padding: 14 }}>
                      <p style={{ margin: 0, fontSize: 13 }}>{addressesError}</p>
                    </div>
                  ) : null}

                  {!showAddForm && addresses.length > 0 ? (
                    <>
                      <div className="radio-stack" style={{ marginBottom: 16 }}>
                        {addresses.map((a) => (
                          <label
                            key={a.id}
                            className={`radio-row${selectedAddressId === a.id ? ' is-selected' : ''}`}
                            data-testid={`checkout-address-${a.id}`}
                          >
                            <input
                              type="radio"
                              name="delivery-address"
                              checked={selectedAddressId === a.id}
                              onChange={() => setSelectedAddressId(a.id)}
                            />
                            <span>
                              <span className="t" style={{ display: 'block' }}>
                                {a.fullName} · {a.phone} {a.isDefault ? '· Default' : ''}
                              </span>
                              <span className="d">
                                {a.line1}
                                {a.line2 ? `, ${a.line2}` : ''}, {a.city} {a.pincode}, {a.state}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ padding: '11px 18px' }}
                          onClick={useSelectedAddress}
                          disabled={!selectedAddressId}
                          data-testid="checkout-address-save"
                        >
                          Deliver here
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '11px 18px' }}
                          onClick={() => setShowAddForm(true)}
                        >
                          + Add a new address
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="checkout-hint">Saved securely to your account.</p>
                      <div className="field-grid">
                        <div className="field">
                          <label className="field-label" htmlFor="checkout-name">Full name</label>
                          <input
                            className={`input${formErrors.fullName ? ' has-error' : ''}`}
                            id="checkout-name"
                            data-testid="checkout-name"
                            value={form.fullName}
                            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                          />
                          {formErrors.fullName ? <div className="field-error">{formErrors.fullName}</div> : null}
                        </div>

                        <div className="field">
                          <label className="field-label" htmlFor="checkout-phone">Phone</label>
                          <input
                            className={`input${formErrors.phone ? ' has-error' : ''}`}
                            id="checkout-phone"
                            data-testid="checkout-phone"
                            inputMode="tel"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          />
                          {formErrors.phone ? <div className="field-error">{formErrors.phone}</div> : null}
                        </div>

                        <div className="field span-2">
                          <label className="field-label" htmlFor="checkout-line1">Flat and street</label>
                          <input
                            className={`input${formErrors.line1 ? ' has-error' : ''}`}
                            id="checkout-line1"
                            data-testid="checkout-line1"
                            value={form.line1}
                            onChange={(e) => setForm({ ...form, line1: e.target.value })}
                          />
                          {formErrors.line1 ? <div className="field-error">{formErrors.line1}</div> : null}
                        </div>

                        <div className="field span-2">
                          <label className="field-label" htmlFor="checkout-line2">Area or landmark</label>
                          <input
                            className="input"
                            id="checkout-line2"
                            data-testid="checkout-line2"
                            value={form.line2 ?? ''}
                            onChange={(e) => setForm({ ...form, line2: e.target.value })}
                          />
                        </div>

                        <div className="field">
                          <label className="field-label" htmlFor="checkout-city">City</label>
                          <input
                            className={`input${formErrors.city ? ' has-error' : ''}`}
                            id="checkout-city"
                            data-testid="checkout-city"
                            value={form.city}
                            onChange={(e) => setForm({ ...form, city: e.target.value })}
                          />
                          {formErrors.city ? <div className="field-error">{formErrors.city}</div> : null}
                        </div>

                        <div className="field">
                          <label className="field-label" htmlFor="checkout-state">State</label>
                          <input
                            className={`input${formErrors.state ? ' has-error' : ''}`}
                            id="checkout-state"
                            data-testid="checkout-state"
                            value={form.state}
                            onChange={(e) => setForm({ ...form, state: e.target.value })}
                          />
                          {formErrors.state ? <div className="field-error">{formErrors.state}</div> : null}
                        </div>

                        <div className="field">
                          <label className="field-label" htmlFor="checkout-pincode">Pin code</label>
                          <input
                            className={`input${formErrors.pincode ? ' has-error' : ''}`}
                            id="checkout-pincode"
                            data-testid="checkout-pincode"
                            inputMode="numeric"
                            value={form.pincode}
                            onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                          />
                          {formErrors.pincode ? <div className="field-error">{formErrors.pincode}</div> : null}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ padding: '11px 18px' }}
                          onClick={saveNewAddress}
                          disabled={savingAddress}
                          data-testid="checkout-address-save"
                        >
                          {savingAddress ? 'Saving…' : 'Use this address'}
                        </button>
                        {addresses.length > 0 ? (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '11px 18px' }}
                            onClick={() => setShowAddForm(false)}
                          >
                            Use a saved address
                          </button>
                        ) : null}
                      </div>
                    </>
                  )}
                </>
              )
            ) : (
              <div style={{ fontSize: 14, marginTop: 10, lineHeight: 1.6, color: 'var(--color-neutral-800)' }}>
                {selectedAddress?.fullName} · {selectedAddress?.phone}
                <br />
                {selectedAddress?.line1}
                {selectedAddress?.line2 ? `, ${selectedAddress.line2}` : ''}
                <br />
                {selectedAddress?.city} {selectedAddress?.pincode}, {selectedAddress?.state}
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

          {/* ── 3 · PayPal payment ────────────────────────────────────── */}
          <section
            className={`checkout-section${slot ? '' : ' is-locked'}`}
            aria-labelledby="checkout-payment-title"
            id="checkout-payment-section"
            data-testid="checkout-payment-section"
          >
            <h2 id="checkout-payment-title">3 · Pay with PayPal</h2>
            <p className="checkout-hint">
              {slot ? 'Complete payment with a PayPal sandbox (demo) account.' : 'Unlocks once a slot is chosen.'}
            </p>

            {slot ? (
              <>
                {orderError ? (
                  <div className="state-block state-error" style={{ marginBottom: 16, padding: 14 }}>
                    <div className="state-label">Payment setup failed</div>
                    <p style={{ margin: '0 0 10px', fontSize: 13 }}>{orderError}</p>
                    <button type="button" className="btn btn-secondary" onClick={retryPayment}>
                      Try again
                    </button>
                  </div>
                ) : null}

                {placingOrder && !orderError ? (
                  <p className="checkout-hint">Preparing your order…</p>
                ) : null}

                {pendingOrder?.status === 'paid' ? (
                  <div className="state-block" style={{ padding: 14 }}>
                    <div className="state-label">Payment received</div>
                    <p style={{ margin: 0, fontSize: 13 }}>
                      Order {pendingOrder.orderNumber} is paid. Redirecting to your confirmation…
                    </p>
                  </div>
                ) : null}

                {paymentFailed && pendingOrder?.status !== 'paid' ? (
                  <div className="state-block state-error" style={{ marginBottom: 16, padding: 14 }}>
                    <div className="state-label">Payment not completed</div>
                    <p style={{ margin: '0 0 10px', fontSize: 13 }}>
                      {paymentFailedReason || 'The PayPal payment was cancelled or declined.'}
                    </p>
                    <button type="button" className="btn btn-primary" onClick={retryPayment} disabled={placingOrder}>
                      Try payment again
                    </button>
                  </div>
                ) : null}

                {!placingOrder && !orderError && !paymentFailed && pendingOrder?.status !== 'paid' && paypalOrderId ? (
                  paypalDemo ? (
                    <div className="state-block" style={{ padding: 14 }} data-testid="paypal-demo-panel">
                      <div className="state-label">PayPal sandbox · demo mode</div>
                      <p style={{ margin: '0 0 14px', fontSize: 13 }}>
                        No PayPal sandbox app is configured on the API yet, so this simulates the two outcomes a real
                        PayPal demo account can produce. Set <code>PAYPAL_CLIENT_ID</code> /{' '}
                        <code>PAYPAL_CLIENT_SECRET</code> on the API to use a real sandbox buyer account here instead.
                      </p>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          data-testid="paypal-demo-success"
                          disabled={capturing}
                          onClick={() => handleCapture(paypalOrderId)}
                        >
                          {capturing ? 'Processing…' : 'Simulate successful payment'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          data-testid="paypal-demo-fail"
                          disabled={capturing}
                          onClick={() => handlePaymentCancelled('Simulated PayPal decline.')}
                        >
                          Simulate failed payment
                        </button>
                      </div>
                    </div>
                  ) : (
                    <PayPalScriptProvider
                      options={{ clientId: PAYPAL_CLIENT_ID, currency: 'USD', intent: 'capture' }}
                    >
                      <PayPalButtons
                        key={attempt}
                        style={{ layout: 'vertical', label: 'pay' }}
                        forceReRender={[paypalOrderId]}
                        createOrder={async () => paypalOrderId}
                        onApprove={async (data) => {
                          await handleCapture(data.orderID)
                        }}
                        onCancel={async () => {
                          await handlePaymentCancelled('Payment was cancelled before it completed.')
                        }}
                        onError={async () => {
                          await handlePaymentCancelled('PayPal reported an error before the payment could complete.')
                        }}
                      />
                    </PayPalScriptProvider>
                  )
                ) : null}

                <div className="state-block" style={{ marginTop: 20 }}>
                  <h2 style={{ fontSize: 18 }}>Review</h2>
                  <table className="table">
                    <tbody>
                      <tr>
                        <td style={{ width: '40%', color: 'var(--color-neutral-700)' }}>Delivering to</td>
                        <td>
                          {selectedAddress?.line1}, {selectedAddress?.city} {selectedAddress?.pincode}
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
                        <td>PayPal</td>
                      </tr>
                      <tr>
                        <td style={{ color: 'var(--color-neutral-700)' }}>To pay</td>
                        <td className="num">{formatINR(pendingOrder ? Number(pendingOrder.total) : total)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
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
              <span className="v">{formatINR(pendingOrder ? Number(pendingOrder.total) : total)}</span>
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
