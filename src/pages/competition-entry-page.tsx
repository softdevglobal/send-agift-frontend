import { useEffect, useState } from 'react'
import { LoaderCircle, LogIn, ScrollText, ShieldCheck, Ticket, Trophy } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'

import { getPublicCompetition, type PublicCompetition } from '@/api/competition-points'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { formatDateTime, formatMoney } from '@/features/competition-points/format'
import { PlayInApp } from '@/features/competition-points/play-in-app'
import { customerPanelClass } from '@/features/customer-commerce/customer-styles'
import { formatPoints } from '@/features/points/format'
import { getErrorMessage } from '@/lib/api'
import { returnToState } from '@/lib/auth'
import { cn } from '@/lib/utils'

/**
 * One competition: its rules and committed prize. Games are played in the
 * mobile app, so this page only informs and points the customer there.
 */
export function CompetitionEntryPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const { isAuthenticated, role } = useAuth()
  const signedIn = isAuthenticated && role === 'customer'
  const [competition, setCompetition] = useState<PublicCompetition | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getPublicCompetition(id)
      .then(setCompetition)
      .catch((err) => setError(getErrorMessage(err, 'Could not load the competition.')))
  }, [id])

  if (error) return <FormAlert error={error} />
  if (!competition) {
    return (
      <div className="flex justify-center py-24">
        <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const live = competition.status === 'live'
  return (
    <div className="space-y-5">
      <Link to="/competitions" className="text-sm font-semibold text-muted-foreground hover:text-brand-ink">
        ← All competitions
      </Link>
      <section className="rounded-[1.75rem] bg-brand-ink px-6 py-7 text-white sm:px-8">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-white/55 uppercase">
          {competition.game_name} · skill competition
        </p>
        <h1 className="mt-2 font-poster text-4xl">{competition.title}</h1>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Stat label="Committed prize now" value={formatMoney(competition.current_prize_cents, competition.prize_currency)} />
          <Stat
            label="Maximum possible prize"
            value={competition.max_prize_cents ? formatMoney(competition.max_prize_cents, competition.prize_currency) : 'Fixed'}
          />
          <Stat
            label={live ? 'Closes' : 'Opens'}
            value={formatDateTime(live ? competition.ends_at : competition.starts_at)}
          />
        </div>
        <p className="mt-4 text-sm text-white/70">{competition.prize_description}</p>
      </section>

      <PlayInApp />

      <section className={cn(customerPanelClass, 'grid gap-4 px-5 py-5 text-sm sm:grid-cols-2')}>
        <Rule icon={Ticket} label="Cost to play" value={`${formatPoints(competition.points_per_attempt)} points per play`} />
        <Rule
          icon={Trophy}
          label="How the winner is decided"
          value={`The highest verified score wins${competition.number_of_winners > 1 ? ` (${competition.number_of_winners} winners)` : ''}. Every player plays the same board.`}
        />
        <Rule
          icon={ShieldCheck}
          label="Play limit"
          value={
            competition.max_attempts_per_customer > 0
              ? `${competition.max_attempts_per_customer} plays per person`
              : 'No limit beyond your points'
          }
        />
        <Rule icon={ScrollText} label="Open to" value={competition.countries.map((c) => c.name).join(', ')} />
        {competition.official_rules ? (
          <details className="sm:col-span-2">
            <summary className="cursor-pointer font-semibold">Official rules</summary>
            <p className="mt-2 whitespace-pre-line text-muted-foreground">{competition.official_rules}</p>
          </details>
        ) : null}
      </section>

      {signedIn ? null : (
        <section className={cn(customerPanelClass, 'flex flex-wrap items-center justify-between gap-4 px-5 py-5')}>
          <p className="text-sm">Sign in to see your points and the competitions open in your country.</p>
          <Button asChild className="h-10 px-4">
            <Link to="/login" state={returnToState(location.pathname, location.search)}>
              <LogIn className="size-4" />
              Sign in
            </Link>
          </Button>
        </section>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold tracking-[0.18em] text-white/55 uppercase">{label}</p>
      <p className="mt-1 font-poster text-2xl">{value}</p>
    </div>
  )
}

function Rule({ icon: Icon, label, value }: { icon: typeof Ticket; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-brand-violet" />
      <div>
        <p className="font-semibold">{label}</p>
        <p className="text-muted-foreground">{value}</p>
      </div>
    </div>
  )
}
