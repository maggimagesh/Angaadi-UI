import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import { Header } from './components/Header'
import HomePage from './pages/Home'
import AuthPage from './pages/Auth'
import ProfilePage from './pages/Profile'
import HealthPage from './pages/Health'
import ProductsListing from './pages/ProductsListing'
import ProductDetails from './pages/ProductDetails'
import { SuccessModal } from './components/SuccessModal'
import { DocModal } from './components/DocModal'
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
          <Route path="/login" element={<AuthPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/health" element={<HealthPage />} />
          <Route path="/products" element={<ProductsListing />} />
          <Route path="/product/:categoryId/:productId" element={<ProductDetails />} />
        </Routes>
        <SuccessModal />
        <DocModal />
      </BrowserRouter>
    </div>
  )
}
