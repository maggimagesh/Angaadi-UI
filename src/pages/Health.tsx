import { useEffect, useState } from 'react'
import { checkHealth } from '../api/health'
import LoadingSpinner from '../components/LoadingSpinner'

export default function HealthPage() {
  const [healthStatus, setHealthStatus] = useState<{ status?: string; message?: string; error?: string } | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    loadHealthStatus()
  }, [])

  const loadHealthStatus = async () => {
    setLoading(true)
    try {
      const result = await checkHealth()
      setHealthStatus({
        status: result.status,
        message: result.message,
        error: result.error?.message
      })
    } catch (error) {
      setHealthStatus({
        error: error instanceof Error ? error.message : 'An error occurred while checking health status'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app-main" id="health-page" data-testid="health-page">
      <section className="container p-6">
        <div className="card p-6" id="health-card" data-testid="health-card">
          <h1 id="health-title" data-testid="health-title">System Health Status</h1>
          {loading ? (
            <div id="health-loading" data-testid="health-loading">
              <LoadingSpinner size="medium" text="Checking system health..." />
            </div>
          ) : healthStatus?.error ? (
            <div id="health-error" data-testid="health-error" style={{ color: 'var(--color-danger)' }}>
              <p id="health-error-message" data-testid="health-error-message">Error: {healthStatus.error}</p>
              <button id="health-retry" data-testid="health-retry" className="btn btn-primary" onClick={loadHealthStatus}>Retry</button>
            </div>
          ) : (
            <div id="health-success" data-testid="health-success">
              <p id="health-status" data-testid="health-status"><strong>Status:</strong> {healthStatus?.status || 'Unknown'}</p>
              <p id="health-message" data-testid="health-message"><strong>Message:</strong> {healthStatus?.message || 'No message'}</p>
              <button id="health-refresh" data-testid="health-refresh" className="btn btn-primary" onClick={loadHealthStatus}>Refresh</button>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}