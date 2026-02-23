import { useEffect, useRef } from 'react'

export interface StockUpdateEvent {
  type: 'STOCK_ADDED' | 'STOCK_REDUCED'
  product: {
    id: number
    stock: number
    [key: string]: unknown
  }
}

/**
 * Connects to the WebSocket server and invokes `onStockUpdate`
 * every time a stock-change message arrives.
 * Also logs each event to the browser console.
 * Auto-reconnects with exponential back-off on disconnection.
 */
export function useStockWebSocket(onStockUpdate: (event: StockUpdateEvent) => void) {
  const callbackRef = useRef(onStockUpdate)
  callbackRef.current = onStockUpdate

  useEffect(() => {
    let ws: WebSocket | null = null
    let retryDelay = 1000
    let cancelled = false

    function connect() {
      if (cancelled) return

      // Determine ws URL based on current page location
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/ws`

      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('[WebSocket] Connected to stock updates')
        retryDelay = 1000 // reset back-off
      }

      ws.onmessage = (event) => {
        try {
          const data: StockUpdateEvent = JSON.parse(event.data)
          console.log('[WebSocket] Stock update received:', data)
          callbackRef.current(data)
        } catch {
          // Ignore malformed messages
        }
      }

      ws.onclose = () => {
        if (!cancelled) {
          console.log(`[WebSocket] Disconnected. Reconnecting in ${retryDelay / 1000}s...`)
          setTimeout(connect, retryDelay)
          retryDelay = Math.min(retryDelay * 2, 30_000)
        }
      }

      ws.onerror = () => {
        // onclose will fire after onerror, so reconnect is handled there
        ws?.close()
      }
    }

    connect()

    return () => {
      cancelled = true
      ws?.close()
    }
  }, [])
}
