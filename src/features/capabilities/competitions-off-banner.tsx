import { Info } from 'lucide-react'

import { useCompetitionsEnabled } from '@/features/capabilities/use-competitions-enabled'
import { cn } from '@/lib/utils'

/**
 * Tells admins why publishing and resuming are off. History, review,
 * winners, claims and settlement stay usable for what already exists.
 */
export function CompetitionsOffBanner({ className }: { className?: string }) {
  const on = useCompetitionsEnabled()
  if (on) return null
  return (
    <p
      role="status"
      className={cn(
        'flex items-start gap-2 text-sm leading-relaxed font-medium text-amber-700 dark:text-amber-400',
        className,
      )}
    >
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span className="min-w-0">
        Competitions are switched off on this server. You can review, settle and resolve existing
        competitions, but nothing can be published or resumed until they are switched on.
      </span>
    </p>
  )
}
