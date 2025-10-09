import { supabase } from '../lib/supabase'

const COOKIE_NAME = 'auth_token'

export function setAuthTokenCookie(token: string, maxAgeDays: number = 7) {
  try {
    const maxAge = maxAgeDays * 24 * 60 * 60
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${maxAge}; Path=/; SameSite=Lax`
  } catch {}
}

export function getAuthTokenCookie(): string | null {
  try {
    const cookies = document.cookie.split(';').map(c => c.trim())
    for (const c of cookies) {
      if (c.startsWith(`${COOKIE_NAME}=`)) {
        return decodeURIComponent(c.substring(COOKIE_NAME.length + 1))
      }
    }
    return null
  } catch {
    return null
  }
}

export function clearAuthTokenCookie() {
  try {
    document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`
  } catch {}
}

// Get the current authentication token (Supabase session or cookie fallback)
export async function getCurrentAuthToken(): Promise<string | null> {
  try {
    // First try to get Supabase session token
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (!error && session?.access_token) {
      return session.access_token
    }
    
    // Fallback to cookie token (for traditional email/password auth)
    return getAuthTokenCookie()
  } catch {
    // Fallback to cookie token if Supabase fails
    return getAuthTokenCookie()
  }
}


