import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import './index.css'
import { Header } from './components/Header'
import { SceneHost } from './vision/SceneHost'
import { CookieBanner } from './components/CookieBanner'
import { APP_ROUTES } from './routes'
import { ErrorBoundary } from './components/ErrorBoundary'

import { SuccessModal } from './components/SuccessModal'
import { DocModal } from './components/DocModal'
import { SignInModal } from './components/SignInModal'
import ForgotPasswordModal from './components/ForgotPasswordModal'
import { WelcomeModal } from './components/WelcomeModal'
import { clearLegacyPasswordStorage, auditStorageSecurity } from './utils/security'

/** Every route change replays a short enter animation (Vision theme): the page rises out of the room. */
function RouteStage({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  return (
    <div className="route-stage" key={pathname}>
      {children}
    </div>
  )
}

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
        <SceneHost />
        <Header />
        <RouteStage>
        <Routes>
          {/* One <Route> per entry in src/routes.tsx — the same table
              /playground enumerates, so the two can never drift apart. */}
          {APP_ROUTES.map((route) => (
            <Route key={route.path} path={route.path} element={<ErrorBoundary key={route.path}>{route.element}</ErrorBoundary>} />
          ))}
        </Routes>
        </RouteStage>
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
