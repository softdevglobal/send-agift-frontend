import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Check, LoaderCircle, ShieldAlert, X } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import {
  getAdminGameLeaderboard,
  listAdminGameScores,
  reviewGameScore,
  type AdminGameLeaderboard,
  type AdminGameScore,
  type ScoreStatus,
} from '@/api/games'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { AdminPageHeader, adminPanelClass, formatDate } from '@/features/admin'
import {
  formatPlayTime,
  formatScore,
  scoreStatusLabel,
  scoreStatusTone,
} from '@/features/admin/games-format'
import {
  GameBadge,
  Loading,
  PlayerCell,
  Podium,
  ReasonDialog,
  StatusPill,
} from '@/features/admin/games-ui'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

const filters: { value: ScoreStatus | ''; label: string }[] = [
  { value: 'manual_review', label: 'Under review' },
  { value: '', label: 'Recent' },
  { value: 'rejected', label: 'Rejected' },
]

/** Superadmin: one game's full leaderboard and its anti-cheat review queue. */
export function AdminGameDetailPage() {
  const { slug = '' } = useParams()
  const [board, setBoard] = useState<AdminGameLeaderboard | null>(null)
  const [scores, setScores] = useState<AdminGameScore[]>([])
  const [filter, setFilter] = useState<ScoreStatus | ''>('manual_review')
  const [loading, setLoading] = useState(true)
  const [scoresLoading, setScoresLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<AdminGameScore | null>(null)

  const loadBoard = useCallback(() => getAdminGameLeaderboard(slug).then(setBoard), [slug])
  const loadScores = useCallback(
    () => listAdminGameScores(slug, filter || undefined).then(setScores),
    [slug, filter],
  )

  useEffect(() => {
    setLoading(true)
    loadBoard()
      .catch((err) => setError(getErrorMessage(err, 'Could not load the leaderboard.')))
      .finally(() => setLoading(false))
  }, [loadBoard])

  useEffect(() => {
    setScoresLoading(true)
    loadScores()
      .catch((err) => setError(getErrorMessage(err, 'Could not load scores.')))
      .finally(() => setScoresLoading(false))
  }, [loadScores])

  async function accept(score: AdminGameScore) {
    setBusyId(score.session_id)
    setError(null)
    try {
      await reviewGameScore(score.session_id, { status: 'accepted' })
      setNotice(`Accepted ${formatScore(score.score)} for ${score.player.name}.`)
      await Promise.all([loadBoard(), loadScores()])
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  async function reject(reason: string) {
    if (!rejecting) return
    await reviewGameScore(rejecting.session_id, { status: 'rejected', reason })
    setNotice(`Rejected ${formatScore(rejecting.score)} for ${rejecting.player.name}.`)
    await Promise.all([loadBoard(), loadScores()])
  }

  if (loading && !board) return <Loading />

  const game = board?.game
  const entries = board?.entries ?? []

  return (
    <>
      <Link
        to="/admin/games"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All games
      </Link>

      <AdminPageHeader
        eyebrow="Leaderboard"
        title={game?.name ?? 'Game'}
        description={
          game
            ? `${game.plays.toLocaleString()} plays by ${game.players.toLocaleString()} players. Ranked by best verified score; ties go to the faster time.`
            : undefined
        }
        action={game ? <GameBadge slug={game.slug} className="size-14" /> : null}
      />

      <FormAlert error={error} notice={notice} className="mb-6" />

      {entries.length > 0 ? (
        <>
          <Podium entries={entries} slug={slug} />
          <div className={cn(adminPanelClass, 'mt-4 overflow-x-auto')}>
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                  <th className="px-4 py-3 font-medium">Rank</th>
                  <th className="px-4 py-3 font-medium">Player</th>
                  <th className="px-4 py-3 text-right font-medium">Best score</th>
                  <th className="px-4 py-3 text-right font-medium">Time</th>
                  <th className="px-4 py-3 text-right font-medium">Plays</th>
                  <th className="px-4 py-3 font-medium">Achieved</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((row) => (
                  <tr key={`${row.rank}-${row.player.name}-${row.achieved_at}`} className="border-b border-border/30 last:border-0">
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold',
                          row.rank === 1
                            ? 'bg-amber-100 text-amber-800'
                            : row.rank <= 3
                              ? 'bg-muted text-foreground'
                              : 'text-muted-foreground',
                        )}
                      >
                        {row.rank}
                      </span>
                    </td>
                    <td className="max-w-[260px] px-4 py-3">
                      <PlayerCell player={row.player} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatScore(row.best_score)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                      {formatPlayTime(row.duration_ms)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.plays}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(row.achieved_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className={cn(adminPanelClass, 'px-6 py-14 text-center text-sm text-muted-foreground')}>
          No verified score on this game yet.
        </div>
      )}

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl tracking-tight">
              <ShieldAlert className="size-5 text-amber-600" />
              Score review
            </h2>
            <p className="text-sm text-muted-foreground">
              Scores are held when a round looks too fast or the app disagreed with the server's replay.
            </p>
          </div>
          <div className="flex rounded-full bg-muted p-1">
            {filters.map((f) => (
              <button
                key={f.label}
                type="button"
                onClick={() => setFilter(f.value)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  filter === f.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {scoresLoading ? (
          <div className="flex justify-center py-10">
            <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : scores.length === 0 ? (
          <div className={cn(adminPanelClass, 'px-6 py-10 text-center text-sm text-muted-foreground')}>
            {filter === 'manual_review'
              ? 'Nothing waiting for review.'
              : 'No scores yet.'}
          </div>
        ) : (
          <div className="space-y-2">
            {scores.map((score) => {
              const reviewable = score.validation_status === 'manual_review' || score.validation_status === 'accepted'
              return (
                <div
                  key={score.session_id}
                  className={cn(adminPanelClass, 'flex flex-wrap items-center gap-4 px-4 py-3.5')}
                >
                  <div className="min-w-0 flex-1 basis-56">
                    <PlayerCell player={score.player} />
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">{formatScore(score.score)}</p>
                    <p className="text-xs text-muted-foreground">
                      {score.moves_count} moves · {formatPlayTime(score.duration_ms)}
                    </p>
                  </div>
                  <div className="min-w-0 basis-56">
                    <StatusPill tone={scoreStatusTone(score.validation_status)}>
                      {scoreStatusLabel(score.validation_status)}
                    </StatusPill>
                    {score.review_reason ? (
                      <p className="mt-1 truncate text-xs text-muted-foreground" title={score.review_reason}>
                        {score.review_reason}
                      </p>
                    ) : null}
                    <p className="text-[11px] text-muted-foreground">{formatDate(score.created_at)}</p>
                  </div>
                  {reviewable ? (
                    <div className="ml-auto flex gap-2">
                      {score.validation_status === 'manual_review' ? (
                        <Button
                          type="button"
                          size="sm"
                          className="h-8"
                          disabled={busyId === score.session_id}
                          onClick={() => accept(score)}
                        >
                          <Check className="size-3.5" />
                          Accept
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="h-8"
                        disabled={busyId === score.session_id}
                        onClick={() => setRejecting(score)}
                      >
                        <X className="size-3.5" />
                        Reject
                      </Button>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </section>

      <ReasonDialog
        open={rejecting !== null}
        onOpenChange={(open) => {
          if (!open) setRejecting(null)
        }}
        title="Reject this score?"
        description={
          rejecting
            ? `${formatScore(rejecting.score)} by ${rejecting.player.name} will be removed from the leaderboard.`
            : ''
        }
        confirmLabel="Reject score"
        onConfirm={reject}
      />
    </>
  )
}
