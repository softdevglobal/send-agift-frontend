import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Plus, Trophy } from 'lucide-react'

import {
  countryNames,
  createCompetition,
  listAdminCompetitions,
  type AdminCompetition,
  type CompetitionInput,
  type CompetitionStatus,
} from '@/api/competitions'
import { listCountries } from '@/api/countries'
import { listAdminGames, type AdminGameSummary } from '@/api/games'
import type { Country } from '@/api/types'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { AdminEmptyState, AdminPageHeader, adminPanelClass, formatDate } from '@/features/admin'
import { CompetitionForm } from '@/features/admin/competition-form'
import { CompetitionSheet } from '@/features/admin/competition-sheet'
import { competitionStatusLabel, competitionStatusTone } from '@/features/admin/games-format'
import { GameBadge, Loading, StatusPill } from '@/features/admin/games-ui'
import { getErrorMessage } from '@/lib/api'
import { formatPriceAmount } from '@/lib/money'
import { cn } from '@/lib/utils'

const filters: { value: CompetitionStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'live', label: 'Live' },
  { value: 'paused', label: 'Paused' },
  { value: 'closed', label: 'Closed' },
  { value: 'finalised', label: 'Finalised' },
  { value: 'cancelled', label: 'Cancelled' },
]

/** Superadmin: skill competitions, from draft to winners. */
export function AdminCompetitionsPage() {
  const [competitions, setCompetitions] = useState<AdminCompetition[]>([])
  const [games, setGames] = useState<AdminGameSummary[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [filter, setFilter] = useState<CompetitionStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  // The competition open in the side drawer.
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [list, gameList, countryList] = await Promise.all([
      listAdminCompetitions(),
      listAdminGames(),
      listCountries(),
    ])
    setCompetitions(list)
    setGames(gameList)
    setCountries(Array.isArray(countryList) ? countryList : [])
  }, [])

  useEffect(() => {
    load()
      .catch((err) => setError(getErrorMessage(err, 'Could not load competitions.')))
      .finally(() => setLoading(false))
  }, [load])

  const shown = useMemo(
    () =>
      filter === 'all'
        ? competitions
        : competitions.filter((c) =>
            filter === 'closed'
              ? c.effective_status === 'closed' || c.effective_status === 'frozen'
              : c.effective_status === filter,
          ),
    [competitions, filter],
  )

  async function create(input: CompetitionInput) {
    const created = await createCompetition(input)
    setCreating(false)
    await load()
    setSelectedId(created.id)
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Games"
        title="Competitions"
        description="Prize rounds run on the skill games, with a fixed prize or one that grows with every play. Each needs a funded reserve and published rules before it can be scheduled, and every action here is audited."
        action={
          <Button type="button" className="h-10" onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            New competition
          </Button>
        }
      />

      <FormAlert error={error} className="mb-6" />

      <div className="mb-5 flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors',
              filter === f.value
                ? 'bg-foreground text-background ring-foreground'
                : 'bg-background text-muted-foreground ring-border hover:text-foreground',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading />
      ) : shown.length === 0 ? (
        <AdminEmptyState
          icon={Trophy}
          title={filter === 'all' ? 'No competitions yet' : 'Nothing here'}
          description="Create a competition, fund its prize reserve and publish its rules. Then schedule it for players in the countries it runs in."
          action={
            <Button type="button" className="h-10" onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              New competition
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {shown.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className={cn(
                adminPanelClass,
                'group flex w-full flex-wrap items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/30 sm:px-5',
                selectedId === c.id && 'ring-2 ring-primary/40',
              )}
            >
              <GameBadge slug={c.game_slug} />
              <div className="min-w-0 flex-1 basis-60">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{c.title}</p>
                  <StatusPill tone={competitionStatusTone[c.effective_status]}>
                    {competitionStatusLabel(c.effective_status)}
                  </StatusPill>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {c.game_name} · {countryNames(c)} · {formatDate(c.starts_at)} → {formatDate(c.ends_at)}
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="font-medium">
                  {c.prize_currency
                    ? formatPriceAmount(c.final_prize_cents ?? (c.status === 'draft' ? c.start_prize_cents : c.current_prize_cents), c.prize_currency)
                    : c.prize_description}
                  {c.prize_growth_enabled ? (
                    <span className="ml-1.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                      GROWING
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  Round {c.round_no} · {c.eligible_play_count.toLocaleString()} plays
                  {c.under_review > 0 ? ` · ${c.under_review} to review` : ''}
                </p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>
      )}

      <CompetitionSheet
        id={selectedId}
        onClose={() => setSelectedId(null)}
        onChanged={() => void load()}
        games={games}
        countries={countries}
      />

      <CompetitionForm
        open={creating}
        onOpenChange={setCreating}
        title="New competition"
        description="Set it up step by step. It starts as a draft you publish once the prize is funded."
        games={games}
        countries={countries}
        submitLabel="Create draft"
        onSubmit={create}
      />
    </>
  )
}
