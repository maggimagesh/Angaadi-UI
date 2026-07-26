import { buildApiUrl } from '../lib/api'

export type HealthCheckResult = {
  ok?: boolean
  status?: string
  message?: string
  service?: string
  timestamp?: string
  uptime?: number
  error?: { message: string }
}

// Public endpoint: Check API health status
export async function checkHealth(): Promise<HealthCheckResult> {
  try {
    const response = await fetch(buildApiUrl('/health'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const result = await response.json()

    if (!response.ok) {
      return { 
        error: { 
          message: result.message || 'Health check failed' 
        } 
      }
    }

    return {
      ok: result.ok,
      status: result.status || (result.ok ? 'ok' : undefined),
      message: result.message || (result.ok ? 'Angaadi API is healthy' : undefined),
      service: result.service,
      timestamp: result.timestamp,
      uptime: result.uptime,
    }
  } catch (error) {
    return { 
      error: { 
        message: error instanceof Error ? error.message : 'Network error occurred' 
      } 
    }
  }
}
