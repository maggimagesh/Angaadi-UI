import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { isStrongPassword } from '../utils/password'
import { useUIStore } from '../store/ui'
import { isLettersOnly } from '../utils/name'
import { createUserRecord, signIn } from '../api/user'
import { setAuthTokenCookie } from '../utils/token'
import { useAuthStore } from '../store/auth'
import { clearAuthRedirect, getAuthRedirect, rememberAuthRedirect } from '../utils/authRedirect'
import { supabase } from '../lib/supabase'
import LoadingSpinner from '../components/LoadingSpinner'
import { Footer } from '../components/Footer'

type AuthTab = 'signin' | 'signup'

/**
 * Errors render as a 2px accent-bordered block above the form: an 11px
 * uppercase label naming what failed, then the message in accent-700.
 */
function AuthError({ label, message, id, testId }: { label: string; message: string; id?: string; testId?: string }) {
  return (
    <div className="auth-error" role="alert" id={id} data-testid={testId}>
      <div className="auth-error-label">{label}</div>
      <div className="auth-error-body">{message}</div>
    </div>
  )
}

export default function AuthPage() {
  const [tab, setTab] = useState<AuthTab>('signin')

  return (
    <main className="app-main">
      <section className="auth-page" aria-label="Authentication">
        <div className="auth-column">
          <Link to="/" className="auth-logo" aria-label="Angaadi Home">
            angaadi<span>.in</span>
          </Link>

          <div className="auth-card">
          <nav aria-label="Auth tabs" className="auth-tabs" role="tablist">
            <button
              id="tab-signin"
              data-testid="tab-signin"
              className="auth-tab"
              role="tab"
              aria-selected={tab === 'signin'}
              aria-controls="panel-signin"
              onClick={() => setTab('signin')}
            >
              Sign in
            </button>
            <button
              id="tab-signup"
              data-testid="tab-signup"
              className="auth-tab"
              role="tab"
              aria-selected={tab === 'signup'}
              aria-controls="panel-signup"
              onClick={() => setTab('signup')}
            >
              Create account
            </button>
          </nav>

          {tab === 'signin' ? (
            <SignInPanel onSwitch={() => setTab('signup')} />
          ) : (
            <SignUpPanel onSwitch={() => setTab('signin')} />
          )}
          </div>

          <div className="auth-divider">
            {tab === 'signin' ? 'New to Angaadi?' : 'Already shopping with us?'}
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-block"
            id="auth-switch"
            data-testid="auth-switch"
            onClick={() => setTab(tab === 'signin' ? 'signup' : 'signin')}
          >
            {tab === 'signin' ? 'Create your Angaadi account' : 'Sign in to your account'}
          </button>

          <p className="auth-fine">
            By continuing, you agree to Angaadi&rsquo;s{' '}
            <Link to="/crawlableDocuments">Conditions of Use</Link> and{' '}
            <Link to="/crawlableDocuments">Privacy Notice</Link>.
          </p>
        </div>
      </section>
      <Footer />
    </main>
  )
}

