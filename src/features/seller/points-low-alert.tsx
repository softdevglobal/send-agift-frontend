import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { getSellerPoints, type SellerPointsWallet } from '@/api/points'
import { Button } from '@/components/ui/button'
import { formatPoints } from '@/features/points/format'
import { cn } from '@/lib/utils'

/**
 * A dashboard heads-up when the seller's points run low: they owe points the
 * platform fronted for their rewards, or their balance covers only a few
 * more orders. Shows nothing otherwise, or if the wallet cannot be read.
 */
export function PointsLowAlert() {
  const [wallet, setWallet] = useState<SellerPointsWallet | null>(null)

  useEffect(() => {
    let cancelled = false
    getSellerPoints()
      .then((w) => {
        if (!cancelled) setWallet(w)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  if (!wallet?.low_balance) return null
  const owes = wallet.owed > 0

  return (
    <section
      className={cn(
        'flex flex-wrap items-center gap-4 rounded-xl border-2 p-4 sm:p-5',
        owes ? 'border-destructive/30 bg-destructive/5' : 'border-amber-300 bg-amber-50',
      )}
    >
      <span
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-xl',
          owes ? 'bg-destructive text-white' : 'bg-amber-300 text-amber-950',
        )}
      >
        <AlertTriangle className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {owes
            ? `Points low: you owe ${formatPoints(wallet.owed)} points`
            : `Points low: ${formatPoints(Math.max(0, wallet.available))} left`}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {owes
            ? 'Customers are still getting your rewards on credit. Top up and it comes out of your purchase first.'
            : 'Top up so your product rewards keep going without dipping into credit.'}
        </p>
      </div>
      <Button asChild className="h-10 rounded-full px-5">
        <Link to="/seller/points">
          Top up
          <ArrowRight className="size-4" />
        </Link>
      </Button>
    </section>
  )
}
