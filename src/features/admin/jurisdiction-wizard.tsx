import { useEffect, useState, type ReactNode } from 'react'
import { Check, Dices, Gamepad2, Globe2, Scale, ScrollText, ShieldCheck, Ticket, TriangleAlert, Eye } from 'lucide-react'

import { listAdminStates, saveJurisdiction, type Jurisdiction, type JurisdictionInput, type State } from '@/api/game-entries'
import type { AdminGameSummary } from '@/api/games'
import type { Country } from '@/api/types'
import { FormAlert } from '@/components/common/form-alert'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { GameBadge } from '@/features/admin/games-ui'
import {
  WizardDialog,
  WizardField,
  WizardFields,
  WizardPreviewFrame,
  type WizardStep,
} from '@/features/seller/wizard-dialog'
import { getErrorMessage } from '@/lib/api'
import { flagOf } from '@/lib/country-options'
import { selectClassName, textareaClassName } from '@/lib/form-styles'
import { cn } from '@/lib/utils'

/**
 * Where games and game entries are switched on, one step at a time: the
 * place, what is on there, its limits, the games allowed, the official
 * rules, then a review before anything is saved.
 *
 * A new place can cover several states of a country at once; each is saved
 * as its own place with these settings.
 */
export function JurisdictionWizard({
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
  const [countryId, setCountryId] = useState(existing?.country_id ?? '')
  const [stateIds, setStateIds] = useState<string[]>(existing?.state_id ? [existing.state_id] : [])
  const [states, setStates] = useState<State[] | null>(null)
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
    let cancelled = false
    setStates(null)
    listAdminStates(countryId)
      .then((list) => {
        if (!cancelled) setStates(list.filter((s) => s.is_active))
      })
      .catch(() => {
        if (!cancelled) setStates([])
      })
    return () => {
      cancelled = true
    }
  }, [countryId])

  const country = countries.find((c) => c.id === countryId)
  const stateList = states ?? []
  const hasStates = stateList.length > 0
  const pickedStates = stateList.filter((s) => stateIds.includes(s.id))
  const age = Math.floor(Number(minAge))
  // Chance games only count where chance play is allowed.
  const allowedGames = games.filter((g) => chance || g.game_type !== 'chance')
  const pickedGames = allowedGames.filter((g) => gameIds.includes(g.id))

  const placeLabel = !country
    ? 'this place'
    : !hasStates
      ? country.name
      : pickedStates.length === stateList.length
        ? `every state of ${country.name}`
        : pickedStates.length === 1
          ? `${pickedStates[0].name}, ${country.name}`
          : `${pickedStates.length} states of ${country.name}`

  async function save() {
    setError(null)
    const body: JurisdictionInput = {
      country_id: countryId,
      state_id: existing ? (existing.state_id ?? null) : null,
      state_ids: !existing && hasStates ? stateIds : undefined,
      earning_enabled: earning,
      play_enabled: play,
      chance_games_enabled: chance,
      min_age: age || 18,
      official_rules: rules.trim() || null,
      customer_daily_cap: customerCap ? Math.floor(Number(customerCap)) : null,
      product_daily_cap: productCap ? Math.floor(Number(productCap)) : null,
      free_entries_per_day: Math.floor(Number(free)) || 0,
      game_ids: pickedGames.map((g) => g.id),
    }
    setBusy(true)
    try {
      await saveJurisdiction(body)
      await onSaved()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save the settings.'))
      setBusy(false)
    }
  }

  const steps: WizardStep[] = [
    {
      id: 'place',
      title: 'Place',
      description: existing ? 'The place these settings are for.' : 'The country, and the states in it, to switch on.',
      icon: Globe2,
      blockedReason: !countryId
        ? 'Choose a country.'
        : states === null
          ? 'Loading its states…'
          : hasStates && stateIds.length === 0
            ? 'Pick at least one state.'
            : null,
      content: (
        <div className="space-y-5">
          <WizardField label="Country" htmlFor="j-country">
            <select
              id="j-country"
              className={selectClassName}
              value={countryId}
              disabled={!!existing}
              onChange={(e) => {
                setCountryId(e.target.value)
                setStateIds([])
              }}
            >
              <option value="">Choose a country</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {flagOf(c.iso_code)} {c.name}
                </option>
              ))}
            </select>
          </WizardField>
          {existing ? (
            existing.state_name ? (
              <p className="rounded-xl bg-muted/50 px-4 py-3 text-sm">
                State: <span className="font-semibold">{existing.state_name}</span>
              </p>
            ) : null
          ) : countryId && states === null ? (
            <p className="text-sm text-muted-foreground">Loading its states…</p>
          ) : hasStates ? (
            <StatePicker states={stateList} value={stateIds} onChange={setStateIds} />
          ) : countryId ? (
            <p className="rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
              {country?.name} has no states, so these settings cover the whole country.
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: 'switches',
      title: 'What is on',
      description: 'Switch on only what has been approved for this place.',
      icon: ShieldCheck,
      content: (
        <div className="space-y-3">
          <SwitchCard
            icon={Ticket}
            tone="bg-amber-300 text-amber-950"
            title="Earning entries"
            text="Customers here earn game entries when they buy promoted gifts."
            on={earning}
            onChange={setEarning}
          />
          <SwitchCard
            icon={Gamepad2}
            tone="bg-brand-violet text-white"
            title="Playing games"
            text="Customers here can spend entries to play and enter competitions."
            on={play}
            onChange={setPlay}
          />
          <SwitchCard
            icon={Dices}
            tone="bg-brand-teal text-brand-ink"
            title="Chance games"
            text="Spins, scratch cards and draws. Leave off unless counsel has approved them here; skill games do not need it."
            on={chance}
            onChange={setChance}
            warn={chance}
          />
        </div>
      ),
    },
    {
      id: 'limits',
      title: 'Limits',
      description: 'Who can play, and how many entries can be earned.',
      icon: Scale,
      blockedReason: !(age >= 13 && age <= 25) ? 'The minimum age must be 13 to 25.' : null,
      content: (
        <WizardFields>
          <WizardField label="Minimum age" htmlFor="j-age" hint="13 to 25. Players must add a date of birth.">
            <Input id="j-age" type="number" inputMode="numeric" min={13} max={25} value={minAge} onChange={(e) => setMinAge(e.target.value)} />
          </WizardField>
          <WizardField label="Free entries a day" htmlFor="j-free" hint="A no-purchase route, where counsel requires one. 0 is off.">
            <Input id="j-free" type="number" inputMode="numeric" min={0} max={100} value={free} onChange={(e) => setFree(e.target.value)} />
          </WizardField>
          <WizardField label="Most entries a customer earns a day" htmlFor="j-ccap" hint="Leave empty for no cap.">
            <Input id="j-ccap" type="number" inputMode="numeric" min={1} value={customerCap} onChange={(e) => setCustomerCap(e.target.value)} placeholder="No cap" />
          </WizardField>
          <WizardField label="Most from one product a day" htmlFor="j-pcap" hint="Leave empty for no cap.">
            <Input id="j-pcap" type="number" inputMode="numeric" min={1} value={productCap} onChange={(e) => setProductCap(e.target.value)} placeholder="No cap" />
          </WizardField>
        </WizardFields>
      ),
    },
    {
      id: 'games',
      title: 'Games',
      description: 'The games customers here can play.',
      icon: Gamepad2,
      blockedReason: play && pickedGames.length === 0 ? 'Pick at least one game, or switch playing off.' : null,
      content: (
        <GamePicker
          games={games}
          chance={chance}
          value={gameIds}
          onChange={setGameIds}
        />
      ),
    },
    {
      id: 'rules',
      title: 'Official rules',
      description: 'Shown to customers here before they enter.',
      icon: ScrollText,
      blockedReason:
        (earning || play) && !rules.trim() ? 'Official rules are needed before earning or playing is switched on.' : null,
      content: (
        <WizardField
          label="Official rules"
          htmlFor="j-rules"
          hint={`${rules.length.toLocaleString()} of 20,000 characters. Say who can enter, how winners are decided, the prizes, and how to contact us.`}
        >
          <textarea
            id="j-rules"
            className={cn(textareaClassName, 'min-h-64')}
            value={rules}
            maxLength={20000}
            onChange={(e) => setRules(e.target.value)}
            placeholder="Who can enter, how winners are decided, prizes, and how to contact us."
          />
        </WizardField>
      ),
    },
    {
      id: 'review',
      title: 'Review',
      description: 'Check everything before it is saved.',
      icon: Eye,
      content: (
        <WizardPreviewFrame caption={`These settings will apply to ${placeLabel}.`}>
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <span className="text-3xl leading-none">{flagOf(country?.iso_code)}</span>
              <div className="min-w-0">
                <p className="font-poster text-xl">{country?.name ?? '-'}</p>
                <p className="text-sm text-muted-foreground">
                  {!hasStates
                    ? 'Whole country'
                    : pickedStates.length === stateList.length
                      ? `Every state · ${stateList.length}`
                      : pickedStates.map((s) => s.name).join(', ')}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <OnOff label="Earning entries" on={earning} />
              <OnOff label="Playing games" on={play} />
              <OnOff label="Chance games" on={chance} />
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <ReviewRow label="Minimum age" value={`${age || 18}+`} />
              <ReviewRow label="Free entries a day" value={Number(free) > 0 ? String(Math.floor(Number(free))) : 'Off'} />
              <ReviewRow label="Daily cap per customer" value={customerCap || 'No cap'} />
              <ReviewRow label="Daily cap per product" value={productCap || 'No cap'} />
              <ReviewRow
                label="Games"
                value={pickedGames.length ? pickedGames.map((g) => g.name).join(', ') : 'None'}
                full
              />
              <ReviewRow label="Official rules" value={rules.trim() ? 'Written' : 'Not yet'} />
            </dl>
          </div>
        </WizardPreviewFrame>
      ),
    },
  ]

  return (
    <WizardDialog
      open
      onOpenChange={(open) => !open && !busy && onClose()}
      title={existing ? `Edit ${existing.state_name ?? existing.country_name}` : 'Switch on a place'}
      description="Switch things on only where they have been approved. Everything stays off until the whole programme is on too."
      steps={steps}
      onComplete={save}
      completeLabel={
        existing
          ? 'Save settings'
          : hasStates && stateIds.length > 1
            ? `Save for ${stateIds.length} states`
            : 'Save settings'
      }
      completing={busy}
      error={<FormAlert error={error} />}
    />
  )
}

