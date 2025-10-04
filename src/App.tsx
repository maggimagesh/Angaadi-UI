import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import { Header } from './components/Header'
import HomePage from './pages/Home'
import AuthPage from './pages/Auth'
import ProfilePage from './pages/Profile'
import HealthPage from './pages/Health'
import ProductsListing from './pages/ProductsListing'
import { SuccessModal } from './components/SuccessModal'
import { DocModal } from './components/DocModal'

export default function App() {
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
        </Routes>
        <SuccessModal />
        <DocModal />
      </BrowserRouter>
    </div>
  )
}
