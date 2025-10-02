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
    <main className="app-main">
      <section className="container p-6">
        <div className="card p-6">
          <h1>System Health Status</h1>
          {loading ? (
            <LoadingSpinner size="medium" text="Checking system health..." />
          ) : healthStatus?.error ? (
            <div style={{ color: 'var(--color-danger)' }}>
              <p>Error: {healthStatus.error}</p>
              <button className="btn btn-primary" onClick={loadHealthStatus}>Retry</button>
            </div>
          ) : (
            <div>
              <p><strong>Status:</strong> {healthStatus?.status || 'Unknown'}</p>
              <p><strong>Message:</strong> {healthStatus?.message || 'No message'}</p>
              <button className="btn btn-primary" onClick={loadHealthStatus}>Refresh</button>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}