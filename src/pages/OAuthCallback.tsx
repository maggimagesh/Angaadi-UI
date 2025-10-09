import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { setAuthTokenCookie } from '../utils/token'
import { buildApiUrl } from '../lib/api'
import LoadingSpinner from '../components/LoadingSpinner'

export default function OAuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const login = useAuthStore(s => s.login)

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          throw error
        }

        if (data.session) {
          const { user, access_token } = data.session
          
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

          setAuthTokenCookie(access_token, 7)
          login(userData)
          setStatus('success')
          
          if (window.opener) {
            // Send success message to parent window
            window.opener.postMessage({
              type: 'GOOGLE_AUTH_SUCCESS',
              user: userData
            }, window.location.origin)
            
            // Close popup after a short delay
            setTimeout(() => {
              window.close()
            }, 500)
          } else {
            // If not in popup, redirect to home
            setTimeout(() => {
              navigate('/')
            }, 1000)
          }
        } else {
          throw new Error('No session found - please try signing in again')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Authentication failed'
        setError(errorMessage)
        setStatus('error')
        
        if (window.opener) {
          // Send error message to parent window
          window.opener.postMessage({
            type: 'GOOGLE_AUTH_ERROR',
            error: errorMessage
          }, window.location.origin)
          
          // Close popup after a short delay
          setTimeout(() => {
            window.close()
          }, 1000)
        } else {
          // If not in popup, redirect to auth page
          setTimeout(() => {
            navigate('/auth')
          }, 2000)
        }
      }
    }

    handleOAuthCallback()
  }, [navigate, login])

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
              {window.opener ? 'Closing popup...' : 'Redirecting you to the home page...'}
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