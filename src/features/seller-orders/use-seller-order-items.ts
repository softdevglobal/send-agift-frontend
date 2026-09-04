import { useEffect, useMemo, useState } from 'react'

import {
  listSellerOrderItems,
  type SellerOrderItemSummary,
} from '@/api/seller-orders'
import { getErrorMessage } from '@/lib/api'

export function useSellerOrderItems() {
  const [items, setItems] = useState<SellerOrderItemSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listSellerOrderItems()
      .then((list) => {
        if (cancelled) return
        const next = Array.isArray(list) ? list : []
        next.sort((a, b) => {
          const aTime = Date.parse(a.created_at)
          const bTime = Date.parse(b.created_at)
          if (Number.isNaN(aTime) || Number.isNaN(bTime)) return 0
          return bTime - aTime
        })
        setItems(next)
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load order items.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return useMemo(() => ({ items, loading, error }), [items, loading, error])
}
