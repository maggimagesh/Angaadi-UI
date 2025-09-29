import { buildApiUrl } from '../lib/api'

// Public endpoint: Check API health status
export async function checkHealth(): Promise<{ status?: string; message?: string; error?: { message: string } }> {
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

    return { status: result.status, message: result.message }
  } catch (error) {
    return { 
      error: { 
        message: error instanceof Error ? error.message : 'Network error occurred' 
      } 
    }
  }
}