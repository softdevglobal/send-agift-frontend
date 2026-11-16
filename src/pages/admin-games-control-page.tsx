import { useCallback, useEffect, useRef, useState } from 'react'
import { Globe2, LoaderCircle, MapPin, OctagonX, Pencil, Plus, Power, ShieldCheck, Trash2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import { listCountries } from '@/api/countries'
import {
  createState,
  deleteState,
  importStates,
  getGamesControl,
  liftJurisdiction,
  listAdminStates,
  listShortfalls,
  resolveShortfall,
  setProgram,
  stopJurisdiction,
  stopProgram,
  updateState,
  type EntryShortfall,
  type GamesControl,
  type Jurisdiction,
  type State,
  type SwitchState,
} from '@/api/game-entries'
import { listAdminGames, type AdminGameSummary } from '@/api/games'
import type { Country, PlaceDetails } from '@/api/types'
import { FormAlert } from '@/components/common/form-alert'
import { AddressAutocomplete } from '@/components/common/place-autocomplete'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { AdminEmptyState, AdminPageHeader } from '@/features/admin'
import { JurisdictionWizard } from '@/features/admin/jurisdiction-wizard'
import { getErrorMessage } from '@/lib/api'
import { isSuperAdmin } from '@/lib/auth'
import { selectClassName } from '@/lib/form-styles'
import { flagOf } from '@/lib/country-options'
import { cn } from '@/lib/utils'
import { askText } from '@/components/common/ask-dialog'

const TABS = [
  { id: 'switches', label: 'Where games are on' },
  { id: 'states', label: 'States and regions' },
  { id: 'review', label: 'Review cases' },
] as const
type Tab = (typeof TABS)[number]['id']

const number = new Intl.NumberFormat()

const STATE_TONE: Record<SwitchState, string> = {
  OFF: 'bg-muted text-muted-foreground',
  ON: 'bg-emerald-100 text-emerald-900',
  STOPPED: 'bg-red-100 text-red-900',
}

/** OFF, ON or STOPPED as words, never colour alone. */
function StatePill({ state }: { state: SwitchState }) {
  return (
    <span className={cn('rounded-md px-2 py-0.5 text-[11px] font-bold tracking-[0.1em]', STATE_TONE[state])}>{state}</span>
  )
}

type ReasonAsk = {
  title: string
  description: string
  confirmLabel: string
  tone?: 'default' | 'danger' | 'emergency'
  label?: string
  placeholder?: string
}

/** Asks why, in the site's own dialog. Null when cancelled. */
function askReason({ label = 'Reason', placeholder = 'Say briefly why', ...rest }: ReasonAsk) {
  return askText({ ...rest, label, placeholder, hint: 'Recorded in the audit log with your name.' })
}

/**
 * Games control: games and game entries are off everywhere until they are
 * switched on here, for the programme, then for a country or state, then
 * for each game. Any level can be stopped at once.
 */
export function AdminGamesControlPage() {
  const [params, setParams] = useSearchParams()
  const tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'switches') as Tab
  const [countries, setCountries] = useState<Country[]>([])

  useEffect(() => {
    listCountries()
      .then((list) => setCountries(Array.isArray(list) ? list : []))
      .catch(() => setCountries([]))
  }, [])

  return (
    <>
      <AdminPageHeader
        title="Games control"
        description="Games and game entries are off by default. Switch them on per country, per state and per game, and stop them at once if you need to."
      />
      <nav className="mb-5 flex gap-1 overflow-x-auto border-b border-brand-ink/15">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setParams({ tab: t.id }, { replace: true })}
            className={cn(
              '-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-semibold transition-colors',
              tab === t.id ? 'border-brand-ink text-brand-ink' : 'border-transparent text-muted-foreground hover:text-brand-ink',
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {tab === 'switches' ? <SwitchesPanel countries={countries} /> : null}
      {tab === 'states' ? <StatesPanel countries={countries} /> : null}
      {tab === 'review' ? <ReviewPanel /> : null}
    </>
  )
}

// ─── Switches ──────────────────────────────────────────────────────────────

function SwitchesPanel({ countries }: { countries: Country[] }) {
  const [control, setControl] = useState<GamesControl | null>(null)
  const [games, setGames] = useState<AdminGameSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<Jurisdiction | 'new' | null>(null)
  const canEdit = isSuperAdmin()

  const load = useCallback(async () => {
    try {
      setControl(await getGamesControl())
      setError(null)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load the controls.'))
    }
  }, [])

  useEffect(() => {
    void load()
    listAdminGames()
      .then(setGames)
      .catch(() => setGames([]))
  }, [load])

  async function run(done: string, fn: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await fn()
      await load()
      setNotice(done)
    } catch (err) {
      setError(getErrorMessage(err, 'That did not work.'))
    } finally {
      setBusy(false)
    }
  }

  if (!control) {
    return error ? (
      <FormAlert error={error} />
    ) : (
      <div className="flex justify-center py-16">
        <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }
  const program = control.program

  return (
    <>
      <FormAlert error={error} notice={notice} className="mb-4" />

      <section className="mb-5 rounded-xl border-2 border-brand-ink/15 bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 font-poster text-xl">
              Whole programme <StatePill state={program.state} />
            </p>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {program.state === 'STOPPED'
                ? `Stopped: ${program.stopped_reason ?? 'no reason given'}. Nobody can earn entries or start a play. Refunds and prizes already owed carry on.`
                : program.state === 'ON'
                  ? 'On. Customers can earn and play only where a country or state below is also on.'
                  : 'Off. Nobody can earn game entries or play, whatever is set below.'}
            </p>
          </div>
          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              {program.state !== 'ON' ? (
                <Button
                  disabled={busy}
                  onClick={async () => {
                    const reason = await askReason({
                      title: 'Switch the programme on?',
                      description: 'Customers can then earn game entries and play wherever a country or state below is also on.',
                      confirmLabel: 'Switch on',
                    })
                    if (reason) void run('The programme is on.', () => setProgram(true, reason))
                  }}
                >
                  <Power className="size-4" />
                  {program.state === 'STOPPED' ? 'Lift stop and switch on' : 'Switch on'}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={async () => {
                    const reason = await askReason({
                      title: 'Switch the programme off?',
                      description: 'Nobody can earn game entries or start a play anywhere until it is switched on again.',
                      confirmLabel: 'Switch off',
                      tone: 'danger',
                    })
                    if (reason) void run('The programme is off.', () => setProgram(false, reason))
                  }}
                >
                  Switch off
                </Button>
              )}
              {program.state !== 'STOPPED' ? (
                <Button
                  variant="destructive"
                  disabled={busy}
                  onClick={async () => {
                    const reason = await askReason({
                      title: 'Emergency off everywhere?',
                      description: 'This stops all earning and all new plays in every country and state at once. Plays already started can finish.',
                      confirmLabel: 'Stop everything',
                      tone: 'emergency',
                      placeholder: 'What happened?',
                    })
                    if (reason) void run('Emergency off is in force everywhere.', () => stopProgram(reason))
                  }}
                >
                  <OctagonX className="size-4" />
                  Emergency off
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Grouped by country. A state does not inherit from its country: each one is switched on by itself. A
          country with no states is switched on as a whole.
        </p>
        {canEdit ? (
          <Button className="h-11 px-5" onClick={() => setEditing('new')}>
            <Plus className="size-4" />
            Add country or state
          </Button>
        ) : null}
      </div>

      {control.jurisdictions.length === 0 ? (
        <AdminEmptyState
          icon={ShieldCheck}
          title="Nothing is switched on"
          description="Add a country or state, set its minimum age and official rules, and choose the games that can be played there."
        />
      ) : (
        <div className="space-y-4">
          {groupByCountry(control.jurisdictions).map((group) => (
            <CountryCard
              key={group.countryId}
              group={group}
              iso={countries.find((c) => c.id === group.countryId)?.iso_code}
              games={games}
              canEdit={canEdit}
              busy={busy}
              onEdit={setEditing}
              onStop={async (places) => {
                const one = places.length === 1 ? places[0] : null
                const reason = await askReason({
                  title: one
                    ? `Emergency off for ${one.state_name ?? one.country_name}?`
                    : `Emergency off for all of ${group.countryName}?`,
                  description: one
                    ? 'This stops all earning and all new plays there at once. Plays already started can finish.'
                    : `This stops all earning and all new plays in ${places.length} places at once. Plays already started can finish.`,
                  confirmLabel: 'Stop it now',
                  tone: 'emergency',
                  placeholder: 'What happened?',
                })
                if (reason) {
                  void run('Emergency off is in force there.', async () => {
                    for (const j of places) await stopJurisdiction(j.id, reason)
                  })
                }
              }}
              onLift={async (j) => {
                const reason = await askReason({
                  title: `Lift the stop for ${j.state_name ?? j.country_name}?`,
                  description: 'Earning and play there go back to how they are set.',
                  confirmLabel: 'Lift stop',
                })
                if (reason) void run('Stop lifted.', () => liftJurisdiction(j.id, reason))
              }}
            />
          ))}
        </div>
      )}

      {editing ? (
        <JurisdictionWizard
          existing={editing === 'new' ? null : editing}
          countries={countries}
          games={games}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null)
            await load()
            setNotice('Settings saved.')
          }}
        />
      ) : null}
    </>
  )
}

