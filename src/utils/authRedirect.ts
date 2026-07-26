const AUTH_REDIRECT_KEY = 'auth.redirectTo'

export function safeAuthRedirect(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string') return fallback

  const redirectTo = value.trim()
  if (!redirectTo || !redirectTo.startsWith('/') || redirectTo.startsWith('//')) {
    return fallback
  }

  return redirectTo
}

export function loginPathWithRedirect(redirectTo: string): string {
  return `/login?redirectTo=${encodeURIComponent(safeAuthRedirect(redirectTo))}`
}

export function authRedirectState(redirectTo: string): { redirectTo: string } {
  return { redirectTo: safeAuthRedirect(redirectTo) }
}

export function rememberAuthRedirect(redirectTo: unknown) {
  const safeRedirect = safeAuthRedirect(redirectTo, '')
  if (!safeRedirect || safeRedirect === '/') return

  try {
    sessionStorage.setItem(AUTH_REDIRECT_KEY, safeRedirect)
  } catch {
    /* ignore storage errors */
  }
}

export function clearAuthRedirect() {
  try {
    sessionStorage.removeItem(AUTH_REDIRECT_KEY)
  } catch {
    /* ignore storage errors */
  }
}

export function readAuthRedirect(fallback = '/'): string {
  try {
    return safeAuthRedirect(sessionStorage.getItem(AUTH_REDIRECT_KEY), fallback)
  } catch {
    return fallback
  }
}

export function consumeAuthRedirect(fallback = '/'): string {
  const redirectTo = readAuthRedirect(fallback)
  clearAuthRedirect()
  return redirectTo
}

export function getAuthRedirect(search: string, state: unknown, fallback = '/'): string {
  const stateRedirect =
    state && typeof state === 'object' && 'redirectTo' in state
      ? (state as { redirectTo?: unknown }).redirectTo
      : undefined

  const queryRedirect = new URLSearchParams(search).get('redirectTo')

  return (
    safeAuthRedirect(stateRedirect, '') ||
    safeAuthRedirect(queryRedirect, '') ||
    readAuthRedirect(fallback)
  )
}
