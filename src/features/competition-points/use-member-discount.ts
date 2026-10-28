import { useEffect, useState } from 'react'

import { getMemberDiscount } from '@/api/competition-points'
import { useAuth } from '@/features/auth/auth-context'
import { majorToMinor } from '@/lib/money'

/**
 * The product discount the signed-in customer gets now, in basis points
 * (100 = 1%); 0 for guests, non-members and when it can't be read. The server
 * prices the order, so this only shows what it will do.
 */
export function useMemberDiscountBps(): number {
  const { isAuthenticated, role } = useAuth()
  const [bps, setBps] = useState(0)

  useEffect(() => {
    if (!isAuthenticated || role !== 'customer') {
      setBps(0)
      return
    }
    let cancelled = false
    getMemberDiscount()
      .then((d) => !cancelled && setBps(d.discount_bps))
      .catch(() => !cancelled && setBps(0))
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, role])

  return bps
}

/**
 * A member's saving on a bag, worked out as the server does: on each line's
 * price in minor units, rounded down.
 */
export function memberDiscountMinor(
  lines: { lineTotal: number }[],
  currency: string,
  bps: number,
): number {
  if (bps <= 0) return 0
  return lines.reduce((sum, l) => sum + Math.floor((majorToMinor(l.lineTotal, currency) * bps) / 10000), 0)
}

/** 790 → "7.9%". */
export function formatBps(bps: number): string {
  return `${Number((bps / 100).toFixed(2))}%`
}
