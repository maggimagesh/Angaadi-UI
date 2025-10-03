import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isStrongPassword } from '../utils/password'
import { useUIStore } from '../store/ui'
import { isLettersOnly } from '../utils/name'
import { createUserRecord, signIn } from '../api/user'
import { setAuthTokenCookie } from '../utils/token'
import { useAuthStore } from '../store/auth'
import LoadingSpinner from '../components/LoadingSpinner'

type AuthTab = 'signin' | 'signup'

export default function AuthPage() {
  const [tab, setTab] = useState<AuthTab>('signin')

  return (
    <main className="app-main">
      <section className="container p-6" aria-label="Authentication">
        <div className="card" style={{display:'grid', gridTemplateColumns:'1fr', gap:16, padding:20, maxWidth:560, margin:'24px auto', width:'100%'}}>
          <div>
            <nav aria-label="Auth tabs" style={{display:'flex', gap:8}}>
              <button
                id="tab-signin"
                data-testid="tab-signin"
                className={`btn ${tab==='signin' ? 'btn-primary' : ''}`}
                role="tab"
                aria-selected={tab==='signin'}
                aria-controls="panel-signin"
                onClick={() => setTab('signin')}
              >
                Sign in
              </button>
              <button
                id="tab-signup"
                data-testid="tab-signup"
                className={`btn ${tab==='signup' ? 'btn-primary' : ''}`}
                role="tab"
                aria-selected={tab==='signup'}
                aria-controls="panel-signup"
                onClick={() => setTab('signup')}
              >
                Sign Up
              </button>
            </nav>

            {tab === 'signin' ? <SignInPanel /> : <SignUpPanel />}
          </div>
        </div>
      </section>
    </main>
  )
}

