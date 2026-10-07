import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Crown,
  Eye,
  Gamepad2,
  ShieldAlert,
  Trophy,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { listAdminGames, type AdminGameSummary } from '@/api/games'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { AdminPageHeader, formatDate } from '@/features/admin'
import {
  AdminPreviewSheet,
  PreviewCounts,
  PreviewFacts,
  PreviewHeading,
} from '@/features/admin/admin-preview-sheet'
import { GamePricesPanel, PriceTag } from '@/features/admin/game-prices-panel'
import { formatScore, gameColor } from '@/features/admin/games-format'
import { GameBadge, Loading, StatusPill } from '@/features/admin/games-ui'
import { getErrorMessage } from '@/lib/api'
import { getRole, isAdminRole } from '@/lib/auth'
import { cn } from '@/lib/utils'

function Metric({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone?: 'warn' }) {
  return (
    <div className="rounded-xl border-2 border-brand-ink/10 bg-card p-4 sm:p-5">
      <div
        className={cn(
          'mb-4 flex size-10 items-center justify-center rounded-lg',
          tone === 'warn' ? 'bg-amber-300 text-amber-950' : 'bg-brand-violet text-white',
        )}
      >
        {icon}
      </div>
      <p className="font-poster text-3xl">{value}</p>
      <p className="mt-1 text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">{label}</p>
    </div>
  )
}

/** One game as a card; it opens the preview panel. */
function GameCard({ game, onOpen }: { game: AdminGameSummary; onOpen: () => void }) {
  const top = game.top_player
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col overflow-hidden rounded-xl border-2 border-brand-ink/10 bg-card text-left transition-colors hover:border-brand-ink"
    >
      <div className="relative h-2.5 w-full" style={{ background: gameColor(game.slug) }} />
      <div className="flex w-full flex-1 flex-col p-5">
        <div className="flex items-start gap-3">
          <GameBadge slug={game.slug} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-poster text-lg">{game.name}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {game.game_type} · v{game.version || '-'}
            </p>
          </div>
          {!game.playable ? (
            <StatusPill tone="neutral">No engine</StatusPill>
          ) : game.practice ? (
            <PriceTag points={game.play_cost_points} />
          ) : null}
        </div>

        <div className="mt-5 flex-1 rounded-lg bg-brand-ink p-4 text-white">
          {top && game.top_score !== undefined ? (
            <>
              <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] text-white/60 uppercase">
                <Crown className="size-3.5 text-amber-300" />
                Best scorer
              </p>
              <p className="mt-1 font-poster text-3xl text-amber-300">{formatScore(game.top_score)}</p>
              <p className="mt-1 truncate text-sm font-bold">{top.name}</p>
            </>
          ) : (
            <p className="py-4 text-center text-sm text-white/60">No verified score yet</p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
          <span className="rounded-md bg-accent px-2 py-1 text-brand-ink">{game.plays.toLocaleString()} plays</span>
          <span className="rounded-md bg-accent px-2 py-1 text-brand-ink">{game.players.toLocaleString()} players</span>
          {game.under_review > 0 ? (
            <StatusPill tone="warn" className="ml-auto">
              <ShieldAlert className="size-3" />
              {game.under_review} to review
            </StatusPill>
          ) : null}
        </div>
        <p className="mt-4 flex items-center gap-1.5 text-[11px] font-bold tracking-[0.12em] text-brand-violet uppercase">
          <Eye className="size-4" />
          Preview
        </p>
      </div>
    </button>
  )
}

/** A quick look at one game; its leaderboard is its own page. */
function GamePreview({ game, onClose }: { game: AdminGameSummary | null; onClose: () => void }) {
  const top = game?.top_player
  return (
    <AdminPreviewSheet
      open={game !== null}
      onClose={onClose}
      eyebrow="Game"
      title={game?.name ?? 'Game'}
      description={game ? `${game.game_type} · version ${game.version || '-'}` : undefined}
      badges={
        game ? (
          <>
            {!game.playable ? (
              <StatusPill tone="neutral">No engine</StatusPill>
            ) : game.practice ? (
              <PriceTag points={game.play_cost_points} />
            ) : null}
            <StatusPill tone={game.status === 'active' ? 'good' : 'neutral'}>{game.status}</StatusPill>
          </>
        ) : null
      }
      fullDetailsTo={game ? `/admin/games/${game.slug}` : undefined}
      fullDetailsLabel="View leaderboard"
    >
      {game ? (
        <>
          <PreviewCounts
            items={[
              { label: 'Plays', value: game.plays.toLocaleString(), tone: 'violet' },
              { label: 'Players', value: game.players.toLocaleString(), tone: 'teal' },
              { label: 'Contests', value: game.competitions, tone: 'ink' },
              { label: 'To review', value: game.under_review, tone: 'amber' },
            ]}
          />
          <div className="rounded-lg bg-brand-ink p-4 text-white">
            <PreviewHeading>
              <span className="flex items-center gap-1.5 text-white/70">
                <Crown className="size-3.5 text-amber-300" />
                Best scorer
              </span>
            </PreviewHeading>
            {top && game.top_score !== undefined ? (
              <>
                <p className="mt-2 font-poster text-4xl text-amber-300">{formatScore(game.top_score)}</p>
                <p className="mt-1 font-bold">{top.name}</p>
                <p className="text-xs text-white/60">
                  {top.kind === 'guest'
                    ? 'Playing as a guest'
                    : [top.email, top.country_name].filter(Boolean).join(' · ')}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-white/60">No verified score yet.</p>
            )}
          </div>
          <PreviewFacts
            items={[
              { label: 'Verified scores', value: game.scores.toLocaleString() },
              { label: 'Rejected', value: game.rejected.toLocaleString() },
              { label: 'Play cost', value: game.practice ? `${game.play_cost_points} pts` : 'Competitions only' },
              { label: 'Last played', value: game.last_played_at ? formatDate(game.last_played_at) : 'Never' },
            ]}
          />
        </>
      ) : null}
    </AdminPreviewSheet>
  )
}

/** Superadmin: every game, who plays, and who holds the best verified score. */
export function AdminGamesPage() {
  const [allGames, setGames] = useState<AdminGameSummary[]>([])
  // Only games customers play on their own. Chance games and quizzes are
  // competition formats with no scores of their own, so they are left out.
  const games = useMemo(() => allGames.filter((g) => g.practice), [allGames])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewing, setViewing] = useState<AdminGameSummary | null>(null)

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
        description="Every skill game, what it costs to play, who is playing and who holds the best verified score. Guests are shown too, tagged by device. Scores count once the server has replayed them."
        action={
          <Button asChild className="h-10 px-4">
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

          <GamePricesPanel
            games={games}
            editable={isAdminRole(getRole())}
            onSaved={(updated) =>
              setGames((prev) => prev.map((g) => (g.slug === updated.slug ? { ...g, ...updated } : g)))
            }
          />

          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <h2 className="font-poster text-xl">Best scorers</h2>
            {lastPlayed ? (
              <p className="text-xs text-muted-foreground">Last played {formatDate(lastPlayed)}</p>
            ) : null}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {games.map((game) => (
              <GameCard key={game.slug} game={game} onOpen={() => setViewing(game)} />
            ))}
          </div>
        </>
      )}
      <GamePreview game={viewing} onClose={() => setViewing(null)} />
    </>
  )
}
