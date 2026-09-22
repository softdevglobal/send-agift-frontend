import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ArrowRight,
  Crown,
  Gamepad2,
  ShieldAlert,
  Trophy,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { listAdminGames, type AdminGameSummary } from '@/api/games'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { AdminPageHeader, adminPanelClass, formatDate } from '@/features/admin'
import { formatScore, gameGradient } from '@/features/admin/games-format'
import { GameBadge, Loading, StatusPill } from '@/features/admin/games-ui'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

function Metric({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone?: 'warn' }) {
  return (
    <div className={cn(adminPanelClass, 'p-4 sm:p-5')}>
      <div
        className={cn(
          'mb-4 flex size-10 items-center justify-center rounded-xl',
          tone === 'warn' ? 'bg-amber-100 text-amber-700' : 'bg-accent text-primary',
        )}
      >
        {icon}
      </div>
      <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 truncate text-xl font-medium tracking-tight">{value}</p>
    </div>
  )
}

function GameCard({ game }: { game: AdminGameSummary }) {
  const top = game.top_player
  return (
    <Link
      to={`/admin/games/${game.slug}`}
      className={cn(
        adminPanelClass,
        'group flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(40,50,30,0.12)]',
      )}
    >
      <div className="relative h-2" style={{ background: gameGradient(game.slug) }} />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-3">
          <GameBadge slug={game.slug} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg tracking-tight">{game.name}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {game.game_type} · v{game.version || '—'}
            </p>
          </div>
          {!game.playable ? <StatusPill tone="neutral">No engine</StatusPill> : null}
        </div>

        <div className="mt-5 flex-1 rounded-xl bg-muted/40 p-4">
          {top && game.top_score !== undefined ? (
            <>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                <Crown className="size-3.5 text-amber-500" />
                Best scorer
              </p>
              <p className="mt-1 font-display text-3xl tracking-tight">{formatScore(game.top_score)}</p>
              <p className="mt-1 truncate text-sm font-medium">{top.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {top.kind === 'guest'
                  ? 'Playing as a guest'
                  : [top.email, top.country_name].filter(Boolean).join(' · ')}
              </p>
            </>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No verified score yet
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{game.plays.toLocaleString()} plays</span>
          <span aria-hidden>·</span>
          <span>{game.players.toLocaleString()} players</span>
          {game.competitions > 0 ? (
            <>
              <span aria-hidden>·</span>
              <span>{game.competitions} competitions</span>
            </>
          ) : null}
          {game.under_review > 0 ? (
            <StatusPill tone="warn" className="ml-auto">
              <ShieldAlert className="size-3" />
              {game.under_review} to review
            </StatusPill>
          ) : null}
        </div>
        <p className="mt-3 flex items-center gap-1 text-sm font-medium text-primary">
          View leaderboard
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </p>
      </div>
    </Link>
  )
}

/** Superadmin: every game, who plays, and who holds the best verified score. */
export function AdminGamesPage() {
  const [games, setGames] = useState<AdminGameSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listAdminGames()
      .then((list) => {
        if (!cancelled) setGames(list)
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load games.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const totals = useMemo(
    () =>
      games.reduce(
        (acc, g) => ({
          plays: acc.plays + g.plays,
          players: acc.players + g.players,
          review: acc.review + g.under_review,
        }),
        { plays: 0, players: 0, review: 0 },
      ),
    [games],
  )

  const lastPlayed = games
    .map((g) => g.last_played_at)
    .filter((v): v is string => Boolean(v))
    .sort()
    .at(-1)

  return (
    <>
      <AdminPageHeader
        eyebrow="Games"
        title="Games & leaderboards"
        description="Every skill game, who is playing and who holds the best verified score. Guests are shown too, tagged by device. Scores count once the server has replayed them."
        action={
          <Button asChild variant="outline" className="h-10">
            <Link to="/admin/competitions">
              <Trophy className="size-4" />
              Competitions
            </Link>
          </Button>
        }
      />

      <FormAlert error={error} className="mb-6" />

      {loading ? (
        <Loading />
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric icon={<Gamepad2 className="size-5" />} label="Games" value={String(games.length)} />
            <Metric icon={<Trophy className="size-5" />} label="Plays" value={totals.plays.toLocaleString()} />
            <Metric icon={<Users className="size-5" />} label="Players" value={totals.players.toLocaleString()} />
            <Metric
              icon={<ShieldAlert className="size-5" />}
              label="Scores to review"
              value={totals.review.toLocaleString()}
              tone={totals.review > 0 ? 'warn' : undefined}
            />
          </div>

          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <h2 className="font-display text-xl tracking-tight">Best scorers</h2>
            {lastPlayed ? (
              <p className="text-xs text-muted-foreground">Last played {formatDate(lastPlayed)}</p>
            ) : null}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {games.map((game) => (
              <GameCard key={game.slug} game={game} />
            ))}
          </div>
        </>
      )}
    </>
  )
}
