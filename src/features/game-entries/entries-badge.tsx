import { Ticket } from 'lucide-react'

import { entriesLabel } from '@/api/game-entries'
import { cn } from '@/lib/utils'

/** "Earn 3 game entries" on a promoted product. Renders nothing for zero. */
export function EntriesBadge({ entries, className }: { entries?: number; className?: string }) {
  if (!entries || entries <= 0) return null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-brand-teal/20 px-2.5 py-1 text-xs font-bold text-brand-ink dark:text-foreground',
        className,
      )}
    >
      <Ticket className="size-3.5" />
      Earn {entriesLabel(entries)}
    </span>
  )
}

/** The label every promoted product carries, wherever it is listed. */
export function SponsoredLabel({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border border-brand-ink/25 bg-background/90 px-1.5 py-0.5 text-[10px] font-bold tracking-[0.08em] text-brand-ink uppercase dark:text-foreground',
        className,
      )}
    >
      Sponsored
    </span>
  )
}
