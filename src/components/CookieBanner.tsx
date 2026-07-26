import { useState, useEffect } from 'react'
import { useUIStore } from '../store/ui'
import '../styles/cookie-banner.css'

export function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const [showManage, setShowManage] = useState(false)
  const [optionalCookies, setOptionalCookies] = useState(true)
  const cookieBannerShown = useUIStore((state) => state.cookieBannerShown)
  const setCookieBannerShown = useUIStore((state) => state.setCookieBannerShown)

  function setCookie(name: string, value: string, days: number) {
    try {
      const maxAge = days * 24 * 60 * 60
      const cookieValue = encodeURIComponent(value)
      const cookie = `${name}=${cookieValue}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`
      document.cookie = cookie
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    // Check if user has already accepted cookies
    if (!cookieBannerShown) {
      // Simulate network idle by waiting for window load + delay
      const handleLoad = () => {
        setTimeout(() => {
          setShowBanner(true)
        }, 1500) // 1.5s delay after load
      }

      if (document.readyState === 'complete') {
        handleLoad()
      } else {
        window.addEventListener('load', handleLoad)
        return () => window.removeEventListener('load', handleLoad)
      }
    }
  }, [cookieBannerShown])

  const handleAccept = () => {
    setCookieBannerShown(true)
    const prefs = { mandatory: true, optional: optionalCookies, acceptedAt: new Date().toISOString() }
    setCookie('cookie-preferences', JSON.stringify(prefs), 365)
    setShowBanner(false)
  }

  const handleManageOk = () => {
    setCookieBannerShown(true)
    const prefs = { mandatory: true, optional: optionalCookies, acceptedAt: new Date().toISOString() }
    setCookie('cookie-preferences', JSON.stringify(prefs), 365)
    setShowBanner(false)
    setShowManage(false)
  }

  // const handleClose = () => {
  //   setShowBanner(false)
  // }

  if (!showBanner) return null

  return (
    <>
      {/* Small Banner at the bottom */}
      {!showManage && (
        <div
          className="cookie-banner-footer"
          style={{
            position: 'fixed',
            bottom: 'var(--space-5)',
            left: 'var(--space-5)',
            right: 'var(--space-5)',
            zIndex: 100,
            animation: 'slideUpFooter 500ms var(--motion-easing-standard)',
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none'
          }}
        >
          <div
            className="cookie-banner-mini"
            style={{
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              padding: 'var(--space-3) var(--space-5)',
              borderRadius: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-4)',
              maxWidth: '1000px',
              width: '100%',
              pointerEvents: 'auto',
              border: '1px solid var(--color-border)'
            }}
          >
            <div style={{ flex: 1, fontSize: 'var(--font-sm)', lineHeight: '1.5' }}>
              <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Privacy & Cookies:</span> This site uses cookies. By continuing to use this website, you agree to their use.
              To find out more, including how to control cookies, see here: <a href="/privacy" className="cookie-link" style={{ color: 'var(--color-primary)', textDecoration: 'underline', padding: 0, background: 'none' }}>Cookie Policy</a>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <button
                onClick={() => setShowManage(true)}
                className="btn btn-secondary"
                style={{
                  height: '32px',
                  padding: '0 var(--space-3)',
                  fontSize: 'var(--font-xs)',
                  minWidth: 'auto'
                }}
              >
                Manage
              </button>
              <button
                onClick={handleAccept}
                className="btn btn-primary"
                style={{
                  height: '32px',
                  padding: '0 var(--space-4)',
                  fontSize: 'var(--font-xs)',
                  minWidth: 'auto',
                  borderRadius: 0
                }}
              >
                Accept
              </button>
              { /* <button
                onClick={handleClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-muted)',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '0 var(--space-1)',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                ×
              </button>  */}
            </div>
          </div>
        </div>
      )}

      {/* Manage Cookies Modal (remains a modal for better UX) */}
      {showManage && (
        <>
          <div
            className="cookie-banner-overlay"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              zIndex: 101,
              animation: 'fadeIn 300ms ease-out'
            }}
          />
          <div
            className="cookie-manage-modal-container"
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 102,
              padding: '20px'
            }}
          >
            <div
              className="cookie-manage-screen"
              style={{
                background: 'var(--color-card)',
                color: 'var(--color-text)',
                borderRadius: 0,
                maxWidth: '600px',
                width: '100%',
                padding: '40px',
                position: 'relative',
                boxSizing: 'border-box',
                animation: 'slideUp 400ms ease-out'
              }}
            >
              <button
                onClick={() => setShowManage(false)}
                className="cookie-close-btn"
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: 'var(--color-text)',
                  opacity: 0.6,
                  transition: 'opacity 200ms',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  zIndex: 1
                }}
              >
                ✕
              </button>

              <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: 600 }}>Cookie Preferences</h2>

              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', marginBottom: '12px', background: 'var(--color-bg)', borderRadius: 0, border: '1px solid var(--color-border)' }}>
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600 }}>Mandatory Cookies</p>
                    <p style={{ margin: 0, fontSize: '13px', opacity: 0.7 }}>Required for site functionality and security</p>
                  </div>
                  <div style={{ width: '44px', height: '28px', borderRadius: 0, background: 'var(--color-primary)', position: 'relative', opacity: 0.6 }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: 0, background: 'white', position: 'absolute', top: '2px', right: '2px' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--color-bg)', borderRadius: 0, border: '1px solid var(--color-border)' }}>
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600 }}>Optional & Analytics Cookies</p>
                    <p style={{ margin: 0, fontSize: '13px', opacity: 0.7 }}>Help us improve your experience</p>
                  </div>
                  <button
                    onClick={() => setOptionalCookies(!optionalCookies)}
                    style={{
                      width: '44px',
                      height: '28px',
                      borderRadius: 0,
                      background: optionalCookies ? 'var(--color-primary)' : '#ccc',
                      border: 'none',
                      position: 'relative',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ width: '24px', height: '24px', borderRadius: 0, background: 'white', position: 'absolute', top: '2px', left: optionalCookies ? 'auto' : '2px', right: optionalCookies ? '2px' : 'auto', transition: 'all 200ms' }} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setShowManage(false)} style={{ flex: 1, padding: '12px', borderRadius: 0, border: '2px solid var(--color-primary)', background: 'transparent', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer' }}>Back</button>
                <button onClick={handleManageOk} style={{ flex: 1, padding: '12px', borderRadius: 0, border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>OK</button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