function SignInPanel({ onSwitch }: { onSwitch: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const openSuccessWithDuration = useUIStore(s => s.openSuccessWithDuration)
  const openForgotPassword = useUIStore(s => s.openForgotPassword)
  const login = useAuthStore(s => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState(false)
  const [passwordError, setPasswordError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const REMEMBER_KEY = 'login.remember'
  const REMEMBER_EMAIL_KEY = 'login.email'
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => {
        setError(null)
        setEmailError(false)
        setPasswordError(false)
        const statusEl = document.getElementById('login-status')
        if (statusEl) statusEl.textContent = ''
      }, 5000)
      return () => clearTimeout(t)
    }
  }, [error])

  // Load remembered email only (never store passwords)
  useEffect(() => {
    try {
      // SECURITY: Clean up any old password data that might exist
      localStorage.removeItem('login.password')
      
      const rem = localStorage.getItem(REMEMBER_KEY) === 'true'
      if (rem) {
        setEmail(localStorage.getItem(REMEMBER_EMAIL_KEY) || '')
        setRemember(true)
      }
    } catch {}
  }, [])

  // Persist or clear remembered email only (SECURITY: never store passwords)
  useEffect(() => {
    try {
      if (remember && email) {
        localStorage.setItem(REMEMBER_KEY, 'true')
        localStorage.setItem(REMEMBER_EMAIL_KEY, email)
      } else {
        localStorage.removeItem(REMEMBER_KEY)
        localStorage.removeItem(REMEMBER_EMAIL_KEY)
      }
    } catch {}
  }, [remember, email])

  const completeSignInNavigation = () => {
    const redirectTo = getAuthRedirect(location.search, location.state)
    clearAuthRedirect()
    openSuccessWithDuration(
      redirectTo === '/profile' ? 'Signed in. Opening Profile & fit.' : 'Login successful',
      2000
    )
    setTimeout(() => {
      navigate(redirectTo, { replace: true })
    }, 2100)
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    setError(null)
    const redirectTo = getAuthRedirect(location.search, location.state)
    rememberAuthRedirect(redirectTo)
    
    try {
      // Try popup first, fallback to redirect if blocked
      const popup = window.open(
        '',
        'google-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      )
      
      if (!popup) {
        // Popup blocked, use redirect approach
        console.log('Popup blocked, using redirect approach')
        const redirectUrl = `${window.location.origin}/oauth-callback`
        console.log('OAuth redirect URL (fallback):', redirectUrl)
        
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl
          }
        })
        
        if (error) {
          throw error
        }
        
        if (data.url) {
          window.location.href = data.url
        }
        return
      }
      
      // Get OAuth URL for popup
      const redirectUrl = `${window.location.origin}/oauth-callback`
      console.log('OAuth redirect URL:', redirectUrl)
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true
        }
      })
      
      if (error) {
        popup.close()
        throw error
      }
      
      if (data.url) {
        // Navigate popup to OAuth URL
        popup.location.href = data.url
        
        // Set up message listener
        const messageListener = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return
          
          console.log('Received message:', event.data)
          
          if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
            // Force close popup with multiple methods
            try {
              popup.close()
              // Additional attempts to ensure popup closes
              setTimeout(() => {
                if (!popup.closed) {
                  console.log('Popup still open, forcing close')
                  popup.close()
                  // Try to navigate popup to blank page
                  try {
                    popup.location.href = 'about:blank'
                  } catch (e) {
                    console.log('Could not navigate popup:', e)
                  }
                }
              }, 100)
            } catch (e) {
              console.log('Error closing popup from parent:', e)
            }
            
            window.removeEventListener('message', messageListener)
            setIsGoogleLoading(false)
            
            // Handle the authentication directly in the parent window
            const userData = event.data.user
            if (userData) {
              console.log('Logging in user:', userData)
              login(userData)
              completeSignInNavigation()
            } else {
              console.log('No user data, redirecting to callback')
              window.location.href = '/oauth-callback'
            }
          } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
            // Force close popup with multiple methods
            try {
              popup.close()
              // Additional attempts to ensure popup closes
              setTimeout(() => {
                if (!popup.closed) {
                  console.log('Popup still open (error), forcing close')
                  popup.close()
                  // Try to navigate popup to blank page
                  try {
                    popup.location.href = 'about:blank'
                  } catch (e) {
                    console.log('Could not navigate popup (error):', e)
                  }
                }
              }, 100)
            } catch (e) {
              console.log('Error closing popup from parent (error):', e)
            }
            
            window.removeEventListener('message', messageListener)
            setIsGoogleLoading(false)
            setError(event.data.error || 'Google authentication failed')
          }
        }
        
        // Set up popup monitoring with more aggressive checking
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed)
            clearTimeout(timeout)
            window.removeEventListener('message', messageListener)
            setIsGoogleLoading(false)
            
            // Check if we have a session after popup closes
            supabase.auth.getSession().then(({ data: { session } }) => {
              if (session) {
                console.log('Session found after popup closed, redirecting to callback')
                window.location.href = '/oauth-callback'
              } else {
                console.log('No session found after popup closed')
              }
            })
          } else {
            // Additional check: if popup is still open after 30 seconds, try to close it
            const popupAge = Date.now() - popupStartTime
            if (popupAge > 30000) { // 30 seconds
              console.log('Popup has been open too long, attempting to close')
              try {
                popup.close()
                // If still open, try to navigate to blank page
                setTimeout(() => {
                  if (!popup.closed) {
                    try {
                      popup.location.href = 'about:blank'
                    } catch (e) {
                      console.log('Could not navigate popup to blank page:', e)
                    }
                  }
                }, 100)
              } catch (e) {
                console.log('Could not close old popup:', e)
              }
            }
          }
        }, 1000)
        
        const popupStartTime = Date.now()
        
        // Set timeout
        const timeout = setTimeout(() => {
          if (!popup.closed) {
            popup.close()
            clearInterval(checkClosed)
            window.removeEventListener('message', messageListener)
            setIsGoogleLoading(false)
            setError('Authentication timed out. Please try again.')
          }
        }, 300000) // 5 minutes
        
        window.addEventListener('message', messageListener)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
      setIsGoogleLoading(false)
    }
  }

  const demos = [
    { email: 'standard.user@demo.in', password: 'Password123!' },
    { email: 'locked.user@demo.in', password: 'Password123!' },
    { email: 'problem.user@demo.in', password: 'Password123!' },
  ]
  return (
    <section id="panel-signin" role="tabpanel" aria-labelledby="tab-signin">
      <h1>Sign in</h1>
      <p className="auth-lede">Your cart and wishlist follow you across devices.</p>

      {error && (
        <AuthError label="Sign in failed" message={error} id="login-error" testId="login-error" />
      )}

      <div className="auth-stack">
        <div className="field">
          <label className="field-label" htmlFor="login-email">Email</label>
          <input id="login-email" data-testid="login-email" data-test-name="login-email" className={`input${emailError ? ' has-error' : ''}`} type="email" placeholder="you@example.com" aria-label="Email" value={email} onChange={(e)=>setEmail(e.target.value)} aria-invalid={emailError}
          />
        </div>

        <div className="field">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
            <label className="field-label" htmlFor="login-password">Password</label>
            <button
              className="linkish"
              id="login-forgot"
              data-testid="login-forgot"
              data-test-name="login-forgot"
              onClick={openForgotPassword}
            >
              Forgot?
            </button>
          </div>
          <input id="login-password" data-testid="login-password" data-test-name="login-password" className={`input${passwordError ? ' has-error' : ''}`} type={showPassword ? 'text' : 'password'} placeholder="At least 8 characters" aria-label="Password" value={password} onChange={(e)=>setPassword(e.target.value)} aria-invalid={passwordError}
          />
        </div>

        <label className="check-row">
          <input id="login-show-password" data-testid="login-show-password" type="checkbox" aria-checked={showPassword} checked={showPassword} onChange={(e)=>setShowPassword(e.target.checked)} />
          <span>Show password</span>
        </label>

        <label className="check-row">
          <input id="login-remember" data-testid="login-remember" data-test-name="login-remember" type="checkbox" aria-checked={remember} checked={remember} onChange={(e)=>setRemember(e.target.checked)} />
          <span>Keep me signed in</span>
        </label>

        <button
          className="btn btn-primary btn-block"
          id="login-submit"
          data-testid="login-submit"
          data-test-name="login-submit"
          aria-label="Sign In"
          disabled={isLoading}
          onClick={() => {
            setError(null)
            setEmailError(false)
            setPasswordError(false)
            const statusEl = document.getElementById('login-status')
            const e = email.trim()
            const p = password.trim()

            if (!e && !p) {
              setEmailError(true)
              setPasswordError(true)
              setError('Enter email id and password')
              if (statusEl) statusEl.textContent = 'Enter email id and password'
              return
            }
            if (!e) {
              setEmailError(true)
              setError('Enter email id')
              if (statusEl) statusEl.textContent = 'Enter email id'
              return
            }
            if (!p) {
              setPasswordError(true)
              setError('Enter password')
              if (statusEl) statusEl.textContent = 'Enter password'
              return
            }

            ;(async () => {
              setIsLoading(true);
              try {
                const res = await signIn({ emailId: e, password: p })
                if (res.error) {
                  setPasswordError(true)
                  setError(res.error.message || 'Invalid email or password')
                  if (statusEl) statusEl.textContent = res.error.message || 'Invalid email or password'
                  return
                }
                if (statusEl) statusEl.textContent = ''
                const signedInUser = res.user || {}
                const userId: string | undefined = signedInUser.userId || signedInUser.id || signedInUser._id
                const token: string | undefined = res.token || signedInUser.token || signedInUser.jwt || signedInUser.accessToken
                const firstName: string | undefined = signedInUser.firstName
                const lastName: string | undefined = signedInUser.lastName
                if (token) setAuthTokenCookie(token, 7)
                login({ emailId: e, userId, token, firstName, lastName })
                completeSignInNavigation()
              } catch (error) {
                setError('An unexpected error occurred. Please try again.')
                if (statusEl) statusEl.textContent = 'An unexpected error occurred. Please try again.'
              } finally {
                setIsLoading(false);
              }
            })()
          }}
        >
          {isLoading ? <LoadingSpinner size="small" text="Signing in..." /> : 'Sign in'}
        </button>

        <button
          className="btn btn-secondary btn-block"
          style={{ justifyContent: 'center', marginTop: 0 }}
          id="oauth-google"
          data-testid="oauth-google"
          data-test-name="oauth-google"
          aria-label="Sign In with Google"
          disabled={isGoogleLoading}
          onClick={handleGoogleSignIn}
        >
          {isGoogleLoading ? <LoadingSpinner size="small" text="Signing in..." /> : 'Continue with Google'}
        </button>
      </div>

      <hr className="hr" style={{ margin: '22px 0' }} />

      <div style={{ fontSize: 14 }}>
        New here?{' '}
        <button type="button" className="linkish" onClick={onSwitch}>
          Create an account
        </button>
      </div>

      <div className="demo-block" id="demo-credentials" data-testid="demo-credentials" aria-label="Demo login credentials">
        <div className="demo-row">
          <span className="kicker">Demo accounts</span>
        </div>
        {demos.map((d, idx) => (
          <div key={idx} className="demo-row">
            <div>
              <div id={`demo-cred-email-${idx}`} data-testid={`demo-cred-email-${idx}`}>{d.email}</div>
              <div id={`demo-cred-password-${idx}`} data-testid={`demo-cred-password-${idx}`} style={{color:'var(--color-neutral-700)'}}>Password: {d.password}</div>
            </div>
            <button
              className="btn btn-secondary"
              id={`demo-cred-fill-${idx}`}
              data-testid={`demo-cred-fill-${idx}`}
              aria-label={`Fill ${d.email}`}
              onClick={() => {
                setEmail(d.email)
                setPassword(d.password)
                setRemember(true)
                setError(null)
                setEmailError(false)
                setPasswordError(false)
              }}
            >
              Fill
            </button>
          </div>
        ))}
      </div>

      <div className="visually-hidden" role="status" aria-live="polite" id="login-status" data-testid="login-status" />
    </section>
  )
}

