import { useEffect, useState } from 'react'
import { Crown, Medal } from 'lucide-react'

import {
  getCompetitionLeaderboard,
  listWinners,
  type AdminCompetition,
  type CompetitionLeaderRow,
  type CompetitionWinner,
} from '@/api/competitions'
import { formatScore } from '@/features/admin/games-format'
import { Loading, StatusPill } from '@/features/admin/games-ui'
import { flagOf } from '@/lib/country-options'
import { formatPriceAmount } from '@/lib/money'
import { cn } from '@/lib/utils'

/** Once a round reaches these states its winners are the result to show. */
const FINISHED = new Set(['finalised', 'frozen', 'closed'])

const medalTone = ['bg-amber-300 text-amber-950', 'bg-slate-300 text-slate-900', 'bg-orange-300 text-orange-950']

function rankCell(rank: number) {
  return (
    <span
      className={cn(
        'inline-flex size-7 items-center justify-center rounded-md font-poster text-sm',
        medalTone[rank - 1] ?? 'bg-accent text-brand-ink',
      )}
    >
      {rank}
    </span>
  )
}

const winnerTone: Record<CompetitionWinner['status'], 'good' | 'warn' | 'bad' | 'neutral'> = {
  validated: 'good',
  pending_validation: 'warn',
  disqualified: 'bad',
  unclaimed: 'neutral',
  replaced: 'neutral',
}

/**
 * The standings for one competition as a small table: its winners once the
 * round has finished, otherwise the current top three.
 */
export function CompetitionStandings({
  comp,
  limit = 3,
}: {
  comp: AdminCompetition
  /** Rows to show from the live leaderboard. */
  limit?: number
}) {
  const showWinners = FINISHED.has(comp.effective_status)
  const [leaders, setLeaders] = useState<CompetitionLeaderRow[] | null>(null)
  const [winners, setWinners] = useState<CompetitionWinner[] | null>(null)

  useEffect(() => {
    let cancelled = false
    setLeaders(null)
    setWinners(null)
    getCompetitionLeaderboard(comp.id)
      .then((rows) => {
        if (!cancelled) setLeaders(rows)
      })
      .catch(() => {
        if (!cancelled) setLeaders([])
      })
    if (showWinners) {
      listWinners(comp.id)
        .then((rows) => {
          if (!cancelled) setWinners(rows)
        })
        .catch(() => {
          if (!cancelled) setWinners([])
        })
    }
    return () => {
      cancelled = true
    }
  }, [comp.id, showWinners])

  // A finished round with winners picked shows them; otherwise the leaders.
  const winnerRows = (winners ?? []).filter((row) => row.status !== 'replaced')
  const useWinners = showWinners && winnerRows.length > 0

  if (leaders === null || (showWinners && winners === null)) return <Loading />

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.16em] text-brand-ink uppercase dark:text-foreground">
        {useWinners ? <Crown className="size-3.5 text-amber-500" /> : <Medal className="size-3.5 text-brand-violet" />}
        {useWinners ? 'Winners' : 'Top of the leaderboard'}
      </p>
      {useWinners ? (
        <table className="w-full overflow-hidden rounded-lg text-sm">
          <thead>
            <tr className="bg-brand-ink text-left text-white">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Winner</th>
              <th className="px-3 py-2 text-right">Score</th>
              <th className="px-3 py-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-ink/10">
            {winnerRows
              .sort((a, b) => a.prize_position - b.prize_position)
              .map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2.5">{rankCell(row.prize_position)}</td>
                  <td className="px-3 py-2.5">
                    <p className="font-bold">{row.display_name || 'Player'}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {row.country_name}
                      {row.prize_value_cents != null && comp.prize_currency
                        ? ` · ${formatPriceAmount(row.prize_value_cents, comp.prize_currency)}`
                        : ''}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 text-right font-poster tabular-nums">{formatScore(row.score)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <StatusPill tone={winnerTone[row.status]}>{row.status.replace('_', ' ')}</StatusPill>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      ) : leaders.length ? (
        <table className="w-full overflow-hidden rounded-lg text-sm">
          <thead>
            <tr className="bg-brand-ink text-left text-white">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Player</th>
              <th className="px-3 py-2 text-right">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-ink/10">
            {leaders.slice(0, limit).map((row) => (
              <tr key={`${row.rank}-${row.customer_id ?? row.display_name}`}>
                <td className="px-3 py-2.5">{rankCell(row.rank)}</td>
                <td className="px-3 py-2.5">
                  <p className="font-bold">{row.display_name || 'Player'}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {row.country_code ? `${flagOf(row.country_code)} ` : ''}
                    {row.country_name}
                  </p>
                </td>
                <td className="px-3 py-2.5 text-right font-poster tabular-nums">{formatScore(row.score)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="rounded-lg bg-accent px-3 py-4 text-center text-sm text-brand-ink/70">
          {comp.status === 'draft' || comp.effective_status === 'scheduled'
            ? 'No scores yet. The leaderboard fills once it goes live.'
            : 'No verified scores yet.'}
        </p>
      )}
    </div>
  )
}
