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
import IframeFullPage from './pages/IframeFullPage'
import ShadowDomPage from './pages/ShadowDomPage'
import ShadowDomFullPage from './pages/ShadowDomFullPage'
import ShadowIframePage from './pages/ShadowIframePage'
import SlowInfiniteScrollPage from './pages/SlowInfiniteScrollPage'
import MultiScrollPage from './pages/MultiScrollPage'
import InfiniteTextScrollPage from './pages/InfiniteTextScrollPage'
import InfiniteHeavyScrollPage from './pages/InfiniteHeavyScrollPage'
import IframeContentPage from './pages/IframeContentPage'
import AllResponsesPage from './pages/AllResponsesPage'
import DualScrollPage from './pages/DualScrollPage'
import MouseOnlyScrollPage from './pages/MouseOnlyScrollPage'
import WebhookLanding from './pages/WebhookLanding'
import WebhookInspector from './pages/WebhookInspector'
import LegacyWebhookLanding from './pages/LegacyWebhookLanding'
import LegacyWebhookInspector from './pages/LegacyWebhookInspector'
import LoopDetectedPage from './pages/LoopDetectedPage'
import { Navigate } from 'react-router-dom'

// Redirect to Angaadi-API for slow-loading page
const SlowLoadingRedirect = () => {
  window.location.href = 'http://localhost:3000/slow-loading'
  return null
}

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
          <Route path="/iframe-full" element={<IframeFullPage />} />
          <Route path="/shadow-dom" element={<ShadowDomPage />} />
          <Route path="/shadow-dom-full" element={<ShadowDomFullPage />} />
          <Route path="/shadow-iframe" element={<ShadowIframePage />} />
          <Route path="/multi-scroll" element={<MultiScrollPage />} />
          <Route path="/infinite-text" element={<InfiniteTextScrollPage />} />
          <Route path="/infinite-heavy" element={<InfiniteHeavyScrollPage />} />
          <Route path="/iframe-content" element={<IframeContentPage />} />
          <Route path="/all-resp" element={<AllResponsesPage />} />
          <Route path="/dual-scroll" element={<DualScrollPage />} />
          <Route path="/mouse-only-scroll" element={<MouseOnlyScrollPage />} />
          <Route path="/webhook" element={<LegacyWebhookLanding />} />
          <Route path="/webhook/:token" element={<LegacyWebhookInspector />} />
          <Route path="/webhhook" element={<LegacyWebhookLanding />} />
          <Route path="/webhhook/:token" element={<LegacyWebhookInspector />} />
          <Route path="/valid-webhooks" element={<WebhookLanding />} />
          <Route path="/valid-webhooks/:token" element={<WebhookInspector />} />
          <Route path="/loop-detected" element={<LoopDetectedPage />} />
          <Route path="/slow-loading" element={<SlowLoadingRedirect />} />
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
