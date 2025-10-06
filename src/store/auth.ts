import { create } from 'zustand'
import { clearSensitiveData } from '../utils/security'

/**
 * SECURITY NOTE:
 * - This store uses localStorage which is accessible to JavaScript and has XSS risks
 * - For production apps, consider using httpOnly cookies for tokens
 * - Never store passwords or sensitive credentials in localStorage
 * - Tokens stored here should have reasonable expiration times
 */

export type AuthUser = {
  emailId: string
  firstName?: string
  lastName?: string
  userId?: string
  token?: string // Token is stored for session management - consider httpOnly cookies in production
}

type AuthState = {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (user: AuthUser) => void
  logout: () => void
}

const STORAGE_KEY = 'demo.auth.user'

const readUserFromStorage = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

const writeUserToStorage = (user: AuthUser | null) => {
  try {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore storage errors */
  }
}

export const useAuthStore = create<AuthState>((set) => {
  const initialUser = typeof window !== 'undefined' ? readUserFromStorage() : null
  return {
    user: initialUser,
    isAuthenticated: !!initialUser,
    login: (user: AuthUser) => {
      writeUserToStorage(user)
      set({ user, isAuthenticated: true })
    },
    logout: () => {
      writeUserToStorage(null)
      clearSensitiveData() // Clear all sensitive data from storage
      set({ user: null, isAuthenticated: false })
    },
  }
})


