import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  listSellerOrderItems,
  type SellerOrderItemSummary,
} from '@/api/seller-orders'
import { getErrorMessage } from '@/lib/api'

export function useSellerOrderItems() {
  const [items, setItems] = useState<SellerOrderItemSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const cancelledRef = useRef(false)

  /**
   * Refetches without flipping `loading`. The detail panel calls this after an
   * accept or a label buy, and dropping the list back to a spinner underneath
   * an open panel would be a jarring way to restate one row.
   */
  const refresh = useCallback(async () => {
    try {
      const list = await listSellerOrderItems()
      if (cancelledRef.current) return
      const next = Array.isArray(list) ? list : []
      next.sort((a, b) => {
        const aTime = Date.parse(a.created_at)
        const bTime = Date.parse(b.created_at)
        if (Number.isNaN(aTime) || Number.isNaN(bTime)) return 0
        return bTime - aTime
      })
      setItems(next)
      setError(null)
    } catch (err) {
      if (!cancelledRef.current) {
        setError(getErrorMessage(err, 'Could not load order items.'))
      }
    }
  }, [])

  useEffect(() => {
    cancelledRef.current = false
    setLoading(true)
    refresh().finally(() => {
      if (!cancelledRef.current) setLoading(false)
    })
    return () => {
      cancelledRef.current = true
    }
  }, [refresh])

  return useMemo(
    () => ({ items, loading, error, refresh }),
    [items, loading, error, refresh],
  )
}