function SwitchCard({
  icon: Icon,
  tone,
  title,
  text,
  on,
  onChange,
  warn,
}: {
  icon: typeof Ticket
  tone: string
  title: string
  text: string
  on: boolean
  onChange: (on: boolean) => void
  warn?: boolean
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 transition-colors',
        on ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/30',
      )}
    >
      <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', tone)}>
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 font-semibold">
          {title}
          <span
            className={cn(
              'rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-[0.1em]',
              on ? 'bg-emerald-100 text-emerald-900' : 'bg-muted text-muted-foreground',
            )}
          >
            {on ? 'ON' : 'OFF'}
          </span>
        </span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{text}</span>
        {warn ? (
          <span className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-800 dark:text-amber-300">
            <TriangleAlert className="size-3.5" />
            Only with counsel's approval for this place.
          </span>
        ) : null}
      </span>
      <Switch checked={on} onCheckedChange={onChange} />
    </label>
  )
}

/** Pills for the states a new place covers, with one-click select all. */
function StatePicker({ states, value, onChange }: { states: State[]; value: string[]; onChange: (ids: string[]) => void }) {
  const chosen = new Set(value)
  const all = states.every((s) => chosen.has(s.id))
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">
          States or regions <span className="font-normal text-muted-foreground">· {value.length} of {states.length}</span>
        </p>
        <button
          type="button"
          onClick={() => onChange(all ? [] : states.map((s) => s.id))}
          className="h-8 rounded-lg bg-primary px-3 text-xs font-bold tracking-wide text-primary-foreground uppercase hover:bg-primary/90"
        >
          {all ? 'Clear' : 'Select all states'}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {states.map((s) => {
          const on = chosen.has(s.id)
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((id) => id !== s.id) : [...value, s.id])}
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors',
                on
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-card hover:border-primary/60 hover:bg-primary/5',
              )}
            >
              {on ? <Check className="size-3.5" strokeWidth={3} /> : null}
              {s.name}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Each state is saved as its own place with these settings. A state that already has settings has them replaced.
      </p>
    </div>
  )
}

