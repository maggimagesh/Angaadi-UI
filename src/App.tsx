import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import { Header } from './components/Header'
import { ThemeToggle } from './components/ThemeToggle'
import { CookieBanner } from './components/CookieBanner'
import { APP_ROUTES } from './routes'

import { SuccessModal } from './components/SuccessModal'
import { DocModal } from './components/DocModal'
import { SignInModal } from './components/SignInModal'
import ForgotPasswordModal from './components/ForgotPasswordModal'
import { WelcomeModal } from './components/WelcomeModal'
import { clearLegacyPasswordStorage, auditStorageSecurity } from './utils/security'

export default function App() {
  // SECURITY: Clear any legacy password storage on app initialization
  useEffect(() => {
    clearLegacyPasswordStorage()

    // Run security audit in development mode
    if (import.meta.env.DEV) {
      auditStorageSecurity()
    }
  }, [])

  return (
    <div className="app-shell">
      <BrowserRouter>
        <Header />
        <ThemeToggle />
        <Routes>
          {/* One <Route> per entry in src/routes.tsx — the same table
              /playground enumerates, so the two can never drift apart. */}
          {APP_ROUTES.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
        </Routes>
        <SuccessModal />
        <DocModal />
        <SignInModal />
        <ForgotPasswordModal />
        <WelcomeModal />
        <CookieBanner />
      </BrowserRouter>
    </div>
  )
}
