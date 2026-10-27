import { useEffect, useState } from 'react'
import { CalendarClock, LoaderCircle, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'

import { listEntryCompetitions, type PublicCompetition } from '@/api/competition-points'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { formatDateTime, formatMoney } from '@/features/competition-points/format'
import { CustomerEmptyState, CustomerPageHeader } from '@/features/customer-commerce'
import { formatPoints } from '@/features/points/format'
import { getErrorMessage } from '@/lib/api'

/**
 * Skill competitions entered with competition points. The best verified
 * score wins; nothing is decided by chance. Availability depends on where
 * the entrant lives and is checked before any points are used.
 */
export function CompetitionsPage() {
  const [items, setItems] = useState<PublicCompetition[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listEntryCompetitions()
      .then(setItems)
      .catch((err) => setError(getErrorMessage(err, 'Could not load competitions.')))
  }, [])

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <CustomerPageHeader
        eyebrow="Competitions"
        title="Skill competitions"
        description="Enter with competition points from your completed gifts. The highest verified score wins. Availability varies by location."
      />
      <FormAlert error={error} />
      {items === null && !error ? (
        <div className="flex justify-center py-16">
          <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : items && items.length === 0 ? (
        <CustomerEmptyState
          icon={Trophy}
          title="No competitions open right now"
          description="Keep sending gifts: completed gifts earn competition points for the next one."
          action={
            <Button asChild className="h-11 px-5">
              <Link to="/products">Send a gift</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items?.map((c) => (
            <Link
              key={c.id}
              to={`/competitions/${c.id}`}
              className="group flex flex-col rounded-[1.75rem] border-2 border-brand-ink/15 bg-card p-6 transition-colors hover:border-brand-ink"
            >
              <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
                {c.game_name} · {c.status}
              </p>
              <h2 className="mt-1 font-poster text-2xl group-hover:underline">{c.title}</h2>
              <p className="mt-3 text-sm">
                Prize now <strong>{formatMoney(c.current_prize_cents, c.prize_currency)}</strong>
                {c.max_prize_cents ? (
                  <span className="text-muted-foreground"> · up to {formatMoney(c.max_prize_cents, c.prize_currency)}</span>
                ) : null}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{c.prize_description}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="rounded-lg bg-accent px-2 py-1 font-semibold text-brand-ink">
                  {formatPoints(c.points_per_attempt)} points per entry
                </span>
                <span className="flex items-center gap-1">
                  <CalendarClock className="size-3.5" /> closes {formatDateTime(c.ends_at)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