function SignInPanel() {
  const navigate = useNavigate()
  const openSuccess = useUIStore(s => s.openSuccess)
  const login = useAuthStore(s => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState(false)
  const [passwordError, setPasswordError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const REMEMBER_KEY = 'login.remember'
  const REMEMBER_EMAIL_KEY = 'login.email'
  const REMEMBER_PASSWORD_KEY = 'login.password'

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

  // Load remembered credentials on mount
  useEffect(() => {
    try {
      const rem = localStorage.getItem(REMEMBER_KEY) === 'true'
      if (rem) {
        setEmail(localStorage.getItem(REMEMBER_EMAIL_KEY) || '')
        setPassword(localStorage.getItem(REMEMBER_PASSWORD_KEY) || '')
        setRemember(true)
      }
    } catch {}
  }, [])

  // Persist or clear remembered credentials
  useEffect(() => {
    try {
      if (remember) {
        localStorage.setItem(REMEMBER_KEY, 'true')
        localStorage.setItem(REMEMBER_EMAIL_KEY, email)
        localStorage.setItem(REMEMBER_PASSWORD_KEY, password)
      } else {
        localStorage.removeItem(REMEMBER_KEY)
        localStorage.removeItem(REMEMBER_EMAIL_KEY)
        localStorage.removeItem(REMEMBER_PASSWORD_KEY)
      }
    } catch {}
  }, [remember, email, password])

  const demos = [
    { email: 'standard.user@demo.in', password: 'Password123!' },
    { email: 'locked.user@demo.in', password: 'Password123!' },
    { email: 'problem.user@demo.in', password: 'Password123!' },
  ]
  return (
    <section id="panel-signin" role="tabpanel" aria-labelledby="tab-signin" className="mt-4">
      <div style={{display:'grid', gap:8}}>
        <label className="label" htmlFor="login-email">Email</label>
        <input id="login-email" data-testid="login-email" data-test-name="login-email" className="input" type="email" placeholder="you@example.com" aria-label="Email" value={email} onChange={(e)=>setEmail(e.target.value)} aria-invalid={emailError}
        />

        <label className="label mt-4" htmlFor="login-password">Password</label>
        <input id="login-password" data-testid="login-password" data-test-name="login-password" className="input" type={showPassword ? 'text' : 'password'} placeholder="••••••••" aria-label="Password" value={password} onChange={(e)=>setPassword(e.target.value)} aria-invalid={passwordError}
        />
        <label className="mt-2" style={{display:'inline-flex', alignItems:'center', gap:8}}>
          <input id="login-show-password" data-testid="login-show-password" type="checkbox" aria-checked={showPassword} checked={showPassword} onChange={(e)=>setShowPassword(e.target.checked)} />
          <span className="label">Show password</span>
        </label>

        {error && (
          <div id="login-error" data-testid="login-error" role="alert" style={{color:'var(--color-danger)'}} className="mt-2">{error}</div>
        )}

        <div className="mt-4" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <label style={{display:'inline-flex', alignItems:'center', gap:8}}>
            <input id="login-remember" data-testid="login-remember" data-test-name="login-remember" type="checkbox" aria-checked={remember} checked={remember} onChange={(e)=>setRemember(e.target.checked)} />
            <span className="label">Remember me</span>
          </label>
          <button className="btn btn-ghost" id="login-forgot" data-testid="login-forgot" data-test-name="login-forgot">Forgot password?</button>
        </div>

        <button
          className="btn btn-primary mt-4"
          id="login-submit"
          data-testid="login-submit"
          data-test-name="login-submit"
          aria-label="Sign in"
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
                openSuccess('Login successful')
                setTimeout(() => { navigate('/') }, 2100)
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

        <div className="mt-6" role="separator" style={{height:1, background:'var(--color-border)'}} />

        <div className="mt-4" style={{display:'grid', gap:8}}>
          <button className="btn" id="oauth-google" data-testid="oauth-google" data-test-name="oauth-google" aria-label="Sign in with Google">Continue with Google</button>
          <button className="btn" id="oauth-apple" data-testid="oauth-apple" data-test-name="oauth-apple" aria-label="Sign in with Apple">Continue with Apple</button>
        </div>

        <div className="mt-6 card p-4" id="demo-credentials" data-testid="demo-credentials" aria-label="Demo login credentials">
          <h3 className="mb-4">Use these demo accounts</h3>
          <ul role="list" style={{display:'grid', gap:8}}>
            {demos.map((d, idx) => (
              <li key={idx} className="surface" style={{border:'1px solid var(--color-border)', borderRadius:'var(--radius-md)', padding:12, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                  <div id={`demo-cred-email-${idx}`} data-testid={`demo-cred-email-${idx}`}>{d.email}</div>
                  <div id={`demo-cred-password-${idx}`} data-testid={`demo-cred-password-${idx}`} style={{color:'var(--color-muted)'}}>Password: {d.password}</div>
                </div>
                <button
                  className="btn"
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
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="visually-hidden" role="status" aria-live="polite" id="login-status" data-testid="login-status" />
    </section>
  )
}

function SignUpPanel() {
  const openSuccess = useUIStore(s => s.openSuccess)
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
    <section id="panel-signup" role="tabpanel" aria-labelledby="tab-signup" className="mt-4">
      <div style={{display:'grid', gap:8}}>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
          <div>
            <label className="label" htmlFor="signup-firstname">First name</label>
            <input id="signup-firstname" data-testid="signup-firstname" data-test-name="signup-firstname" className="input" type="text" placeholder="First name" aria-label="First name" value={firstName} onChange={(e)=>setFirstName(e.target.value)} aria-invalid={firstNameError} />
            {firstNameError && (
              <div id="signup-firstname-error" data-testid="signup-firstname-error" role="alert" style={{color:'var(--color-danger)', marginTop:4}}>Enter a valid first name (letters only)</div>
            )}
          </div>
          <div>
            <label className="label" htmlFor="signup-lastname">Last name</label>
            <input id="signup-lastname" data-testid="signup-lastname" data-test-name="signup-lastname" className="input" type="text" placeholder="Last name" aria-label="Last name" value={lastName} onChange={(e)=>setLastName(e.target.value)} aria-invalid={lastNameError} />
            {lastNameError && (
              <div id="signup-lastname-error" data-testid="signup-lastname-error" role="alert" style={{color:'var(--color-danger)', marginTop:4}}>Enter a valid last name (letters only)</div>
            )}
          </div>
        </div>

        <label className="label mt-4" htmlFor="signup-email">Email</label>
        <input id="signup-email" data-testid="signup-email" data-test-name="signup-email" className="input" type="email" placeholder="you@example.com" aria-label="Email" value={email} onChange={(e)=>setEmail(e.target.value)} aria-invalid={emailError} />
        {emailError && (
          <div id="signup-email-error" data-testid="signup-email-error" role="alert" style={{color:'var(--color-danger)', marginTop:4}}>Enter email id</div>
        )}

        <label className="label mt-4" htmlFor="signup-password">Password</label>
        <input id="signup-password" data-testid="signup-password" data-test-name="signup-password" className="input" type={showPasswords ? 'text' : 'password'} placeholder="Create a password" aria-label="Password" value={password} onChange={(e)=>setPassword(e.target.value)} aria-invalid={passwordError || (!!error && error.includes('Password'))} />
        {passwordError && (
          <div id="signup-password-missing" data-testid="signup-password-missing" role="alert" style={{color:'var(--color-danger)', marginTop:4}}>Enter password</div>
        )}

        <label className="label mt-4" htmlFor="signup-confirm">Confirm password</label>
        <input id="signup-confirm" data-testid="signup-confirm" data-test-name="signup-confirm" className="input" type={showPasswords ? 'text' : 'password'} placeholder="Confirm password" aria-label="Confirm password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} aria-invalid={confirmError} />
        <label className="mt-2" style={{display:'inline-flex', alignItems:'center', gap:8}}>
          <input id="signup-show-passwords" data-testid="signup-show-passwords" type="checkbox" aria-checked={showPasswords} checked={showPasswords} onChange={(e)=>setShowPasswords(e.target.checked)} />
          <span className="label">Show password</span>
        </label>
        {confirmError && (
          <div id="signup-confirm-missing" data-testid="signup-confirm-missing" role="alert" style={{color:'var(--color-danger)', marginTop:4}}>Enter confirm password</div>
        )}

        <label className="mt-4" style={{display:'inline-flex', alignItems:'center', gap:8}}>
          <input id="signup-terms" data-testid="signup-terms" data-test-name="signup-terms" type="checkbox" aria-checked={accepted} checked={accepted} onChange={(e)=>setAccepted(e.target.checked)} />
          <span className="label">I agree to the </span>
          <button type="button" className="btn btn-ghost" id="link-terms" data-testid="link-terms" onClick={() => openDoc('Terms & Conditions', TERMS_BODY)}>Terms</button>
          <span className="label"> and </span>
          <button type="button" className="btn btn-ghost" id="link-privacy" data-testid="link-privacy" onClick={() => openDoc('Privacy Policy', PRIVACY_BODY)}>Privacy Policy</button>
        </label>

        {error && (
          <div id="signup-error" data-testid="signup-error" role="alert" style={{color:'var(--color-danger)'}} className="mt-2">{error}</div>
        )}

        <button
          className="btn btn-primary mt-4"
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
                openSuccess('Account created successfully')
                setTimeout(() => { window.location.href = '/' }, 2100)
              } catch (error) {
                setError('An unexpected error occurred. Please try again.')
              } finally {
                setIsLoading(false);
              }
            })()
          }}
        >
          {isLoading ? <LoadingSpinner size="small" text="Creating account..." /> : 'Sign Up'}
        </button>

        {/* Success feedback removed per requirement (navigate directly) */}
      </div>
      <div className="visually-hidden" role="status" aria-live="polite" id="signup-status" data-testid="signup-status" />
    </section>
  )
}

const TERMS_BODY = `
<p>Welcome to Angaadi.com. By creating an account you agree to the following sample terms intended for automation testing:</p>
<ol>
  <li><strong>Account Responsibility</strong>: You are responsible for maintaining the confidentiality of your credentials.</li>
  <li><strong>Acceptable Use</strong>: Do not attempt to disrupt services; automated tests are permitted in this demo.</li>
  <li><strong>Orders</strong>: All orders in this demo are mock and non-binding.</li>
  <li><strong>Content</strong>: Product information is sample data and may be inaccurate.</li>
  <li><strong>Termination</strong>: We may revoke access at any time for abuse.</li>
  <li><strong>Governing Law</strong>: Sample clause for testing only.</li>
  <li><strong>Contact</strong>: demo@angaadi.com.</li>
  <li><strong>Updates</strong>: Terms may change; continued use indicates acceptance.</li>
</ol>
`

const PRIVACY_BODY = `
<p>This demo collects mock information to showcase testing flows.</p>
<ul>
  <li><strong>Data Collected</strong>: Name, email (entered by you). No real payments are processed.</li>
  <li><strong>Usage</strong>: Data is used to simulate checkout and order history.</li>
  <li><strong>Cookies</strong>: We use local storage/cookies for session simulation.</li>
  <li><strong>Sharing</strong>: No third-party sharing in this demo.</li>
  <li><strong>Security</strong>: Basic safeguards; do not enter real sensitive data.</li>
  <li><strong>Retention</strong>: Data may be reset by the Admin Seed page.</li>
  <li><strong>Your Rights</strong>: You may delete your mock profile at any time (not implemented here).</li>
</ul>
`


