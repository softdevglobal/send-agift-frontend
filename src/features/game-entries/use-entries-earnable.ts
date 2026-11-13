import { useEffect, useState } from 'react'

import { getMyGameEntries } from '@/api/game-entries'
import { useAuth } from '@/features/auth/auth-context'

/** One check per signed-in session, shared by every product card. */
let cached: { token: string; allowed: Promise<boolean> } | null = null

function earnAllowed(token: string) {
  if (cached?.token !== token) {
    cached = {
      token,
      allowed: getMyGameEntries()
        .then((wallet) => wallet.earn?.allowed ?? true)
        // Unknown: keep showing what a product earns.
        .catch(() => true),
    }
  }
  return cached.allowed
}

/**
 * Whether products may promise game entries to whoever is looking. A guest
 * sees what a product can earn; a signed-in customer only does where their
 * state lets them earn, so "+3 entries" never promises what the order will
 * not give.
 */
export function useEntriesEarnable(): boolean {
  const { isAuthenticated, role, token } = useAuth()
  const customer = isAuthenticated && role === 'customer' && token ? token : null
  const [allowed, setAllowed] = useState(true)

  useEffect(() => {
    let cancelled = false
    if (!customer) {
      setAllowed(true)
      return
    }
    void earnAllowed(customer).then((ok) => {
      if (!cancelled) setAllowed(ok)
    })
    return () => {
      cancelled = true
    }
  }, [customer])

  return allowed
}
