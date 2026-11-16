import { useEffect, useState } from 'react'

import { getEntryOffers, type EntryOffers } from '@/api/game-entries'
import { useAuth } from '@/features/auth/auth-context'

/**
 * What the signed-in customer would earn for these products, worked out on
 * the server for their country and state, today's caps and each seller's
 * remaining budget. Null for guests, while loading, or when nothing is
 * promoted. It promises nothing: the order fixes the offer when placed.
 */
export function useEntryOffers(productIds: string[]): EntryOffers | null {
  const { isAuthenticated, role } = useAuth()
  const [offers, setOffers] = useState<EntryOffers | null>(null)
  const key = [...new Set(productIds)].sort().join(',')

  useEffect(() => {
    if (!isAuthenticated || role !== 'customer' || !key) {
      setOffers(null)
      return
    }
    let cancelled = false
    getEntryOffers(key.split(','))
      .then((res) => {
        if (!cancelled) setOffers(res.offers.some((o) => o.game_entries > 0 || o.reason) ? res : null)
      })
      .catch(() => {
        if (!cancelled) setOffers(null)
      })
    return () => {
      cancelled = true
    }
  }, [key, isAuthenticated, role])

  return offers
}