/** Game tiles to tick; chance games wait until chance play is switched on. */
function GamePicker({
  games,
  chance,
  value,
  onChange,
}: {
  games: AdminGameSummary[]
  chance: boolean
  value: string[]
  onChange: (ids: string[]) => void
}) {
  const allowed = games.filter((g) => chance || g.game_type !== 'chance')
  const chosen = new Set(value)
  const all = allowed.length > 0 && allowed.every((g) => chosen.has(g.id))
  if (games.length === 0) return <p className="text-sm text-muted-foreground">No games found.</p>
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">
          Games <span className="font-normal text-muted-foreground">· {allowed.filter((g) => chosen.has(g.id)).length} picked</span>
        </p>
        <button
          type="button"
          onClick={() =>
            onChange(all ? value.filter((id) => !allowed.some((g) => g.id === id)) : [...new Set([...value, ...allowed.map((g) => g.id)])])
          }
          className="h-8 rounded-lg bg-primary px-3 text-xs font-bold tracking-wide text-primary-foreground uppercase hover:bg-primary/90"
        >
          {all ? 'Clear' : 'Select all games'}
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {games.map((g) => {
          const locked = g.game_type === 'chance' && !chance
          const on = !locked && chosen.has(g.id)
          return (
            <button
              key={g.id}
              type="button"
              disabled={locked}
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((id) => id !== g.id) : [...value, g.id])}
              className={cn(
                'flex items-center gap-3 rounded-xl border-2 p-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45',
                on ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
              )}
            >
              <GameBadge slug={g.slug} className="size-10" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{g.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {locked ? 'Chance · switch chance games on first' : g.game_type === 'chance' ? 'Chance' : 'Skill'}
                </span>
              </span>
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full border-2',
                  on ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
                )}
              >
                {on ? <Check className="size-3.5" strokeWidth={3} /> : null}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function OnOff({ label, on }: { label: string; on: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
        on ? 'bg-emerald-100 text-emerald-900' : 'bg-muted text-muted-foreground',
      )}
    >
      <span className={cn('size-1.5 rounded-full', on ? 'bg-emerald-500' : 'bg-muted-foreground/50')} />
      {label} {on ? 'on' : 'off'}
    </span>
  )
}

function ReviewRow({ label, value, full }: { label: string; value: ReactNode; full?: boolean }) {
  return (
    <div className={cn(full && 'sm:col-span-2')}>
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  )
}
