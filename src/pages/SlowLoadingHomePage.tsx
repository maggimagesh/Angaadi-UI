import { useState, useEffect } from 'react'
import HomePage from './Home'

export default function SlowLoadingHomePage() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // 60 seconds delay
    const timer = setTimeout(() => {
      setReady(true)
    }, 60000)

    return () => clearTimeout(timer)
  }, [])

  if (!ready) {
    // Return a blank page or a loading state while waiting for the 60 seconds
    return (
      <div 
        style={{ height: '100vh', width: '100vw', background: '#f6f1e8' }} 
        data-testid="slow-loading-screen"
      />
    )
  }

  return <HomePage />
}
