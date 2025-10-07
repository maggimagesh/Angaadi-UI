import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '../store/ui'
import { useAuthStore } from '../store/auth'
import { signIn } from '../api/user'
import { setAuthTokenCookie } from '../utils/token'
import LoadingSpinner from './LoadingSpinner'

export function SignInModal() {
  const navigate = useNavigate()
  const { signInModalOpen, signInModalCallback, closeSignInModal } = useUIStore()
  const { login } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(t)
    }
  }, [error])

  const handleSignIn = async () => {
    setError(null)
    const e = email.trim()
    const p = password.trim()

    if (!e || !p) {
      setError('Please enter both email and password')
      return
    }

    setIsLoading(true)
    try {
      const res = await signIn({ emailId: e, password: p })
      if (res.error) {
        setError(res.error.message || 'Invalid email or password')
        return
      }

      const signedInUser = res.user || {}
      const userId: string | undefined = signedInUser.userId || signedInUser.id || signedInUser._id
      const token: string | undefined = res.token || signedInUser.token || signedInUser.jwt || signedInUser.accessToken
      const firstName: string | undefined = signedInUser.firstName
      const lastName: string | undefined = signedInUser.lastName

      if (token) setAuthTokenCookie(token, 7)
      login({ emailId: e, userId, token, firstName, lastName })
      
      closeSignInModal()
      
      // Execute callback if provided (e.g., add to cart after login)
      if (signInModalCallback) {
        signInModalCallback()
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = () => {
    closeSignInModal()
    navigate('/auth')
  }

  if (!signInModalOpen) return null

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signin-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 70,
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeSignInModal()
      }}
    >
      <div
        className="card"
        style={{
          background: 'var(--color-card)',
          color: 'var(--color-text)',
          padding: 0,
          minWidth: 420,
          maxWidth: '90vw',
          position: 'relative',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--elev-3)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            background: 'var(--color-surface)',
            borderBottom: '1px solid var(--color-border)'
          }}
        >
          <h3
            id="signin-modal-title"
            style={{ margin: 0, fontWeight: 800, color: 'var(--color-text)' }}
          >
            Sign In Required
          </h3>
          <button
            aria-label="Close"
            onClick={closeSignInModal}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'var(--color-card)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              cursor: 'pointer',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 24 }}>
          <p style={{ margin: '0 0 20px 0', color: 'var(--color-muted)' }}>
            Please sign in to add items to your cart and access your saved items.
          </p>

          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label className="label" htmlFor="modal-email">Email</label>
              <input
                id="modal-email"
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="label" htmlFor="modal-password">Password</label>
              <input
                id="modal-password"
                className="input"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  disabled={isLoading}
                />
                <span className="label">Show password</span>
              </label>
            </div>

            {error && (
              <div role="alert" style={{ color: 'var(--color-danger)', fontSize: 14 }}>
                {error}
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handleSignIn}
              disabled={isLoading}
              style={{ width: '100%', marginTop: 8 }}
            >
              {isLoading ? <LoadingSpinner size="small" text="Signing in..." /> : 'Sign In'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <span style={{ color: 'var(--color-muted)' }}>Don't have an account? </span>
              <button
                className="btn btn-ghost"
                onClick={handleSignUp}
                disabled={isLoading}
                style={{ padding: 0, textDecoration: 'underline' }}
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