function SignUpPanel({ onSwitch }: { onSwitch: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const openSuccessWithDuration = useUIStore(s => s.openSuccessWithDuration)
  const openDoc = useUIStore(s => s.openDoc)
  const login = useAuthStore(s => s.login)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, setSuccess] = useState(false) // state retained for potential future UX; value not read
  const [firstNameError, setFirstNameError] = useState(false)
  const [lastNameError, setLastNameError] = useState(false)
  const [emailError, setEmailError] = useState(false)
  const [passwordError, setPasswordError] = useState(false)
  const [confirmError, setConfirmError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const statusEl = document.getElementById('signup-status')
    if (statusEl) statusEl.textContent = error ?? ''
    if (error) {
      const t = setTimeout(() => {
        setError(null)
        const s = document.getElementById('signup-status')
        if (s) s.textContent = ''
        setFirstNameError(false)
        setLastNameError(false)
        setEmailError(false)
        setPasswordError(false)
        setConfirmError(false)
      }, 5000)
      return () => clearTimeout(t)
    }
  }, [error])

  // Presentational only — submission still gates on isStrongPassword().
  const passwordStrength = [
    password.length >= 8,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length

  const strengthNote = !password
    ? 'Eight characters, mixed case, a number and a symbol.'
    : ['Too short.', 'Weak — add mixed case.', 'Fair — add a number.', 'Good — add a symbol.', 'Strong.'][
        passwordStrength
      ]

  // Auto-dismiss inline field errors even when no top-level error is set
  useEffect(() => {
    if (firstNameError || lastNameError || emailError || passwordError || confirmError) {
      const t = setTimeout(() => {
        setFirstNameError(false)
        setLastNameError(false)
        setEmailError(false)
        setPasswordError(false)
        setConfirmError(false)
      }, 5000)
      return () => clearTimeout(t)
    }
  }, [firstNameError, lastNameError, emailError, passwordError, confirmError])
  return (
    <section id="panel-signup" role="tabpanel" aria-labelledby="tab-signup">
      <h1>Create your account</h1>
      <p className="auth-lede">Two minutes now, and your cart follows you everywhere after.</p>

      {error && (
        <AuthError label="Check the form" message={error} id="signup-error" testId="signup-error" />
      )}

      <div className="auth-stack">
        <div className="field-grid">
          <div className="field">
            <label className="field-label" htmlFor="signup-firstname">First name</label>
            <input id="signup-firstname" data-testid="signup-firstname" data-test-name="signup-firstname" className={`input${firstNameError ? ' has-error' : ''}`} type="text" placeholder="Anand" aria-label="First name" value={firstName} onChange={(e)=>setFirstName(e.target.value)} aria-invalid={firstNameError} />
            {firstNameError && (
              <div id="signup-firstname-error" data-testid="signup-firstname-error" role="alert" className="field-error">Enter a valid first name (letters only)</div>
            )}
          </div>
          <div className="field">
            <label className="field-label" htmlFor="signup-lastname">Last name</label>
            <input id="signup-lastname" data-testid="signup-lastname" data-test-name="signup-lastname" className={`input${lastNameError ? ' has-error' : ''}`} type="text" placeholder="Prakash" aria-label="Last name" value={lastName} onChange={(e)=>setLastName(e.target.value)} aria-invalid={lastNameError} />
            {lastNameError && (
              <div id="signup-lastname-error" data-testid="signup-lastname-error" role="alert" className="field-error">Enter a valid last name (letters only)</div>
            )}
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="signup-email">Email</label>
          <input id="signup-email" data-testid="signup-email" data-test-name="signup-email" className={`input${emailError ? ' has-error' : ''}`} type="email" placeholder="you@example.com" aria-label="Email" value={email} onChange={(e)=>setEmail(e.target.value)} aria-invalid={emailError} />
          {emailError && (
            <div id="signup-email-error" data-testid="signup-email-error" role="alert" className="field-error">Enter email id</div>
          )}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="signup-password">Password</label>
          <input id="signup-password" data-testid="signup-password" data-test-name="signup-password" className={`input${passwordError ? ' has-error' : ''}`} type={showPasswords ? 'text' : 'password'} placeholder="At least 8 characters" aria-label="Password" value={password} onChange={(e)=>setPassword(e.target.value)} aria-invalid={passwordError || (!!error && error.includes('Password'))} />
          <div className="strength-meter" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <i key={i} className={i < passwordStrength ? 'on' : ''} />
            ))}
          </div>
          <div className="strength-note">{strengthNote}</div>
          {passwordError && (
            <div id="signup-password-missing" data-testid="signup-password-missing" role="alert" className="field-error">Enter password</div>
          )}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="signup-confirm">Confirm password</label>
          <input id="signup-confirm" data-testid="signup-confirm" data-test-name="signup-confirm" className={`input${confirmError ? ' has-error' : ''}`} type={showPasswords ? 'text' : 'password'} placeholder="Type it again" aria-label="Confirm password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} aria-invalid={confirmError} />
          {confirmError && (
            <div id="signup-confirm-missing" data-testid="signup-confirm-missing" role="alert" className="field-error">Enter confirm password</div>
          )}
        </div>

        <label className="check-row">
          <input id="signup-show-passwords" data-testid="signup-show-passwords" type="checkbox" aria-checked={showPasswords} checked={showPasswords} onChange={(e)=>setShowPasswords(e.target.checked)} />
          <span>Show password</span>
        </label>

        <label className="check-row is-block">
          <input id="signup-terms" data-testid="signup-terms" data-test-name="signup-terms" type="checkbox" aria-checked={accepted} checked={accepted} onChange={(e)=>setAccepted(e.target.checked)} />
          <span>
            I agree to the{' '}
            <button type="button" className="linkish" id="link-terms" data-testid="link-terms" onClick={() => openDoc('Terms & Conditions', TERMS_BODY)}>terms of sale</button>
            {' '}and the{' '}
            <button type="button" className="linkish" id="link-privacy" data-testid="link-privacy" onClick={() => openDoc('Privacy Policy', PRIVACY_BODY)}>privacy notice</button>.
          </span>
        </label>

        <button
          className="btn btn-primary btn-block"
          id="signup-submit"
          data-testid="signup-submit"
          data-test-name="signup-submit"
          aria-label="Sign Up"
          disabled={isLoading}
          onClick={() => {
            setError(null)
            setFirstNameError(false)
            setLastNameError(false)
            setEmailError(false)
            setPasswordError(false)
            setConfirmError(false)
            const firstMissing = !firstName || !isLettersOnly(firstName)
            const lastMissing = !lastName || !isLettersOnly(lastName)
            const emailMissing = !email
            const passMissing = !password
            const confirmMissing = !confirm
            const allEmpty = !firstName && !lastName && !email && !password && !confirm

            if (allEmpty) {
              setFirstNameError(true)
              setLastNameError(true)
              setEmailError(true)
              setPasswordError(true)
              setConfirmError(true)
              setError('Fill all fields')
              return
            }

            if (firstMissing) setFirstNameError(true)
            if (lastMissing) setLastNameError(true)
            if (emailMissing) setEmailError(true)
            if (passMissing) setPasswordError(true)
            if (confirmMissing) setConfirmError(true)
            if (firstMissing || lastMissing || emailMissing || passMissing || confirmMissing) {
              return
            }
            if (!isStrongPassword(password)) {
              setError('Password too weak')
              return
            }
            if (password !== confirm) {
              setError('Passwords do not match')
              return
            }
            if (!accepted) {
              setError('Accept terms to continue')
              return
            }
            ;(async () => {
              setIsLoading(true);
              try {
                const res = await createUserRecord({
                  firstName,
                  lastName,
                  emailId: email,
                  password,
                })
                if (res.error) {
                  setError(res.error.message)
                  return
                }
                const s = document.getElementById('signup-status')
                if (s) s.textContent = ''
                setSuccess(true)
                login({ emailId: email, firstName, lastName })
                const redirectTo = getAuthRedirect(location.search, location.state)
                clearAuthRedirect()
                openSuccessWithDuration(
                  redirectTo === '/profile'
                    ? 'Account created. Opening Profile & fit.'
                    : 'Account created successfully',
                  2000
                )
                setTimeout(() => {
                  navigate(redirectTo, { replace: true })
                }, 2100)
              } catch (error) {
                setError('An unexpected error occurred. Please try again.')
              } finally {
                setIsLoading(false);
              }
            })()
          }}
        >
          {isLoading ? <LoadingSpinner size="small" text="Creating account..." /> : 'Create account'}
        </button>
      </div>

      <hr className="hr" style={{ margin: '22px 0' }} />

      <div style={{ fontSize: 14 }}>
        Already registered?{' '}
        <button type="button" className="linkish" onClick={onSwitch}>
          Sign in
        </button>
      </div>

      <div className="visually-hidden" role="status" aria-live="polite" id="signup-status" data-testid="signup-status" />
    </section>
  )
}

