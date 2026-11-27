import { useEffect, useState } from 'react'

import { getFreeGiftStatus, listFreeGiftOffers } from '@/api/free-gifts'
import { useAuth } from '@/features/auth/auth-context'

/** How long one answer is reused across pages, so the header does not refetch on every click. */
const CACHE_MS = 60_000
let offersCache: { at: number; value: Promise<boolean> } | null = null
let statusCache: { at: number; key: string; value: Promise<boolean> } | null = null

function hasOffers(): Promise<boolean> {
  if (!offersCache || Date.now() - offersCache.at > CACHE_MS) {
    offersCache = {
      at: Date.now(),
      value: listFreeGiftOffers()
        .then((offers) => offers.length > 0)
        .catch(() => false),
    }
  }
  return offersCache.value
}

function customerCanSend(key: string): Promise<boolean> {
  if (!statusCache || statusCache.key !== key || Date.now() - statusCache.at > CACHE_MS) {
    statusCache = {
      at: Date.now(),
      key,
      value: getFreeGiftStatus()
        .then((status) => !status.used)
        .catch(() => false),
    }
  }
  return statusCache.value
}

/**
 * Whether to promote the free gift at all: there are gifts on offer right
 * now, and a signed-in customer has not used theirs. Sellers and admins
 * never see it. False until known, so a link never leads to an empty offer.
 */
export function useFreeGiftAvailable(): boolean {
  const { isAuthenticated, role, token } = useAuth()
  const isCustomer = isAuthenticated && role === 'customer'
  const isGuest = !isAuthenticated
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!isCustomer && !isGuest) {
      setAvailable(false)
      return
    }
    void Promise.all([hasOffers(), isCustomer ? customerCanSend(token ?? '') : Promise.resolve(true)]).then(
      ([offers, canSend]) => {
        if (!cancelled) setAvailable(offers && canSend)
      },
    )
    return () => {
      cancelled = true
    }
  }, [isCustomer, isGuest, token])

  return available
}
