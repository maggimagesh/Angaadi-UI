import { useState, useEffect } from 'react'
import { useUIStore } from '../store/ui'
import '../styles/cookie-banner.css'

export function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const [showManage, setShowManage] = useState(false)
  const [optionalCookies, setOptionalCookies] = useState(true)
  const cookieBannerShown = useUIStore((state) => state.cookieBannerShown)
  const setCookieBannerShown = useUIStore((state) => state.setCookieBannerShown)

  useEffect(() => {
    // Check if user has already accepted cookies
    if (!cookieBannerShown) {
      setShowBanner(true)
    }
  }, [cookieBannerShown])

  const handleAccept = () => {
    setCookieBannerShown(true)
    // Save cookie preferences
    localStorage.setItem('cookie-preferences', JSON.stringify({
      mandatory: true,
      optional: optionalCookies,
      acceptedAt: new Date().toISOString()
    }))
    setShowBanner(false)
  }

  const handleManageOk = () => {
    setCookieBannerShown(true)
    // Save cookie preferences
    localStorage.setItem('cookie-preferences', JSON.stringify({
      mandatory: true,
      optional: optionalCookies,
      acceptedAt: new Date().toISOString()
    }))
    setShowBanner(false)
    setShowManage(false)
  }

  const handleClose = () => {
    // Close without accepting - user will see banner again next time
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <>
      {/* Banner overlay */}
      <div
        className="cookie-banner-overlay"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: showBanner ? 'block' : 'none',
          zIndex: 99,
          animation: 'fadeIn 300ms ease-out'
        }}
      />

      {/* Cookie Banner or Manage Cookies Screen */}
      <div
        className="cookie-banner-container"
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px',
          animation: 'slideUp 400ms ease-out'
        }}
      >
        {!showManage ? (
          <div
            className="cookie-banner"
            style={{
              background: 'var(--color-card)',
              color: 'var(--color-text)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--elev-3)',
              maxWidth: '600px',
              width: '100%',
              padding: '40px',
              position: 'relative',
              boxSizing: 'border-box'
            }}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
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
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
              aria-label="Close cookie banner"
            >
              ✕
            </button>

            {/* Header */}
            <h2
              style={{
                margin: '0 0 12px 0',
                fontSize: '20px',
                fontWeight: 600,
                color: 'var(--color-heading)'
              }}
            >
              We value your privacy
            </h2>

            {/* Description */}
            <p
              style={{
                margin: '0 0 24px 0',
                fontSize: '14px',
                lineHeight: '1.6',
                color: 'var(--color-text)',
                opacity: 0.9
              }}
            >
              We use cookies and similar technologies to ensure you get the best experience on our website. Some cookies are essential for the website to function properly (mandatory), while others help us analyze how you use our site and personalize your experience (optional). You can choose which types of non-essential cookies you want to allow.
            </p>

            {/* Cookie Info */}
            <div
              style={{
                background: 'var(--color-bg)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                marginBottom: '24px',
                fontSize: '13px',
                lineHeight: '1.6',
                color: 'var(--color-text)',
                opacity: 0.8
              }}
            >
              <p style={{ margin: '0 0 8px 0' }}>
                <strong>Mandatory Cookies:</strong> These are necessary for the website to function properly and cannot be disabled. They include session management, security, and load balancing.
              </p>
              <p style={{ margin: 0 }}>
                <strong>Optional Cookies:</strong> These help us understand user behavior, improve website performance, and provide personalized content and recommendations.
              </p>
            </div>

            {/* Buttons */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap'
              }}
            >
              <button
                onClick={() => setShowManage(true)}
                className="cookie-manage-btn"
                style={{
                  flex: 1,
                  minWidth: '140px',
                  padding: '12px 24px',
                  borderRadius: 'var(--radius-sm)',
                  border: '2px solid var(--color-primary)',
                  background: 'transparent',
                  color: 'var(--color-primary)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 200ms var(--motion-easing-standard)',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-primary-container)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                Manage Cookies
              </button>
              <button
                onClick={handleAccept}
                className="cookie-accept-btn"
                style={{
                  flex: 1,
                  minWidth: '140px',
                  padding: '12px 24px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: 'var(--color-primary)',
                  color: 'var(--color-on-primary)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 200ms var(--motion-easing-standard)',
                  fontFamily: 'inherit',
                  boxShadow: 'var(--elev-1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#5a4296'
                  e.currentTarget.style.boxShadow = 'var(--elev-2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--color-primary)'
                  e.currentTarget.style.boxShadow = 'var(--elev-1)'
                }}
              >
                Accept All
              </button>
            </div>
          </div>
        ) : (
          /* Manage Cookies Screen */
          <div
            className="cookie-manage-screen"
            style={{
              background: 'var(--color-card)',
              color: 'var(--color-text)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--elev-3)',
              maxWidth: '600px',
              width: '100%',
              padding: '40px',
              position: 'relative',
              boxSizing: 'border-box'
            }}
          >
            {/* Close button */}
            <button
              onClick={() => {
                setShowBanner(false)
                setShowManage(false)
              }}
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
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
              aria-label="Close cookie preferences"
            >
              ✕
            </button>

            {/* Header */}
            <h2
              style={{
                margin: '0 0 24px 0',
                fontSize: '20px',
                fontWeight: 600,
                color: 'var(--color-heading)'
              }}
            >
              Cookie Preferences
            </h2>

            {/* Cookie Options */}
            <div style={{ marginBottom: '32px' }}>
              {/* Mandatory Cookies */}
              <div
                className="cookie-option mandatory"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  marginBottom: '12px',
                  background: 'var(--color-bg)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)'
                }}
              >
                <div>
                  <p
                    style={{
                      margin: '0 0 4px 0',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--color-heading)'
                    }}
                  >
                    Mandatory Cookies
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '13px',
                      color: 'var(--color-text)',
                      opacity: 0.7
                    }}
                  >
                    Required for site functionality and security
                  </p>
                </div>
                <div
                  className="toggle-switch mandatory"
                  style={{
                    width: '44px',
                    height: '28px',
                    borderRadius: '14px',
                    background: 'var(--color-primary)',
                    position: 'relative',
                    cursor: 'not-allowed',
                    opacity: 0.6
                  }}
                >
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'white',
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      transition: 'right 200ms'
                    }}
                  />
                </div>
              </div>

              {/* Optional Cookies */}
              <div
                className="cookie-option optional"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  background: 'var(--color-bg)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)'
                }}
              >
                <div>
                  <p
                    style={{
                      margin: '0 0 4px 0',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--color-heading)'
                    }}
                  >
                    Optional & Analytics Cookies
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '13px',
                      color: 'var(--color-text)',
                      opacity: 0.7
                    }}
                  >
                    Help us improve your experience with analytics and personalization
                  </p>
                </div>
                <button
                  onClick={() => setOptionalCookies(!optionalCookies)}
                  className="toggle-switch optional"
                  style={{
                    width: '44px',
                    height: '28px',
                    borderRadius: '14px',
                    background: optionalCookies
                      ? 'var(--color-primary)'
                      : 'var(--color-surface-variant)',
                    border: 'none',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background-color 200ms var(--motion-easing-standard)',
                    padding: 0,
                    margin: 0,
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.outline =
                      '2px solid var(--color-primary)'
                    e.currentTarget.style.outlineOffset = '2px'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.outline = 'none'
                  }}
                >
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'white',
                      position: 'absolute',
                      top: '2px',
                      right: optionalCookies ? '2px' : 'auto',
                      left: optionalCookies ? 'auto' : '2px',
                      transition: 'all 200ms var(--motion-easing-standard)'
                    }}
                  />
                </button>
              </div>
            </div>

            {/* Info Box */}
            <div
              style={{
                background: 'var(--color-primary-container)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                marginBottom: '24px',
                fontSize: '13px',
                lineHeight: '1.5',
                color: 'var(--color-text)',
                borderLeft: '4px solid var(--color-primary)'
              }}
            >
              You can change your cookie preferences at any time through your browser settings or by visiting our Privacy Policy.
            </div>

            {/* Buttons */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap'
              }}
            >
              <button
                onClick={() => setShowManage(false)}
                className="cookie-back-btn"
                style={{
                  flex: 1,
                  minWidth: '140px',
                  padding: '12px 24px',
                  borderRadius: 'var(--radius-sm)',
                  border: '2px solid var(--color-primary)',
                  background: 'transparent',
                  color: 'var(--color-primary)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 200ms var(--motion-easing-standard)',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-primary-container)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                Back
              </button>
              <button
                onClick={handleManageOk}
                className="cookie-ok-btn"
                style={{
                  flex: 1,
                  minWidth: '140px',
                  padding: '12px 24px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: 'var(--color-primary)',
                  color: 'var(--color-on-primary)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 200ms var(--motion-easing-standard)',
                  fontFamily: 'inherit',
                  boxShadow: 'var(--elev-1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#5a4296'
                  e.currentTarget.style.boxShadow = 'var(--elev-2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--color-primary)'
                  e.currentTarget.style.boxShadow = 'var(--elev-1)'
                }}
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