const TERMS_BODY = `
<p>Welcome to Angaadi. By creating an account you agree to the following terms and conditions:</p>
<ol>
  <li><strong>Account Responsibility</strong>: You are responsible for maintaining the confidentiality of your credentials and all activities under your account.</li>
  <li><strong>Acceptable Use</strong>: You agree to use our services only for lawful purposes and in accordance with these terms.</li>
  <li><strong>Orders</strong>: All orders are subject to availability and confirmation of the order price. Once placed, orders cannot be cancelled.</li>
  <li><strong>Content</strong>: Product descriptions, images, and specifications are provided by sellers and manufacturers. We strive for accuracy but cannot guarantee complete precision.</li>
  <li><strong>Termination</strong>: We reserve the right to suspend or terminate accounts that violate our terms of service.</li>
  <li><strong>Governing Law</strong>: These terms are governed by the laws of India and subject to the jurisdiction of Indian courts.</li>
  <li><strong>Contact</strong>: For support or queries, reach us at support@angaadi.com.</li>
  <li><strong>Updates</strong>: Terms may be updated periodically; continued use of our services indicates acceptance of any changes.</li>
</ol>
`

const PRIVACY_BODY = `
<p>At Angaadi, we value your privacy and are committed to protecting your personal information.</p>
<ul>
  <li><strong>Data Collected</strong>: We collect your name, email address, shipping address, and payment information to process orders and provide customer support.</li>
  <li><strong>Usage</strong>: Your data is used to process orders, manage your account, send order updates, and improve our services.</li>
  <li><strong>Cookies</strong>: We use cookies and local storage to maintain your session, remember preferences, and enhance your shopping experience.</li>
  <li><strong>Sharing</strong>: We do not sell your personal information. Data may be shared with payment processors and delivery partners solely to fulfill orders.</li>
  <li><strong>Security</strong>: We implement industry-standard security measures to protect your data, including encryption and secure servers.</li>
  <li><strong>Retention</strong>: Your data is retained as long as your account is active or as needed to provide services and comply with legal obligations.</li>
  <li><strong>Your Rights</strong>: You can access, update, or delete your personal information by contacting our support team or through your account settings.</li>
</ul>
`
