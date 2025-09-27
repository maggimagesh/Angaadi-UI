import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import { Header } from './components/Header'
import HomePage from './pages/Home'
import AuthPage from './pages/Auth'
import { SuccessModal } from './components/SuccessModal'
import { DocModal } from './components/DocModal'
import ProfilePage from './pages/Profile'

export default function App() {
  return (
    <div className="app-shell">
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
        <SuccessModal />
        <DocModal />
      </BrowserRouter>
    </div>
  )
}
