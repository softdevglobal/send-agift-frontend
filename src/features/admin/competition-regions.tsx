import { useEffect, useState } from 'react'
import { ArrowRight, MapPinned, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { AdminCompetition } from '@/api/competitions'
import { getGamesControl, listAdminStates, type GamesControl, type Jurisdiction, type State } from '@/api/game-entries'
import type { AdminGameSummary } from '@/api/games'
import { Panel } from '@/features/admin/competition-panels'
import { flagOf } from '@/lib/country-options'
import { cn } from '@/lib/utils'

/** Whether players in one place can play this round right now. */
type Readiness = 'on' | 'off' | 'paused' | 'game_off'

const READINESS: Record<Readiness, { label: string; chip: string; dot: string }> = {
  on: { label: 'Can play', chip: 'border-emerald-200 bg-emerald-50 text-emerald-900', dot: 'bg-emerald-500' },
  off: { label: 'Games off', chip: 'border-red-200 bg-red-50 text-red-900', dot: 'bg-red-500' },
  paused: { label: 'Stopped', chip: 'border-red-200 bg-red-50 text-red-900', dot: 'bg-red-500' },
  game_off: { label: 'This game off', chip: 'border-amber-200 bg-amber-50 text-amber-950', dot: 'bg-amber-500' },
}

/** The same checks the server makes before a play, for one place. */
function readinessOf(j: Jurisdiction | undefined, gameId: string | undefined, chance: boolean): Readiness {
  if (!j || !j.play_enabled) return 'off'
  if (j.stopped_at) return 'paused'
  if (!gameId || !j.game_ids.includes(gameId)) return 'game_off'
  if (chance && !j.chance_games_enabled) return 'game_off'
  return 'on'
}

type Place = { key: string; name: string; readiness: Readiness }
type CountryPlaces = { id: string; name: string; iso: string; every: boolean; total: number; places: Place[] }

/**
 * Who can play this round: its countries, the states it is limited to (or
 * every state), and for each place whether games are switched on there in
 * Games control. A round can go live where nobody is allowed to play yet;
 * this says so instead of leaving players to find "Not eligible".
 */
export function CompetitionRegions({ comp, games }: { comp: AdminCompetition; games: AdminGameSummary[] }) {
  const [control, setControl] = useState<GamesControl | null>(null)
  const [statesBy, setStatesBy] = useState<Record<string, State[]>>({})
  const [failed, setFailed] = useState(false)
  const countryKey = comp.countries.map((c) => c.id).join(',')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getGamesControl(),
      Promise.all(
        comp.countries.map((c) =>
          listAdminStates(c.id)
            .then((list) => [c.id, list.filter((s) => s.is_active)] as const)
            .catch(() => [c.id, [] as State[]] as const),
        ),
      ),
    ])
      .then(([ctrl, pairs]) => {
        if (cancelled) return
        setControl(ctrl)
        setStatesBy(Object.fromEntries(pairs))
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
    // The countries decide what to load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryKey])

  const gameId = games.find((g) => g.slug === comp.game_slug)?.id
  const chance = comp.game_type === 'chance'
  const chosen = new Set((comp.states ?? []).map((s) => s.state_id))

  const countries: CountryPlaces[] = comp.countries.map((c) => {
    const states = statesBy[c.id] ?? []
    const find = (stateId: string | null) =>
      control?.jurisdictions.find((j) => j.country_id === c.id && (j.state_id ?? null) === stateId)
    if (states.length === 0) {
      return {
        id: c.id,
        name: c.name,
        iso: c.iso_code,
        every: true,
        total: 0,
        places: [{ key: c.id, name: 'Whole country', readiness: readinessOf(find(null), gameId, chance) }],
      }
    }
    const limited = states.some((s) => chosen.has(s.id))
    const open = limited ? states.filter((s) => chosen.has(s.id)) : states
    return {
      id: c.id,
      name: c.name,
      iso: c.iso_code,
      every: !limited,
      total: states.length,
      places: open.map((s) => ({ key: s.id, name: s.name, readiness: readinessOf(find(s.id), gameId, chance) })),
    }
  })

  const all = countries.flatMap((c) => c.places)
  const blocked = all.filter((p) => p.readiness !== 'on').length
  const programOff = control ? !control.program.enabled || !!control.program.stopped_at : false

  return (
    <Panel title="Who can play" icon={<MapPinned className="size-5 text-emerald-600" />}>
      {failed ? (
        <p className="text-sm text-muted-foreground">Could not check where games are switched on.</p>
      ) : !control ? (
        <p className="text-sm text-muted-foreground">Checking where games are switched on…</p>
      ) : (
        <div className="space-y-4">
          {programOff || blocked > 0 ? (
            <div className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 sm:flex-row sm:items-center sm:justify-between dark:bg-amber-950/30 dark:text-amber-100">
              <p className="flex items-start gap-2 text-sm">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <span>
                  {programOff
                    ? 'Games are switched off everywhere, so nobody can play this round.'
                    : blocked === all.length
                      ? 'Nobody can play this round yet: games are not switched on where it runs.'
                      : `Players in ${blocked} of ${all.length} places cannot play this round yet.`}{' '}
                  Players there see “Not eligible”.
                </span>
              </p>
              <Link
                to="/admin/games-control"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-950 px-3 py-2 text-xs font-bold tracking-wide text-amber-50 uppercase hover:bg-amber-900"
              >
                Open Games control
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          ) : (
            <p className="text-sm text-emerald-800 dark:text-emerald-300">
              Games are switched on everywhere this round runs.
            </p>
          )}

          {countries.map((c) => (
            <section key={c.id} className="rounded-xl border border-border/70 p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-lg leading-none">{flagOf(c.iso)}</span>
                <span className="font-semibold">{c.name}</span>
                {c.total > 0 ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    {c.every ? `Every state · ${c.total}` : `${c.places.length} of ${c.total} states`}
                  </span>
                ) : null}
              </div>
              <ul className="flex flex-wrap gap-2">
                {c.places.map((p) => (
                  <li
                    key={p.key}
                    title={READINESS[p.readiness].label}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm',
                      READINESS[p.readiness].chip,
                    )}
                  >
                    <span className={cn('size-2 rounded-full', READINESS[p.readiness].dot)} />
                    {p.name}
                    {p.readiness !== 'on' ? (
                      <span className="text-[11px] font-semibold opacity-80">· {READINESS[p.readiness].label}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Panel>
  )
}
