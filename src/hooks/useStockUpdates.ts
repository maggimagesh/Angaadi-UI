import { useEffect, useRef } from 'react'
import supabase from '../lib/supabase'

export interface StockUpdateEvent {
  type: 'STOCK_ADDED' | 'STOCK_REDUCED'
  product: {
    id: number
    stock: number
    [key: string]: unknown
  }
}

/**
 * Subscribes to the Supabase Realtime `stock-updates` channel.
 * When the server broadcasts a stock change, this hook:
 *   1. Logs the event to the browser console
 *   2. Calls the provided `onStockUpdate` callback
 * Works in both development and production.
 */
export function useStockUpdates(onStockUpdate: (event: StockUpdateEvent) => void) {
  const callbackRef = useRef(onStockUpdate)
  callbackRef.current = onStockUpdate

  useEffect(() => {
    const channel = supabase
      .channel('stock-updates')
      .on('broadcast', { event: 'stock-change' }, (payload) => {
        const data = payload.payload as StockUpdateEvent
        console.log('[Supabase Realtime] Stock update received:', data)
        callbackRef.current(data)
      })
      .subscribe((status) => {
        console.log('[Supabase Realtime] Channel status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])
}
