import { Star, Ticket } from 'lucide-react'

import { entriesLabel } from '@/api/game-entries'
import { useEntriesEarnable } from '@/features/game-entries/use-entries-earnable'
import { cn } from '@/lib/utils'

/**
 * The game entries a promoted product earns. Renders nothing for zero.
 * `compact` is the short chip on a product card ("+3 entries"); otherwise it
 * reads in full ("Earn 3 game entries").
 */
export function EntriesBadge({
  entries,
  compact = false,
  className,
}: {
  entries?: number
  compact?: boolean
  className?: string
}) {
  if (!entries || entries <= 0) return null
  if (compact) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full bg-brand-ink px-2 py-0.5 text-[11px] font-extrabold whitespace-nowrap text-white',
          className,
        )}
      >
        <Ticket className="size-3 text-gold" />+{entries} {entries === 1 ? 'entry' : 'entries'}
      </span>
    )
  }
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

/** The gold label every promoted product carries, wherever it is listed. */
export function SponsoredLabel({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[10px] font-black tracking-[0.08em] text-gold-ink uppercase',
        className,
      )}
    >
      <Star className="size-2.5 fill-current" />
      Sponsored
    </span>
  )
}

/** On a sponsored product's page: what buying it earns, as a slim gold strip. */
export function EntriesRewardStrip({ entries, className }: { entries?: number; className?: string }) {
  // Not where this customer lives: say so rather than promise entries.
  const available = useEntriesEarnable()
  const earns = !!entries && entries > 0 && available
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl border border-gold/60 bg-gold-soft px-3 py-2.5',
        className,
      )}
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gold font-poster text-lg text-gold-ink">
        {earns ? `+${entries}` : <Star className="size-5 fill-current" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-extrabold text-foreground">
            {earns ? `Earn ${entriesLabel(entries!)}` : 'A promoted gift'}
          </p>
          <SponsoredLabel />
        </div>
        {earns ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Added once your payment is confirmed, where games are open in your state.
          </p>
        ) : !available && entries ? (
          <p className="mt-0.5 text-xs text-muted-foreground">Game entries are not available where you live yet.</p>
        ) : null}
      </div>
    </div>
  )
}