// ─── Places grouped by country ────────────────────────────────────────────

type CountryGroup = { countryId: string; countryName: string; places: Jurisdiction[] }

function groupByCountry(list: Jurisdiction[]): CountryGroup[] {
  const groups = new Map<string, CountryGroup>()
  for (const j of list) {
    let g = groups.get(j.country_id)
    if (!g) {
      g = { countryId: j.country_id, countryName: j.country_name, places: [] }
      groups.set(j.country_id, g)
    }
    g.places.push(j)
  }
  const out = [...groups.values()]
  for (const g of out) g.places.sort((a, b) => (a.state_name ?? '').localeCompare(b.state_name ?? ''))
  return out.sort((a, b) => a.countryName.localeCompare(b.countryName))
}

/** The settings two places can share, as one comparable string. */
function settingsKey(j: Jurisdiction) {
  return [
    j.earning_enabled,
    j.play_enabled,
    j.chance_games_enabled,
    j.min_age,
    j.customer_daily_cap ?? '',
    j.product_daily_cap ?? '',
    j.free_entries_per_day,
    [...j.game_ids].sort().join(','),
  ].join('|')
}

function limitsOf(j: Jurisdiction) {
  return [
    `Minimum age ${j.min_age}`,
    j.customer_daily_cap ? `up to ${j.customer_daily_cap} entries a customer a day` : null,
    j.product_daily_cap ? `${j.product_daily_cap} a product a day` : null,
    j.free_entries_per_day > 0 ? `${j.free_entries_per_day} free a day` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** One country: what is on across its places, then each place on its own row. */
function CountryCard({
  group,
  iso,
  games,
  canEdit,
  busy,
  onEdit,
  onStop,
  onLift,
}: {
  group: CountryGroup
  iso?: string
  games: AdminGameSummary[]
  canEdit: boolean
  busy: boolean
  onEdit: (j: Jurisdiction) => void
  onStop: (places: Jurisdiction[]) => void
  onLift: (j: Jurisdiction) => void
}) {
  const { places } = group
  const whole = places.length === 1 && !places[0].state_name
  const stopped = places.filter((j) => j.state === 'STOPPED')
  const running = places.filter((j) => j.state !== 'STOPPED')
  const shared = new Set(places.map(settingsKey)).size === 1
  const gameNames = (j: Jurisdiction) =>
    j.game_ids.length === 0 ? 'none' : j.game_ids.map((id) => games.find((g) => g.id === id)?.name ?? 'a game').join(', ')
  const count = (pick: (j: Jurisdiction) => boolean) => places.filter((j) => j.state !== 'STOPPED' && pick(j)).length

  return (
    <article className="overflow-hidden rounded-xl border-2 border-brand-ink/15 bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-brand-ink/10 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-3xl leading-none">{flagOf(iso)}</span>
          <div className="min-w-0">
            <p className="truncate font-poster text-2xl">{group.countryName}</p>
            <p className="text-xs text-muted-foreground">
              {whole
                ? 'Whole country'
                : `${places.length} ${places.length === 1 ? 'state' : 'states'} switched on${
                    stopped.length ? ` · ${stopped.length} stopped` : ''
                  }`}
            </p>
          </div>
        </div>
        {canEdit && running.length > 1 ? (
          <Button size="sm" variant="destructive" disabled={busy} onClick={() => onStop(running)}>
            <OctagonX className="size-3.5" />
            Emergency off for all
          </Button>
        ) : null}
      </header>

      <div className="grid gap-2 px-5 pt-4 sm:grid-cols-3">
        {(
          [
            ['Earning entries', count((j) => j.earning_enabled)],
            ['Playing games', count((j) => j.play_enabled)],
            ['Chance games', count((j) => j.chance_games_enabled)],
          ] as const
        ).map(([label, n]) => (
          <div key={label} className="rounded-lg bg-muted/60 px-3 py-2">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-bold">
              {n === 0 ? 'OFF' : whole ? 'ON' : n === places.length ? `ON in all ${n}` : `ON in ${n} of ${places.length}`}
            </p>
          </div>
        ))}
      </div>

      {shared ? (
        <div className="px-5 pt-3 text-sm">
          <p className="text-muted-foreground">
            {whole ? '' : 'Same settings in every state · '}
            {limitsOf(places[0])}
          </p>
          <details className="mt-1">
            <summary className="cursor-pointer font-medium">
              {places[0].game_ids.length} {places[0].game_ids.length === 1 ? 'game' : 'games'} on
            </summary>
            <p className="mt-1 text-muted-foreground">{gameNames(places[0])}</p>
          </details>
        </div>
      ) : (
        <p className="px-5 pt-3 text-sm text-amber-800 dark:text-amber-300">Settings differ between states; see each row.</p>
      )}

      <ul className="mt-4 divide-y divide-brand-ink/10 border-t-2 border-brand-ink/10">
        {places.map((j) => (
          <li key={j.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-semibold">
                <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{j.state_name ?? 'Whole country'}</span>
                <StatePill state={j.state} />
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <OnBadge label="Earning" on={j.earning_enabled} />
                <OnBadge label="Playing" on={j.play_enabled} />
                <OnBadge label="Chance" on={j.chance_games_enabled} />
                {!shared ? (
                  <span>
                    · {limitsOf(j)} · {j.game_ids.length} games
                  </span>
                ) : null}
              </p>
              {j.state === 'STOPPED' ? (
                <p className="mt-1 text-xs text-red-800">Stopped: {j.stopped_reason}</p>
              ) : null}
              {!j.official_rules ? (
                <p className="mt-1 text-xs text-amber-800">No official rules yet: required before anything is switched on.</p>
              ) : null}
            </div>
            {canEdit ? (
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="outline" onClick={() => onEdit(j)}>
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
                {j.state === 'STOPPED' ? (
                  <Button size="sm" disabled={busy} onClick={() => onLift(j)}>
                    Lift stop
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                    disabled={busy}
                    onClick={() => onStop([j])}
                  >
                    <OctagonX className="size-3.5" />
                    Off
                  </Button>
                )}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </article>
  )
}

function OnBadge({ label, on }: { label: string; on: boolean }) {
  return (
    <span
      className={cn(
        'rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase',
        on ? 'bg-emerald-100 text-emerald-900' : 'bg-muted text-muted-foreground line-through',
      )}
    >
      {label}
    </span>
  )
}

// ─── States ────────────────────────────────────────────────────────────────

function StatesPanel({ countries }: { countries: Country[] }) {
  const [countryId, setCountryId] = useState('')
  const [items, setItems] = useState<State[] | null>(null)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const canEdit = isSuperAdmin()
  const codeRef = useRef<HTMLInputElement>(null)
  const countryCode = countries.find((c) => c.id === countryId)?.iso_code

  useEffect(() => {
    if (!countryId && countries[0]) setCountryId(countries[0].id)
  }, [countries, countryId])

  function addState(stateCode: string, stateName: string) {
    const clean = { code: stateCode.trim().toUpperCase(), name: stateName.trim() }
    if (!clean.code || !clean.name) return setError('Give the state a code and a name.')
    const taken = (items ?? []).find(
      (s) => s.name.toLowerCase() === clean.name.toLowerCase() || s.code.toUpperCase() === clean.code,
    )
    if (taken) return setError(`${taken.name} (${taken.code}) is already on the list.`)
    void run(`${clean.name} added.`, () =>
      createState({ country_id: countryId, code: clean.code, name: clean.name, is_active: true }),
    ).then(() => {
      setCode('')
      setName('')
    })
  }

  /** A state picked from Google: added at once when it comes with a short code. */
  function pickState(place: PlaceDetails) {
    const stateName = (place.region || place.name || '').trim()
    const short = (place.region_code ?? '').trim()
    // Some countries have no short form: Google repeats the name. Then the
    // admin types a code.
    const usable = short && short.length <= 10 && short.toLowerCase() !== stateName.toLowerCase()
    if (stateName && usable) {
      addState(short, stateName)
      return
    }
    setName(stateName)
    setCode('')
    setNotice(null)
    setError(stateName ? `Google has no short code for ${stateName}. Type one, then add it.` : null)
    codeRef.current?.focus()
  }

  const load = useCallback(async () => {
    if (!countryId) return
    try {
      setItems(await listAdminStates(countryId))
      setError(null)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load the states.'))
      setItems([])
    }
  }, [countryId])

  useEffect(() => {
    setItems(null)
    void load()
  }, [load])

  async function run(done: string, fn: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await fn()
      await load()
      setNotice(done)
    } catch (err) {
      setError(getErrorMessage(err, 'That did not work.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="st-country">Country</Label>
          <select id="st-country" className={cn(selectClassName, 'w-auto min-w-52')} value={countryId} onChange={(e) => setCountryId(e.target.value)}>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <p className="max-w-xl flex-1 pb-2 text-sm text-muted-foreground">
          Customers choose from this list when they sign up. It is fetched from Google the first time a customer
          needs it; import again to pick up any that are missing.
        </p>
        {canEdit ? (
          <Button
            type="button"
            variant="outline"
            className="h-10 px-4"
            disabled={busy || !countryId}
            onClick={() =>
              void run('States imported from Google.', async () => {
                const { total } = await importStates(countryId)
                return total
              })
            }
          >
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Globe2 className="size-4" />}
            Import from Google
          </Button>
        ) : null}
      </div>
      <FormAlert error={error} notice={notice} className="mb-4" />

      {canEdit ? (
        <form
          className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border-2 border-brand-ink/15 bg-card p-4"
          onSubmit={(e) => {
            e.preventDefault()
            addState(code, name)
          }}
        >
          <AddressAutocomplete
            key={countryId}
            id="st-name"
            className="min-w-60 flex-1"
            types="states"
            countryCode={countryCode}
            value={name}
            onQueryChange={setName}
            onSelect={pickState}
            disabled={busy || !countryId}
            label="Find a state or region"
            placeholder={`Start typing a state in ${countries.find((c) => c.id === countryId)?.name ?? 'this country'}…`}
            helperText=""
          />
          <div className="space-y-1.5">
            <Label htmlFor="st-code">Code</Label>
            <Input
              id="st-code"
              ref={codeRef}
              className="w-28"
              value={code}
              maxLength={10}
              onChange={(e) => setCode(e.target.value)}
              placeholder="NSW"
            />
          </div>
          <Button type="submit" className="h-10 px-4" disabled={busy || !countryId}>
            <Plus className="size-4" />
            Add state
          </Button>
          <p className="basis-full text-xs text-muted-foreground">
            Pick a state from the suggestions and it is added with its code straight away. Or type a name and code
            yourself and press Add state.
          </p>
        </form>
      ) : null}

      {items === null ? (
        <div className="flex justify-center py-12">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <AdminEmptyState icon={MapPin} title="No states for this country" description="Sign-up does not ask customers here for a state." />
      ) : (
        <ul className="divide-y divide-brand-ink/10 overflow-hidden rounded-xl border-2 border-brand-ink/15 bg-card">
          {items.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <span>
                <span className="font-semibold">{s.name}</span> <span className="text-muted-foreground">{s.code}</span>
                {!s.is_active ? <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase">Not offered</span> : null}
              </span>
              {canEdit ? (
                <span className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    Offered at sign-up
                    <Switch
                      checked={s.is_active}
                      disabled={busy}
                      onCheckedChange={(on) =>
                        void run(`${s.name} updated.`, () => updateState(s.id, { code: s.code, name: s.name, is_active: on }))
                      }
                    />
                  </label>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    aria-label={`Delete ${s.name}`}
                    onClick={() => void run(`${s.name} deleted.`, () => deleteState(s.id))}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

// ─── Review cases ──────────────────────────────────────────────────────────

function ReviewPanel() {
  const [items, setItems] = useState<EntryShortfall[] | null>(null)
  const [status, setStatus] = useState<'open' | 'resolved'>('open')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const canEdit = isSuperAdmin()

  const load = useCallback(async () => {
    try {
      setItems(await listShortfalls(status))
      setError(null)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load the review cases.'))
      setItems([])
    }
  }, [status])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select aria-label="Status" className={cn(selectClassName, 'w-auto')} value={status} onChange={(e) => setStatus(e.target.value as 'open' | 'resolved')}>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
        </select>
        <p className="max-w-2xl text-sm text-muted-foreground">
          When an order is refunded after its entries were used, only the entries the customer still holds are taken
          back. The rest is listed here for a decision. A balance never goes below zero.
        </p>
      </div>
      <FormAlert error={error} notice={notice} className="mb-4" />
      {items === null ? (
        <div className="flex justify-center py-12">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <AdminEmptyState icon={ShieldCheck} title={status === 'open' ? 'Nothing to review' : 'No resolved cases'} description="Refunds have taken back every entry they should." />
      ) : (
        <ul className="space-y-3">
          {items.map((c) => (
            <li key={c.id} className="rounded-xl border-2 border-brand-ink/15 bg-card p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{c.customer_name || c.customer_email}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.customer_email} · order {c.order_number ?? c.order_id.slice(0, 8)} ·{' '}
                    {new Date(c.created_at).toLocaleDateString()}
                  </p>
                  <p className="mt-2">
                    Granted {number.format(c.entries_granted)}, took back {number.format(c.entries_recovered)},{' '}
                    <strong>{number.format(c.entries_short)} already used</strong>.
                  </p>
                  {c.resolution ? <p className="mt-1 text-muted-foreground">Decision: {c.resolution}</p> : null}
                </div>
                {canEdit && c.status === 'open' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const resolution = await askReason({
                        title: 'Resolve this case',
                        description: 'Write down what was decided, so the customer’s history explains it.',
                        confirmLabel: 'Resolve case',
                        label: 'Decision',
                        placeholder: 'e.g. Balance written off; no further action',
                      })
                      if (!resolution) return
                      resolveShortfall(c.id, resolution)
                        .then(() => {
                          setNotice('Case resolved.')
                          return load()
                        })
                        .catch((err) => setError(getErrorMessage(err, 'Could not resolve the case.')))
                    }}
                  >
                    Resolve
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

