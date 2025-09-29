// Centralized API configuration
// Prefer Vite env var `VITE_BACKEND_URL`. Fallbacks for production and local dev.

// Resolve from Vite envs. Only `VITE_` prefixed vars are exposed to client.
const fromViteEnv: string | undefined = (import.meta as any)?.env?.VITE_BACKEND_URL || (import.meta as any)?.env?.BACKEND_URL

// If not provided, choose a sensible default based on environment
// In development, use relative path for Vite proxy; in production, require explicit configuration
const DEFAULT_DEV = '/api/v1' // Use relative path for Vite proxy

// Vite exposes MODE; fall back to NODE_ENV if needed
const mode: string | undefined = (import.meta as any)?.env?.MODE || (import.meta as any)?.env?.NODE_ENV
const isDev = mode ? /^(dev|development)$/i.test(mode) : false

// In production, require explicit VITE_BACKEND_URL configuration
if (!isDev && !fromViteEnv) {
  console.warn('VITE_BACKEND_URL not configured for production. Please set it in your environment variables.')
  console.warn('For Vercel deployment, add VITE_BACKEND_URL as environment variable with value like: https://your-api.vercel.app')
} else if (!isDev && fromViteEnv) {
  console.log('API base URL configured as:', fromViteEnv)
}

export const API_BASE: string = String(fromViteEnv || DEFAULT_DEV)

export function buildApiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${p}`
}


