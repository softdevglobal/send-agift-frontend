import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Plus, Trophy } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import {
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { AdminEmptyState, AdminPageHeader, adminPanelClass, formatDate } from '@/features/admin'
import { CompetitionForm } from '@/features/admin/competition-form'
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
  { value: 'closed', label: 'Closed' },
  { value: 'finalised', label: 'Finalised' },
  { value: 'cancelled', label: 'Cancelled' },
]

/** Superadmin: skill competitions, from draft to winners. */
export function AdminCompetitionsPage() {
  const navigate = useNavigate()
  const [competitions, setCompetitions] = useState<AdminCompetition[]>([])
  const [games, setGames] = useState<AdminGameSummary[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [filter, setFilter] = useState<CompetitionStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

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
    navigate(`/admin/competitions/${created.id}`)
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Games"
        title="Competitions"
        description="Prize competitions run on the skill games. Each needs a funded prize reserve and published rules before it can be scheduled, and every action here is audited."
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
          description="Create a competition, fund its prize reserve and publish its rules — then schedule it for players in its country."
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
            <Link
              key={c.id}
              to={`/admin/competitions/${c.id}`}
              className={cn(
                adminPanelClass,
                'group flex flex-wrap items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/30 sm:px-5',
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
                  {c.game_name} · {c.country_name} · {formatDate(c.starts_at)} → {formatDate(c.ends_at)}
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="font-medium">
                  {c.prize_value_amount !== undefined && c.prize_currency
                    ? formatPriceAmount(c.prize_value_amount, c.prize_currency)
                    : c.prize_description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {c.attempts} attempts · {c.submissions} scores
                  {c.under_review > 0 ? ` · ${c.under_review} to review` : ''}
                </p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      )}

      <Sheet open={creating} onOpenChange={setCreating}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>New competition</SheetTitle>
            <SheetDescription>
              It starts as a draft. Publish it once the prize reserve is funded and the rules are written.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <CompetitionForm
              games={games}
              countries={countries}
              submitLabel="Create draft"
              onSubmit={create}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
