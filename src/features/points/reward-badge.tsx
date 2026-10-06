import { Coins } from 'lucide-react'

import { formatPoints } from '@/features/points/format'
import { cn } from '@/lib/utils'

/**
 * "Earn 100 points" on a gift. Only shown for a reward the seller can pay.
 * the API hides the rest. So it is a promise, not an advert.
 */
export function RewardBadge({
  points,
  size = 'sm',
  className,
}: {
  points?: number
  size?: 'sm' | 'md'
  className?: string
}) {
  if (!points || points <= 0) return null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md bg-amber-300 font-bold text-amber-950',
        size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs',
        className,
      )}
    >
      <Coins className={size === 'sm' ? 'size-3' : 'size-3.5'} />
      Earn {formatPoints(points)} pts
    </span>
  )
}
