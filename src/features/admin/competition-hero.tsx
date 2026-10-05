import { ArrowLeft, BellRing, Check, Gamepad2, Medal, Pencil, ShieldAlert, Trophy, Users, type LucideIcon } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import type { AdminCompetition, CompetitionLeaderRow, CompetitionStatus } from '@/api/competitions'
import { Button } from '@/components/ui/button'
import { competitionStatusLabel, formatPlayTime, formatScore, gameGradient, gameLook } from '@/features/admin/games-format'
import { prizeMoney } from '@/features/admin/prize-live'
import { flagOf } from '@/lib/country-options'
import { cn } from '@/lib/utils'

/** "3d 4h", "5h 12m", "42m", or "under a minute". */
function until(ms: number): string {
  if (ms < 60_000) return 'under a minute'
  const mins = Math.floor(ms / 60_000)
  const days = Math.floor(mins / 1440)
  const hours = Math.floor((mins % 1440) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins % 60}m`
  return `${mins}m`
}

/** Re-renders every 30 seconds, for the countdown. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])
  return now
}

/**
 * The top of a competition's page: the game's colours, what it is called and
 * where it runs, the prize as it stands right now and how long is left.
 */
export function CompetitionHero({
  comp,
  status,
  livePrizeCents,
  onEdit,
  editNote,
}: {
  comp: AdminCompetition
  status: CompetitionStatus
  livePrizeCents?: number
  /** Shown as an Edit button when the competition can be edited. */
  onEdit?: () => void
  /** Why it cannot be edited, when it cannot. */
  editNote?: string
}) {
  const now = useNow()
  const Icon = gameLook(comp.game_slug).icon
  const starts = new Date(comp.starts_at).getTime()
  const ends = new Date(comp.ends_at).getTime()
  const open = status === 'live' || status === 'paused'

  const prize =
    comp.prize_type === 'points'
      ? `${(comp.prize_points ?? 0).toLocaleString()} pts`
      : prizeMoney(
          comp.final_prize_cents ?? livePrizeCents ?? (comp.status === 'draft' ? comp.start_prize_cents : comp.current_prize_cents),
          comp.prize_currency,
        )

  const clock =
    status === 'draft' || status === 'scheduled'
      ? now < starts
        ? { label: 'Opens in', value: until(starts - now) }
        : { label: 'Opens', value: 'on publishing' }
      : open && now < ends
        ? { label: 'Closes in', value: until(ends - now) }
        : { label: 'Ended', value: new Date(comp.ends_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) }

  return (
    <section
      className="relative mb-5 overflow-hidden rounded-3xl p-6 text-white shadow-[0_20px_60px_-20px_rgba(40,20,90,0.45)] sm:p-8"
      style={{ background: gameGradient(comp.game_slug) }}
    >
      <Icon aria-hidden className="pointer-events-none absolute -right-8 -bottom-10 size-64 text-white/10" />
      <div aria-hidden className="pointer-events-none absolute -top-24 -left-16 size-72 rounded-full bg-white/10 blur-2xl" />

      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/admin/competitions"
          className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium backdrop-blur transition hover:bg-white/25"
        >
          <ArrowLeft className="size-4" />
          All competitions
        </Link>
        {onEdit ? (
          <Button
            type="button"
            size="sm"
            className="h-9 rounded-full bg-white px-4 text-foreground hover:bg-white/90"
            onClick={onEdit}
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
        ) : editNote ? (
          <span className="rounded-full bg-black/15 px-3 py-1.5 text-xs font-medium text-white/85 backdrop-blur">
            {editNote}
          </span>
        ) : null}
      </div>

      <div className="relative mt-6 flex flex-wrap items-end justify-between gap-6">
        <div className="flex min-w-0 items-start gap-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-white/20 shadow-inner backdrop-blur">
            <Icon className="size-8" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold tracking-wide uppercase backdrop-blur">
                {open ? <span className="size-2 animate-pulse rounded-full bg-emerald-300" /> : null}
                {competitionStatusLabel(status)}
              </span>
              <span className="text-sm text-white/80">
                {comp.game_name} · Round {comp.round_no}
              </span>
            </div>
            <h1 className="mt-1.5 font-display text-3xl leading-tight tracking-tight sm:text-4xl">{comp.title}</h1>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {comp.countries.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium backdrop-blur"
                >
                  <span aria-hidden>{flagOf(c.iso_code)}</span>
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="rounded-2xl bg-white/15 px-5 py-3 backdrop-blur">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-white/75 uppercase">
              {comp.prize_growth_enabled && open ? 'Prize now' : 'Prize'}
            </p>
            <p className="font-display text-3xl tracking-tight">{prize}</p>
            {comp.prize_growth_enabled ? (
              <p className="text-xs text-white/75">
                +{prizeMoney(comp.increment_per_play_cents, comp.prize_currency)} a play · max{' '}
                {prizeMoney(comp.max_prize_cents, comp.prize_currency)}
              </p>
            ) : (
              <p className="text-xs text-white/75">
                {comp.number_of_winners} {comp.number_of_winners === 1 ? 'winner' : 'winners'}
              </p>
            )}
          </div>
          <div className="rounded-2xl bg-black/15 px-5 py-3 backdrop-blur">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-white/75 uppercase">{clock.label}</p>
            <p className="font-display text-3xl tracking-tight">{clock.value}</p>
            <p className="text-xs text-white/75">{comp.timezone}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

const lifecycle: CompetitionStatus[] = ['draft', 'scheduled', 'live', 'closed', 'frozen', 'finalised']

/** The competition's stages as a connected track, done ones ticked. */
export function LifecycleTrack({ status }: { status: CompetitionStatus }) {
  const current = lifecycle.indexOf(status === 'paused' ? 'live' : status)
  return (
    <ol className="mb-5 flex items-center rounded-2xl bg-card px-4 py-3 ring-1 ring-border/60">
      {lifecycle.map((step, i) => {
        const done = i < current
        const here = i === current
        return (
          <li key={step} className={cn('flex items-center', i < lifecycle.length - 1 && 'flex-1')}>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-bold transition',
                  done && 'bg-emerald-500 text-white',
                  here && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                  !done && !here && 'bg-muted text-muted-foreground',
                )}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  'hidden text-xs font-medium whitespace-nowrap md:inline',
                  here ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {competitionStatusLabel(step === 'live' && status === 'paused' ? 'paused' : step)}
              </span>
            </div>
            {i < lifecycle.length - 1 ? (
              <span className={cn('mx-2 h-0.5 flex-1 rounded-full', done ? 'bg-emerald-400' : 'bg-border')} />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: ReactNode
  hint?: ReactNode
  tone: string
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-card p-4 ring-1 ring-border/60">
      <span className={cn('grid size-9 place-items-center rounded-xl text-white shadow-sm', tone)}>
        <Icon className="size-4.5" />
      </span>
      <p className="mt-3 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">{label}</p>
      <p className="font-display text-2xl tracking-tight">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

/** The numbers that matter at a glance. */
export function CompetitionStats({ comp, livePlays }: { comp: AdminCompetition; livePlays?: number }) {
  const a = comp.announcement
  return (
    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
      <StatTile
        icon={Gamepad2}
        label="Plays"
        value={(livePlays ?? comp.eligible_play_count).toLocaleString()}
        hint={comp.points_per_attempt ? `${comp.points_per_attempt} pts each` : 'Free to play'}
        tone="bg-gradient-to-br from-violet-500 to-indigo-600"
      />
      <StatTile
        icon={Users}
        label="Players"
        value={comp.unique_player_count.toLocaleString()}
        hint={comp.max_attempts_per_customer ? `up to ${comp.max_attempts_per_customer} plays each` : 'no play limit'}
        tone="bg-gradient-to-br from-sky-500 to-cyan-500"
      />
      <StatTile
        icon={Trophy}
        label="Scores"
        value={comp.submissions.toLocaleString()}
        hint={`${comp.number_of_winners} ${comp.number_of_winners === 1 ? 'winner' : 'winners'}`}
        tone="bg-gradient-to-br from-amber-400 to-orange-500"
      />
      <StatTile
        icon={ShieldAlert}
        label="To review"
        value={comp.under_review.toLocaleString()}
        hint={comp.under_review ? 'needs a look' : 'all clear'}
        tone={comp.under_review ? 'bg-gradient-to-br from-rose-500 to-red-600' : 'bg-gradient-to-br from-emerald-500 to-teal-500'}
      />
      <StatTile
        icon={BellRing}
        label="Notified"
        value={a?.queued ? `${a.sent.toLocaleString()}/${a.queued.toLocaleString()}` : '-'}
        hint={
          !a?.queued
            ? comp.status === 'draft'
              ? 'on publishing'
              : 'no players yet'
            : [a.pending ? `${a.pending} sending` : '', a.skipped ? `${a.skipped} not reached` : '', a.failed ? `${a.failed} failed` : '']
                .filter(Boolean)
                .join(' · ') || 'all reached'
        }
        tone="bg-gradient-to-br from-fuchsia-500 to-pink-500"
      />
    </div>
  )
}

const podium = [
  { place: 2, height: 'h-20', ring: 'ring-slate-300', medal: 'from-slate-200 to-slate-400' },
  { place: 1, height: 'h-28', ring: 'ring-amber-300', medal: 'from-amber-200 to-amber-500' },
  { place: 3, height: 'h-16', ring: 'ring-orange-300', medal: 'from-orange-200 to-orange-500' },
]

/** The top three on a podium, first in the middle. */
export function LeaderPodium({ rows }: { rows: CompetitionLeaderRow[] }) {
  if (rows.length === 0) return null
  return (
    <div className="mb-6 grid grid-cols-3 items-end gap-3">
      {podium.map(({ place, height, ring, medal }) => {
        const row = rows[place - 1]
        if (!row) return <div key={place} />
        return (
          <div key={place} className="flex flex-col items-center text-center">
            <span
              className={cn(
                'grid size-12 place-items-center rounded-full bg-gradient-to-br font-display text-lg text-white shadow-md ring-4',
                medal,
                ring,
              )}
            >
              {place === 1 ? <Medal className="size-6" /> : place}
            </span>
            <p className="mt-2 max-w-full truncate text-sm font-semibold">{row.display_name || 'Player'}</p>
            <p className="text-xs text-muted-foreground">
              {row.country_code ? `${flagOf(row.country_code)} ` : ''}
              {row.country_name}
            </p>
            <p className="mt-1 font-display text-xl tabular-nums">{formatScore(row.score)}</p>
            <p className="text-[11px] text-muted-foreground tabular-nums">{formatPlayTime(row.duration_ms)}</p>
            <div className={cn('mt-2 w-full rounded-t-xl bg-gradient-to-b', height, medal, 'opacity-80')} />
          </div>
        )
      })}
    </div>
  )
}
