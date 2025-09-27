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


