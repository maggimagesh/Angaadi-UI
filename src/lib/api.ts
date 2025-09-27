// Centralized API configuration
// Prefer Vite env var `VITE_BACKEND_URL`. Fallbacks for production and local dev.

// Resolve from Vite envs. Only `VITE_` prefixed vars are exposed to client.
const fromViteEnv: string | undefined = (import.meta as any)?.env?.VITE_BACKEND_URL || (import.meta as any)?.env?.BACKEND_URL

// If not provided, choose a sensible default based on environment
// In production (Vercel), default to the deployed API domain; locally, to localhost.
const DEFAULT_PROD = 'https://angaadi-api.vercel.app/api/v1'
const DEFAULT_DEV = 'http://localhost:3300/api/v1'

// Vite exposes MODE; fall back to NODE_ENV if needed
const mode: string | undefined = (import.meta as any)?.env?.MODE || (import.meta as any)?.env?.NODE_ENV
const isDev = mode ? /^(dev|development)$/i.test(mode) : false

export const API_BASE: string = String(fromViteEnv || (isDev ? DEFAULT_DEV : DEFAULT_PROD))

export function buildApiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${p}`
}


