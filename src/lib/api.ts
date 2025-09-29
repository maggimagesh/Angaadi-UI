// Centralized API configuration
// Connects to external API server via environment variable
// For development, set VITE_BACKEND_URL to your API server URL (e.g., http://localhost:8080)
// The Vite proxy in vite.config.ts will forward /api requests to your backend server

// Resolve from Vite envs. Only `VITE_` prefixed vars are exposed to client.
const fromViteEnv: string | undefined = (import.meta as any)?.env?.VITE_BACKEND_URL || (import.meta as any)?.env?.BACKEND_URL

// If not provided, use proxy path that will be handled by Vite during development
const DEFAULT_DEV = '/api/v1' // This gets proxied via vite.config.ts

// Vite exposes MODE; fall back to NODE_ENV if needed
const mode: string | undefined = (import.meta as any)?.env?.MODE || (import.meta as any)?.env?.NODE_ENV
const isDev = mode ? /^(dev|development)$/i.test(mode) : false

// In production, require explicit VITE_BACKEND_URL configuration
if (!isDev && !fromViteEnv) {
  console.warn('VITE_BACKEND_URL not configured for production. Please set it in your environment variables.')
  console.warn('For production deployment, add VITE_BACKEND_URL as environment variable with value like: https://your-api-server.com')
} else if (!isDev && fromViteEnv) {
  console.log('API base URL configured as:', fromViteEnv)
}

export const API_BASE: string = String(fromViteEnv || DEFAULT_DEV)

export function buildApiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${p}`
}


