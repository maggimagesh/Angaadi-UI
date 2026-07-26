import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { useUIStore } from '../store/ui'
import { setAuthTokenCookie } from '../utils/token'
import { consumeAuthRedirect, loginPathWithRedirect, readAuthRedirect } from '../utils/authRedirect'
import { buildApiUrl } from '../lib/api'
import LoadingSpinner from '../components/LoadingSpinner'

export default function OAuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [redirectTargetLabel, setRedirectTargetLabel] = useState('home page')
  const navigate = useNavigate()
  const login = useAuthStore(s => s.login)
  const openSuccessWithDuration = useUIStore(s => s.openSuccessWithDuration)

  useEffect(() => {
    const handleOAuthCallback = async () => {
      console.log('OAuth callback started')
      console.log('Is popup:', !!window.opener)
      
      try {
        // Wait a bit for Supabase to process the auth
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const { data, error } = await supabase.auth.getSession()
        
        console.log('Session data:', data)
        console.log('Session error:', error)
        
        if (error) {
          throw error
        }

        if (data.session) {
          const { user, access_token } = data.session
          
          console.log('User data:', user)
          
          if (!user || !user.email) {
            throw new Error('Invalid user session')
          }
          
          const response = await fetch(buildApiUrl('/users/oauth-signin'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              supabaseUserId: user.id,
              email: user.email,
              firstName: user.user_metadata?.first_name || user.user_metadata?.full_name?.split(' ')[0] || '',
              lastName: user.user_metadata?.last_name || user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
              accessToken: access_token,
              avatarUrl: user.user_metadata?.avatar_url || '',
              provider: 'google'
            })
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.message || 'OAuth sign-in failed')
          }

          const result = await response.json()
          
          const userData = {
            emailId: user.email || '',
            userId: result.user?.userId || result.user?.id || user.id,
            token: access_token,
            firstName: result.user?.firstName || user.user_metadata?.first_name || '',
            lastName: result.user?.lastName || user.user_metadata?.last_name || ''
          }

          console.log('Final user data:', userData)

          setAuthTokenCookie(access_token, 7)
          login(userData)
          setStatus('success')
          
          if (window.opener) {
            console.log('Sending success message to parent')
            // Send success message to parent window
            window.opener.postMessage({
              type: 'GOOGLE_AUTH_SUCCESS',
              user: userData
            }, window.location.origin)
            
            // Try multiple methods to close popup in production
            setTimeout(() => {
              console.log('Attempting to close popup')
              try {
                // Method 1: Standard close
                window.close()
                
                // Method 2: If close doesn't work, try to navigate away
                setTimeout(() => {
                  if (!window.closed) {
                    console.log('Window still open, trying alternative close methods')
                    // Try to navigate to a blank page
                    window.location.href = 'about:blank'
                    
                    // Method 3: Try to focus parent and close
                    setTimeout(() => {
                      try {
                        window.opener?.focus()
                        window.close()
                      } catch (e) {
                        console.log('Could not close popup:', e)
                      }
                    }, 100)
                  }
                }, 1000)
              } catch (e) {
                console.log('Error closing popup:', e)
                // Fallback: navigate to blank page
                window.location.href = 'about:blank'
              }
            }, 500)
          } else {
            const redirectTo = consumeAuthRedirect('/')
            setRedirectTargetLabel(redirectTo === '/profile' ? 'Profile & fit' : 'home page')
            openSuccessWithDuration(
              redirectTo === '/profile' ? 'Signed in. Opening Profile & fit.' : 'Login successful',
              2000
            )
            console.log('Not in popup, redirecting to', redirectTo)
            // If not in popup, redirect to the saved destination.
            setTimeout(() => {
              navigate(redirectTo, { replace: true })
            }, 1000)
          }
        } else {
          throw new Error('No session found - please try signing in again')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Authentication failed'
        console.error('OAuth callback error:', errorMessage)
        setError(errorMessage)
        setStatus('error')
        
        if (window.opener) {
          console.log('Sending error message to parent')
          // Send error message to parent window
          window.opener.postMessage({
            type: 'GOOGLE_AUTH_ERROR',
            error: errorMessage
          }, window.location.origin)
          
          // Try multiple methods to close popup in production
          setTimeout(() => {
            console.log('Attempting to close popup (error case)')
            try {
              // Method 1: Standard close
              window.close()
              
              // Method 2: If close doesn't work, try to navigate away
              setTimeout(() => {
                if (!window.closed) {
                  console.log('Window still open, trying alternative close methods (error case)')
                  // Try to navigate to a blank page
                  window.location.href = 'about:blank'
                  
                  // Method 3: Try to focus parent and close
                  setTimeout(() => {
                    try {
                      window.opener?.focus()
                      window.close()
                    } catch (e) {
                      console.log('Could not close popup (error case):', e)
                    }
                  }, 100)
                }
              }, 1000)
            } catch (e) {
              console.log('Error closing popup (error case):', e)
              // Fallback: navigate to blank page
              window.location.href = 'about:blank'
            }
          }, 1000)
        } else {
          console.log('Not in popup, redirecting to auth')
          // If not in popup, redirect to auth page and preserve the saved destination.
          setTimeout(() => {
            const redirectTo = readAuthRedirect('/')
            navigate(redirectTo === '/' ? '/auth' : loginPathWithRedirect(redirectTo))
          }, 2000)
        }
      }
    }

    handleOAuthCallback()
  }, [navigate, login, openSuccessWithDuration])

  if (status === 'loading') {
    return (
      <main className="app-main">
        <section className="container p-6" style={{ textAlign: 'center' }}>
          <div className="card" style={{ maxWidth: 400, margin: '50px auto', padding: 40 }}>
            <LoadingSpinner size="large" text="Completing sign-in..." />
            <p className="mt-4" style={{ color: 'var(--color-muted)' }}>
              Please wait while we complete your authentication...
            </p>
          </div>
        </section>
      </main>
    )
  }

  if (status === 'success') {
    return (
      <main className="app-main">
        <section className="container p-6" style={{ textAlign: 'center' }}>
          <div className="card" style={{ maxWidth: 400, margin: '50px auto', padding: 40 }}>
            <div style={{ color: 'var(--color-success)', fontSize: '2rem', marginBottom: 16 }}>
              ✓
            </div>
            <h2 style={{ color: 'var(--color-success)', marginBottom: 16 }}>
              Sign-in Successful!
            </h2>
            <p style={{ color: 'var(--color-muted)' }}>
              {window.opener ? 'Closing popup...' : `Redirecting you to ${redirectTargetLabel}...`}
            </p>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="app-main">
      <section className="container p-6" style={{ textAlign: 'center' }}>
        <div className="card" style={{ maxWidth: 400, margin: '50px auto', padding: 40 }}>
          <div style={{ color: 'var(--color-danger)', fontSize: '2rem', marginBottom: 16 }}>
            ✗
          </div>
          <h2 style={{ color: 'var(--color-danger)', marginBottom: 16 }}>
            Sign-in Failed
          </h2>
          <p style={{ color: 'var(--color-muted)', marginBottom: 16 }}>
            {error || 'An unexpected error occurred during authentication.'}
          </p>
          <p style={{ color: 'var(--color-muted)' }}>
            {window.opener ? 'Closing popup...' : 'Redirecting you back to the sign-in page...'}
          </p>
        </div>
      </section>
    </main>
  )
}
