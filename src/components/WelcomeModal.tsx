import { useState, useEffect } from 'react'
import { BaseModal } from './BaseModal'

const WELCOME_MODAL_SEEN_KEY = 'angaadi.welcome.seen'

const FEATURE_SECTIONS = [
  {
    title: '🔐 Authentication & User Management',
    features: [
      'User Registration (Sign Up) with validation',
      'User Sign In with email/password',
      'Google OAuth Integration (SSO)',
      'Forgot Password flow (OTP verification)',
      'Password Reset functionality',
      'Session management with tokens',
      'User Profile management',
      'Sign Out functionality'
    ]
  },
  {
    title: '🛍️ Product & Shopping Features',
    features: [
      'Product Listing with multiple categories',
      'Product Search functionality',
      'Product Filtering (by category, brand, price)',
      'Product Sorting (price, rating, name)',
      'Product Details page',
      'Product Image gallery',
      'Product Reviews and Ratings',
      'Shopping Cart (Add, Update, Remove items)',
      'Cart persistence across sessions',
      'Wishlist functionality'
    ]
  },
  {
    title: '👤 Profile & Preferences',
    features: [
      'Physical Stats (Height & Weight tracking)',
      'Fit Attributes management',
      'Age Group preferences',
      'Shoe Size selection',
      'Department preferences (Men/Women/Kids)',
      'Profile information update'
    ]
  },
  {
    title: '🎨 UI/UX Features',
    features: [
      'Responsive Design (Mobile, Tablet, Desktop)',
      'Modal dialogs and popups',
      'Toast/Success notifications',
      'Loading states and spinners',
      'Form validation with error messages',
      'Auto-dismiss error messages (5 seconds)',
      'Navigation between pages',
      'Breadcrumb navigation'
    ]
  },
  {
    title: '🧪 Test Automation Ready',
    features: [
      'Consistent data-testid attributes',
      'Unique element IDs for easy selection',
      'ARIA labels for accessibility testing',
      'Multiple demo accounts for testing',
      'API integration with real backend',
      'Error handling and edge cases',
      'Session persistence testing'
    ]
  }
]

export function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem(WELCOME_MODAL_SEEN_KEY)
    if (!hasSeenWelcome) {
      // Show modal after a short delay for better UX
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleClose = () => {
    localStorage.setItem(WELCOME_MODAL_SEEN_KEY, 'true')
    setIsOpen(false)
  }

  const handleNext = () => {
    if (currentStep < FEATURE_SECTIONS.length) {
      setCurrentStep(currentStep + 1)
    } else {
      handleClose()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const isLastStep = currentStep === FEATURE_SECTIONS.length

  const renderContent = () => {
    if (currentStep === 0) {
      return (
        <div style={{ display: 'grid', gap: 20 }}>
          <div style={{ 
            background: 'var(--color-accent)',
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            color: 'white',
            textAlign: 'center'
          }}>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '24px' }}>
              🚀 Welcome to Angaadi E-Commerce Platform
            </h2>
            <p style={{ margin: 0, fontSize: '16px', opacity: 0.95 }}>
              A comprehensive test automation practice application
            </p>
          </div>
          <p style={{ margin: 0, color: 'var(--color-text)', textAlign: 'center' }}>
            Click "Next" to explore the features available for testing
          </p>
        </div>
      )
    } else if (currentStep <= FEATURE_SECTIONS.length) {
      const section = FEATURE_SECTIONS[currentStep - 1]
      return (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ textAlign: 'center', color: 'var(--color-muted)', fontSize: '14px' }}>
            Section {currentStep} of {FEATURE_SECTIONS.length}
          </div>
          <div className="card" style={{ padding: 20, background: 'var(--color-surface)' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '18px', color: 'var(--color-primary)' }}>
              {section.title}
            </h4>
            <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 8 }}>
              {section.features.map((feature, idx) => (
                <li key={idx} style={{ color: 'var(--color-text)' }}>{feature}</li>
              ))}
            </ul>
          </div>
        </div>
      )
    } else {
      return (
        <div style={{ 
          background: 'var(--color-success-container)',
          border: '1px solid var(--color-success)',
          padding: 24,
          borderRadius: 'var(--radius-md)',
          textAlign: 'center',
          display: 'grid',
          gap: 16
        }}>
          <div style={{ fontSize: '48px' }}>🎉</div>
          <p style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: 'var(--color-success)' }}>
            💪 Best Wishes for Your Automation Testing Career!
          </p>
          <p style={{ margin: 0, color: 'var(--color-text)', fontSize: '16px' }}>
            This application is designed to help you practice and master test automation. Happy Testing! 🚀
          </p>
        </div>
      )
    }
  }

  return (
    <BaseModal
      open={isOpen}
      onClose={handleClose}
      title="Welcome QA Automation Engineers! 🎉"
      size="medium"
      testIdPrefix="welcome"
    >
      <div style={{ display: 'grid', gap: 20, minHeight: 300 }}>
        {renderContent()}

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          {currentStep > 0 && (
            <button
              className="btn"
              onClick={handlePrevious}
              data-testid="welcome-previous"
              style={{ flex: 1 }}
            >
              ← Previous
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={handleNext}
            data-testid={isLastStep ? "welcome-finish" : "welcome-next"}
            style={{ flex: 1 }}
          >
            {isLastStep ? 'Get Started! 🎯' : 'Next →'}
          </button>
        </div>
      </div>
    </BaseModal>
  )
}
