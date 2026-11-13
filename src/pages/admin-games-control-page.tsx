import { useCallback, useEffect, useRef, useState } from 'react'
import { LoaderCircle, MapPin, OctagonX, Pencil, Plus, Power, ShieldCheck, Trash2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import { listCountries } from '@/api/countries'
import {
  createState,
  deleteState,
  getGamesControl,
  liftJurisdiction,
  listAdminStates,
  listShortfalls,
  resolveShortfall,
  saveJurisdiction,
  setProgram,
  stopJurisdiction,
  stopProgram,
  updateState,
  type EntryShortfall,
  type GamesControl,
  type Jurisdiction,
  type JurisdictionInput,
  type State,
  type SwitchState,
} from '@/api/game-entries'
import { listAdminGames, type AdminGameSummary } from '@/api/games'
import type { Country, PlaceDetails } from '@/api/types'
import { FormAlert } from '@/components/common/form-alert'
import { AddressAutocomplete } from '@/components/common/place-autocomplete'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { AdminEmptyState, AdminPageHeader } from '@/features/admin'
import { getErrorMessage } from '@/lib/api'
import { isSuperAdmin } from '@/lib/auth'
import { selectClassName } from '@/lib/form-styles'
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
          A state does not inherit from its country: each one is switched on by itself. A country with no states is
          switched on as a whole.
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
        <div className="grid gap-3 lg:grid-cols-2">
          {control.jurisdictions.map((j) => (
            <article key={j.id} className="rounded-xl border-2 border-brand-ink/15 bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-poster text-xl">{j.state_name ? `${j.state_name}, ${j.country_name}` : j.country_name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Minimum age {j.min_age}
                    {j.customer_daily_cap ? ` · up to ${j.customer_daily_cap} entries a customer a day` : ''}
                    {j.product_daily_cap ? ` · ${j.product_daily_cap} a product a day` : ''}
                    {j.free_entries_per_day > 0 ? ` · ${j.free_entries_per_day} free a day` : ''}
                  </p>
                </div>
                <StatePill state={j.state} />
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                {(
                  [
                    ['Earning entries', j.earning_enabled],
                    ['Playing games', j.play_enabled],
                    ['Chance games', j.chance_games_enabled],
                  ] as const
                ).map(([label, on]) => (
                  <div key={label} className="rounded-lg bg-muted/60 px-3 py-2">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="font-bold">{j.state === 'STOPPED' ? 'STOPPED' : on ? 'ON' : 'OFF'}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-sm">
                <span className="text-muted-foreground">Games on: </span>
                {j.game_ids.length === 0
                  ? 'none'
                  : j.game_ids.map((id) => games.find((g) => g.id === id)?.name ?? 'a game').join(', ')}
              </p>
              {j.state === 'STOPPED' ? (
                <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-950">Stopped: {j.stopped_reason}</p>
              ) : null}
              {!j.official_rules ? (
                <p className="mt-2 text-xs text-amber-800">No official rules yet: required before anything is switched on.</p>
              ) : null}
              {canEdit ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(j)}>
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                  {j.state === 'STOPPED' ? (
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={async () => {
                        const reason = await askReason({
                          title: `Lift the stop for ${j.state_name ?? j.country_name}?`,
                          description: 'Earning and play there go back to how they are set.',
                          confirmLabel: 'Lift stop',
                        })
                        if (reason) void run('Stop lifted.', () => liftJurisdiction(j.id, reason))
                      }}
                    >
                      Lift stop
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy}
                      onClick={async () => {
                        const reason = await askReason({
                          title: `Emergency off for ${j.state_name ?? j.country_name}?`,
                          description: 'This stops all earning and all new plays there at once. Plays already started can finish.',
                          confirmLabel: 'Stop it now',
                          tone: 'emergency',
                          placeholder: 'What happened?',
                        })
                        if (reason) void run('Emergency off is in force there.', () => stopJurisdiction(j.id, reason))
                      }}
                    >
                      <OctagonX className="size-3.5" />
                      Emergency off
                    </Button>
                  )}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}

      {editing ? (
        <JurisdictionDialog
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

function JurisdictionDialog({
  existing,
  countries,
  games,
  onClose,
  onSaved,
}: {
  existing: Jurisdiction | null
  countries: Country[]
  games: AdminGameSummary[]
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  const [countryId, setCountryId] = useState(existing?.country_id ?? countries[0]?.id ?? '')
  const [stateId, setStateId] = useState(existing?.state_id ?? '')
  const [states, setStates] = useState<State[]>([])
  const [earning, setEarning] = useState(existing?.earning_enabled ?? false)
  const [play, setPlay] = useState(existing?.play_enabled ?? false)
  const [chance, setChance] = useState(existing?.chance_games_enabled ?? false)
  const [minAge, setMinAge] = useState(String(existing?.min_age ?? 18))
  const [rules, setRules] = useState(existing?.official_rules ?? '')
  const [customerCap, setCustomerCap] = useState(existing?.customer_daily_cap ? String(existing.customer_daily_cap) : '')
  const [productCap, setProductCap] = useState(existing?.product_daily_cap ? String(existing.product_daily_cap) : '')
  const [free, setFree] = useState(String(existing?.free_entries_per_day ?? 0))
  const [gameIds, setGameIds] = useState<string[]>(existing?.game_ids ?? [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!countryId) return setStates([])
    listAdminStates(countryId)
      .then((list) => setStates(list.filter((s) => s.is_active)))
      .catch(() => setStates([]))
  }, [countryId])

  async function save() {
    setError(null)
    const body: JurisdictionInput = {
      country_id: countryId,
      state_id: stateId || null,
      earning_enabled: earning,
      play_enabled: play,
      chance_games_enabled: chance,
      min_age: Math.floor(Number(minAge)) || 18,
      official_rules: rules.trim() || null,
      customer_daily_cap: customerCap ? Math.floor(Number(customerCap)) : null,
      product_daily_cap: productCap ? Math.floor(Number(productCap)) : null,
      free_entries_per_day: Math.floor(Number(free)) || 0,
      game_ids: gameIds,
    }
    if (!body.country_id) return setError('Choose a country.')
    if (states.length > 0 && !body.state_id) return setError('This country has states: choose the state.')
    if ((earning || play) && !body.official_rules) return setError('Add the official rules before switching earning or play on.')
    setBusy(true)
    try {
      await saveJurisdiction(body)
      await onSaved()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save the settings.'))
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {existing ? `Edit ${existing.state_name ?? existing.country_name}` : 'Add a country or state'}
          </DialogTitle>
          <DialogDescription>
            Switch things on only where they have been approved. Everything stays off until the whole programme is on
            too.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="j-country">Country</Label>
            <select id="j-country" className={selectClassName} value={countryId} disabled={!!existing} onChange={(e) => { setCountryId(e.target.value); setStateId('') }}>
              <option value="">Choose a country</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="j-state">State or region</Label>
            <select id="j-state" className={selectClassName} value={stateId} disabled={!!existing || states.length === 0} onChange={(e) => setStateId(e.target.value)}>
              <option value="">{states.length === 0 ? 'This country has no states' : 'Choose a state'}</option>
              {states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {(
            [
              ['Earning entries', earning, setEarning],
              ['Playing games', play, setPlay],
              ['Chance games', chance, setChance],
            ] as const
          ).map(([label, on, set]) => (
            <label key={label} className="flex items-center justify-between gap-3 rounded-lg border-2 border-brand-ink/10 px-3 py-2">
              <span className="text-sm font-medium">
                {label}
                <span className="block text-xs font-bold text-muted-foreground">{on ? 'ON' : 'OFF'}</span>
              </span>
              <Switch checked={on} onCheckedChange={set} />
            </label>
          ))}
        </div>
        <p className="-mt-1 text-xs text-muted-foreground">
          Leave chance games off unless counsel has approved them for this place. Skill games do not need it.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="j-age">Minimum age</Label>
            <Input id="j-age" type="number" inputMode="numeric" min={13} max={25} value={minAge} onChange={(e) => setMinAge(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="j-free">Free entries a day</Label>
            <Input id="j-free" type="number" inputMode="numeric" min={0} max={100} value={free} onChange={(e) => setFree(e.target.value)} />
            <p className="text-xs text-muted-foreground">A no-purchase route, where counsel requires one. 0 is off.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="j-ccap">Most entries a customer earns a day</Label>
            <Input id="j-ccap" type="number" inputMode="numeric" min={1} value={customerCap} onChange={(e) => setCustomerCap(e.target.value)} placeholder="No cap" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="j-pcap">Most from one product a day</Label>
            <Input id="j-pcap" type="number" inputMode="numeric" min={1} value={productCap} onChange={(e) => setProductCap(e.target.value)} placeholder="No cap" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="j-rules">Official rules shown before entry</Label>
          <textarea
            id="j-rules"
            className="min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            value={rules}
            maxLength={20000}
            onChange={(e) => setRules(e.target.value)}
            placeholder="Who can enter, how winners are decided, prizes, and how to contact us."
          />
        </div>

        <fieldset className="rounded-xl border-2 border-brand-ink/10 p-4">
          <legend className="px-1 text-sm font-semibold">Games that can be played here</legend>
          {games.length === 0 ? (
            <p className="text-sm text-muted-foreground">No games found.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {games.map((g) => (
                <label key={g.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={gameIds.includes(g.id)}
                    onCheckedChange={(on) => setGameIds(on ? [...gameIds, g.id] : gameIds.filter((id) => id !== g.id))}
                  />
                  <span>
                    {g.name}
                    {g.game_type === 'chance' ? <span className="text-xs text-muted-foreground"> (chance)</span> : null}
                  </span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <FormAlert error={error} />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Save settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
        <p className="max-w-xl pb-2 text-sm text-muted-foreground">
          Customers in this country choose from this list when they sign up. A country with no states here asks for
          none.
        </p>
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
