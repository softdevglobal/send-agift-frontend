import { useEffect, useMemo, useState } from 'react'

import { listOrders, type Order } from '@/api/orders'
import { getErrorMessage } from '@/lib/api'

export function useCustomerOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listOrders()
      .then((list) => {
        if (cancelled) return
        const next = Array.isArray(list) ? list : []
        next.sort((a, b) => {
          const aTime = Date.parse(a.created_at)
          const bTime = Date.parse(b.created_at)
          if (Number.isNaN(aTime) || Number.isNaN(bTime)) return 0
          return bTime - aTime
        })
        setOrders(next)
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load your orders.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return useMemo(
    () => ({ orders, loading, error }),
    [orders, loading, error],
  )
}
