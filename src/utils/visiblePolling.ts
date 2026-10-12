/** Poll only while visible, with at most one request in flight. */
export function startVisiblePolling(task: () => Promise<void>, intervalMs: number): () => void {
  const isVisible = () => document.visibilityState !== 'hidden'
  let stopped = false
  let running = false
  let timer: number | undefined

  const clearTimer = () => {
    window.clearTimeout(timer)
    timer = undefined
  }

  const run = async () => {
    clearTimer()
    if (stopped || running || !isVisible()) return
    running = true
    try {
      await task()
    } catch (error) {
      // Callers handle request errors in their UI; keep an unexpected failure
      // from ending the polling lifecycle with an unhandled rejection.
      console.error('Background refresh failed', error)
    } finally {
      running = false
      if (!stopped && isVisible()) {
        timer = window.setTimeout(() => void run(), intervalMs)
      }
    }
  }

  const onVisibilityChange = () => {
    clearTimer()
    if (isVisible()) void run()
  }

  document.addEventListener('visibilitychange', onVisibilityChange)
  void run()
  return () => {
    stopped = true
    clearTimer()
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
}
