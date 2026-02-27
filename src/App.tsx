import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import { Header } from './components/Header'
import { CookieBanner } from './components/CookieBanner'
import HomePage from './pages/Home'
import AuthPage from './pages/Auth'
import OAuthCallback from './pages/OAuthCallback'
import ProfilePage from './pages/Profile'
import HealthPage from './pages/Health'
import ProductsListing from './pages/ProductsListing'
import ProductDetails from './pages/ProductDetails'
import CartPage from './pages/Cart'
import CookieConsentGallery from './pages/CookieConsentGallery'
import CookieDesignDetails from './pages/CookieDesignDetails'
import InfiniteScrollPage from './pages/InfiniteScrollPage'
import IframePage from './pages/IframePage'
import ShadowDomPage from './pages/ShadowDomPage'
import ShadowIframePage from './pages/ShadowIframePage'
import SlowInfiniteScrollPage from './pages/SlowInfiniteScrollPage'
import MultiScrollPage from './pages/MultiScrollPage'
import InfiniteTextScrollPage from './pages/InfiniteTextScrollPage'
import InfiniteHeavyScrollPage from './pages/InfiniteHeavyScrollPage'
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
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/oauth-callback" element={<OAuthCallback />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/health" element={<HealthPage />} />
          <Route path="/products" element={<ProductsListing />} />
          <Route path="/product/:categoryId/:productId" element={<ProductDetails />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/cookie-consent" element={<CookieConsentGallery />} />
          <Route path="/cookie-consent/:designId" element={<CookieDesignDetails />} />
          <Route path="/infinite-scroll" element={<InfiniteScrollPage />} />
          <Route path="/slow-infinite-scroll" element={<SlowInfiniteScrollPage />} />
          <Route path="/iframe" element={<IframePage />} />
          <Route path="/shadow-dom" element={<ShadowDomPage />} />
          <Route path="/shadow-iframe" element={<ShadowIframePage />} />
          <Route path="/multi-scroll" element={<MultiScrollPage />} />
          <Route path="/infinite-text" element={<InfiniteTextScrollPage />} />
          <Route path="/infinite-heavy" element={<InfiniteHeavyScrollPage />} />
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
