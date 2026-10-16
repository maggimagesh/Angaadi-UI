import { buildApiUrl } from '../lib/api'

export type ReportedHeader = {
  name: string
  value: string
  sensitive: boolean
  origin: 'client' | 'proxy'
}

export type RequestHeadersReport = {
  ok: true
  method: string
  httpVersion: string
  protocol: string
  host: string | null
  path: string
  ip: string | null
  userAgent: string | null
  headerCount: number
  headers: ReportedHeader[]
  timestamp: string
}

export const REQUEST_HEADERS_URL = buildApiUrl('/request-headers')

// Public endpoint: echoes back the headers this browser sent to the API.
// No Content-Type is set on purpose — a plain GET stays a "simple" CORS request,
// so the report shows what the browser sends by itself, without a preflight.
export async function fetchRequestHeaders(): Promise<RequestHeadersReport> {
  const response = await fetch(REQUEST_HEADERS_URL, {
    method: 'GET',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    try {
      const body = await response.json()
      if (body?.error) message = String(body.error)
    } catch {
      // Non-JSON error body: keep the status message.
    }
    throw new Error(message)
  }

  return (await response.json()) as RequestHeadersReport
}

export function maskValue(value: string): string {
  if (!value) return value
  return '•'.repeat(Math.min(Math.max(value.length, 8), 24))
}
