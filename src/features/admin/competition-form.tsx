import { useEffect, useState, type ReactNode } from 'react'
import {
  CalendarClock,
  Coins,
  Dices,
  Earth,
  Eye,
  Gamepad2,
  ScrollText,
  Trophy,
  Wand2,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import {
  isChanceGame,
  type AdminCompetition,
  type CompetitionInput,
  type PrizeType,
  type QuizQuestion,
} from '@/api/competitions'
import { emptyQuestion } from '@/features/admin/quiz'
import {
  CountryCards,
  GamePicker,
  PrizePreview,
  PrizeTypeTiles,
  RulesChecklist,
  ScheduleTimeline,
} from '@/features/admin/competition-wizard-parts'
import { gameColor } from '@/features/admin/games-format'
import { GameBadge } from '@/features/admin/games-ui'
import { QuizEditor } from '@/features/admin/quiz-editor'
import {
  WizardDialog,
  WizardField,
  WizardFields,
  WizardPreviewFrame,
  type WizardStep,
} from '@/features/seller/wizard-dialog'
import type { AdminGameSummary } from '@/api/games'
import type { Country } from '@/api/types'
import { CountryMultiSelect } from '@/components/common/country-multi-select'
import { CurrencySelect } from '@/components/common/currency-select'
import { DateTimePicker } from '@/components/common/datetime-picker'
import { FormAlert } from '@/components/common/form-alert'
import { TimezoneSelect } from '@/components/common/timezone-select'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { getErrorMessage } from '@/lib/api'
import { currenciesFromCountries, flagOf } from '@/lib/country-options'
import { textareaClassName } from '@/lib/form-styles'
import { cn } from '@/lib/utils'
import { formatPriceAmount, majorToMinor, minorToMajor } from '@/lib/money'

type FormState = {
  country_ids: string[]
  game_slug: string
  title: string
  starts_at: string
  ends_at: string
  timezone: string
  max_attempts_per_customer: string
  min_age: string
  requires_identity_verification: boolean
  number_of_winners: string
  prize_description: string
  prize_value: string
  prize_currency: string
  official_rules: string
  prize_type: PrizeType
  prize_growth_enabled: boolean
  increment: string
  max_prize: string
  continue_at_cap: boolean
  daily_play_limit: string
  min_plays_to_win: string
  win_odds: string
  prize_points: string
  quiz_questions: QuizQuestion[]
}

/** An ISO time as a `datetime-local` value in the admin's own time zone. */
function toLocalInput(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Number fields are plain text boxes that only keep what a number can hold:
 * no browser spinner arrows, and a scroll over the field never changes it.
 */
function digitsOnly(raw: string): string {
  return raw.replace(/[^0-9]/g, '')
}

/** Digits and one decimal point, for money amounts. */
function decimalsOnly(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, '')
  const dot = cleaned.indexOf('.')
  return dot === -1 ? cleaned : cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, '')
}

/** Minutes from now until 9am tomorrow, for the "Tomorrow, 9am" preset. */
function minutesUntilTomorrow9am(): number {
  const target = new Date()
  target.setDate(target.getDate() + 1)
  target.setHours(9, 0, 0, 0)
  return Math.round((target.getTime() - Date.now()) / 60_000)
}

function money(minor: number | undefined, currency: string | undefined): string {
  return minor !== undefined && currency ? String(minorToMajor(minor, currency)) : ''
}

function fromCompetition(c: AdminCompetition): FormState {
  return {
    country_ids: (c.countries ?? []).map((co) => co.id),
    game_slug: c.game_slug,
    title: c.title,
    starts_at: toLocalInput(c.starts_at),
    ends_at: toLocalInput(c.ends_at),
    timezone: c.timezone,
    max_attempts_per_customer: String(c.max_attempts_per_customer),
    min_age: String(c.min_age),
    requires_identity_verification: c.requires_identity_verification,
    number_of_winners: String(c.number_of_winners),
    prize_description: c.prize_description,
    prize_value: money(c.start_prize_cents ?? c.prize_value_amount, c.prize_currency),
    prize_currency: c.prize_currency ?? '',
    official_rules: c.official_rules ?? '',
    prize_type: c.prize_type ?? 'cash',
    prize_growth_enabled: c.prize_growth_enabled ?? false,
    increment: money(c.increment_per_play_cents || undefined, c.prize_currency),
    max_prize: money(c.max_prize_cents, c.prize_currency),
    continue_at_cap: c.continue_at_cap ?? true,
    daily_play_limit: c.daily_play_limit ? String(c.daily_play_limit) : '',
    min_plays_to_win: c.min_plays_to_win ? String(c.min_plays_to_win) : '',
    win_odds: c.win_odds ? String(c.win_odds) : '',
    prize_points: c.prize_points ? String(c.prize_points) : '',
    quiz_questions: c.quiz_questions ?? [],
  }
}

const emptyForm: FormState = {
  country_ids: [],
  game_slug: '',
  title: '',
  starts_at: '',
  ends_at: '',
  timezone: '',
  // 0 is no limit: players play as long as their points last.
  max_attempts_per_customer: '0',
  min_age: '18',
  requires_identity_verification: true,
  number_of_winners: '1',
  prize_description: '',
  prize_value: '',
  prize_currency: '',
  official_rules: '',
  prize_type: 'cash',
  prize_growth_enabled: false,
  increment: '',
  max_prize: '',
  continue_at_cap: true,
  daily_play_limit: '',
  min_plays_to_win: '',
  win_odds: '',
  prize_points: '',
  quiz_questions: [],
}

/** The growth rule in words, e.g. "Starts at $100.00 and grows $1.00 a play up to $5,000.00 (4,900 plays)." */
function growthPreview(form: FormState): string | null {
  const cur = form.prize_currency.trim().toUpperCase()
  const start = Number(form.prize_value || 0)
  const inc = Number(form.increment || 0)
  if (!form.prize_growth_enabled || cur.length !== 3 || !(inc > 0) || Number.isNaN(start)) return null
  const fmt = (major: number) => formatPriceAmount(majorToMinor(major, cur), cur)
  const max = form.max_prize.trim() === '' ? null : Number(form.max_prize)
  if (max === null || Number.isNaN(max)) {
    return `Starts at ${fmt(start)} and grows ${fmt(inc)} with every play. Set a maximum before publishing.`
  }
  const plays = Math.ceil((max - start) / inc)
  return `Starts at ${fmt(start)} and grows ${fmt(inc)} with every play, up to ${fmt(max)} after ${plays.toLocaleString()} plays.`
}

type CompetitionFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  initial?: AdminCompetition
  games: AdminGameSummary[]
  countries: Country[]
  submitLabel: string
  onSubmit: (input: CompetitionInput) => Promise<void>
}

/**
 * Creates or edits a competition, one step at a time in the same wizard the
 * seller uses to add a gift. Editing is only possible until it starts.
 * after that the rules are locked (§13.8). And saving an edit returns it to
 * draft so every publishing check runs again.
 */
export function CompetitionForm({
  open,
  onOpenChange,
  title,
  description,
  initial,
  games,
  countries,
  submitLabel,
  onSubmit,
}: CompetitionFormProps) {
  const [form, setForm] = useState<FormState>(() =>
    initial ? fromCompetition(initial) : emptyForm,
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Each opening starts from the saved competition, or blank for a new one.
  useEffect(() => {
    if (!open) return
    setForm(initial ? fromCompetition(initial) : emptyForm)
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on open
  }, [open])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  /** The prize is paid in one of the chosen countries' currencies. */
  function chooseCountries(ids: string[]) {
    const chosen = ids
      .map((id) => countries.find((c) => c.id === id))
      .filter((c): c is Country => !!c)
    const allowed = currenciesFromCountries(chosen)
    setForm((prev) => ({
      ...prev,
      country_ids: ids,
      timezone: prev.timezone || chosen[0]?.default_timezone || '',
      prize_currency: allowed.includes(prev.prize_currency.trim().toUpperCase())
        ? prev.prize_currency
        : (allowed[0] ?? ''),
    }))
  }

  async function submit() {
    if (form.country_ids.length === 0) {
      setError('Choose at least one country to run the competition in.')
      return
    }
    if (!form.starts_at || !form.ends_at) {
      setError('Choose when the competition starts and ends.')
      return
    }
    const currency = form.prize_currency.trim().toUpperCase()
    const amount = (raw: string) => (raw.trim() === '' ? null : Number(raw))
    const value = amount(form.prize_value)
    if (value !== null && (Number.isNaN(value) || value < 0)) {
      setError('The starting prize must be a positive amount.')
      return
    }
    const increment = amount(form.increment)
    const max = amount(form.max_prize)
    // A points prize is paid in points, per winner, and never grows.
    const pointsPrize = form.prize_type === 'points'
    const prizePoints = Number(form.prize_points)
    if (pointsPrize && !(Number.isInteger(prizePoints) && prizePoints >= 1)) {
      setError('Set how many points each winner receives.')
      return
    }
    if (form.prize_growth_enabled && !pointsPrize) {
      if (!currency) {
        setError('A growing prize needs a currency.')
        return
      }
      if (increment === null || Number.isNaN(increment) || increment <= 0) {
        setError('Set how much each play adds to the prize.')
        return
      }
      if (max !== null && (Number.isNaN(max) || max < (value ?? 0))) {
        setError('The maximum prize must be at least the starting prize.')
        return
      }
    }
    const instant = isChanceGame(form.game_slug) && form.game_slug !== 'prize-draw'
    const odds = Number(form.win_odds)
    if (instant && !(Number.isInteger(odds) && odds >= 2)) {
      setError('Set the win odds: each play wins 1 in how many?')
      return
    }
    const quiz = form.game_slug === 'quiz'
    // The editor starts with one blank question on screen.
    const questions = form.quiz_questions.length ? form.quiz_questions : [emptyQuestion()]
    if (quiz) {
      const broken = questions.findIndex((q) => !q.prompt.trim() || q.options.some((o) => !o.trim()))
      if (broken >= 0) {
        setError(`Question ${broken + 1} needs a prompt and text for every option.`)
        return
      }
    }
    const cents = (major: number | null) => (major === null || !currency ? null : majorToMinor(major, currency))
    const count = (raw: string) => (raw.trim() === '' ? null : Number(raw) || null)
    const input: CompetitionInput = {
      country_ids: form.country_ids,
      game_slug: form.game_slug,
      title: form.title.trim(),
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
      timezone: form.timezone.trim(),
      max_attempts_per_customer: Number(form.max_attempts_per_customer) || 0,
      min_age: Number(form.min_age) || 0,
      requires_identity_verification: form.requires_identity_verification,
      number_of_winners: instant ? 1 : Number(form.number_of_winners) || 0,
      prize_description: form.prize_description.trim(),
      prize_value_amount: pointsPrize ? null : cents(value),
      prize_currency: pointsPrize ? null : currency || null,
      official_rules: form.official_rules.trim() || null,
      prize_type: form.prize_type,
      prize_growth_enabled: pointsPrize ? false : form.prize_growth_enabled,
      start_prize_cents: pointsPrize ? 0 : cents(value),
      increment_per_play_cents:
        form.prize_growth_enabled && !pointsPrize ? (cents(increment) ?? 0) : 0,
      max_prize_cents: form.prize_growth_enabled && !pointsPrize ? cents(max) : null,
      prize_points: pointsPrize ? prizePoints : null,
      continue_at_cap: form.continue_at_cap,
      daily_play_limit: count(form.daily_play_limit),
      min_plays_to_win: count(form.min_plays_to_win),
      win_odds: instant ? odds : null,
      quiz_questions: quiz ? questions : null,
      config_version: initial?.config_version,
    }
    setBusy(true)
    setError(null)
    try {
      await onSubmit(input)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save the competition.'))
    } finally {
      setBusy(false)
    }
  }

  const playable = games.filter((g) => g.playable)
  const chosenCountries = countries.filter((c) => form.country_ids.includes(c.id))

  const chance = isChanceGame(form.game_slug)
  const instantWinner = chance && form.game_slug !== 'prize-draw'
  const game = games.find((g) => g.slug === form.game_slug)

  // An instant-win round has exactly one winner.
  const winnersField = instantWinner ? null : (
    <WizardField label="Winners" htmlFor="c-winners">
      <Input
        id="c-winners"
        inputMode="numeric"
        value={form.number_of_winners}
        onChange={(e) => set('number_of_winners', digitsOnly(e.target.value))}
        className="h-11 bg-surface"
      />
    </WizardField>
  )

  const startsAt = form.starts_at ? new Date(form.starts_at) : null
  const endsAt = form.ends_at ? new Date(form.ends_at) : null
  const currency = form.prize_currency.trim().toUpperCase()
  const prizeLabel =
    form.prize_type === 'points'
      ? form.prize_points
        ? `${Number(form.prize_points).toLocaleString()} points each`
        : '-'
      : form.prize_value && currency.length === 3
        ? formatPriceAmount(majorToMinor(Number(form.prize_value), currency), currency)
        : '-'

  function rulesTemplate(): string {
    const where = chosenCountries.map((c) => c.name).join(', ') || '[countries]'
    const fmt = (d: Date | null) => (d ? d.toLocaleString() : '[date]')
    const how = instantWinner
      ? 'Each play has a 1 in ' + (form.win_odds || '[odds]') + ' chance to win. The first winning play takes the prize.'
      : chance
        ? 'Every play is one entry. When the competition closes, winners are drawn at random by the server.'
        : 'The highest verified score wins. Ties are broken by the shortest play time.'
    return [
      `${form.title.trim() || '[Competition name]'}. Official rules`,
      '',
      `1. Who can enter: players living in ${where}.`,
      `2. When: opens ${fmt(startsAt)} and closes ${fmt(endsAt)} (${form.timezone || 'time zone'}).`,
      `3. How to enter: each play costs ${game ? game.play_cost_points : '[points]'} points.`,
      `4. How the winner is chosen: ${how}`,
      `5. The prize: ${form.prize_description.trim() || '[prize]'}${prizeLabel !== '-' ? ` (${prizeLabel})` : ''}.`,
      '6. Claiming: winners are contacted in the app and must claim within 14 days, or the prize passes to the next eligible player.',
    ].join('\n')
  }

  const steps: (WizardStep & { aside?: ReactNode })[] = [
    {
      id: 'game',
      title: 'The game',
      description: 'What players compete in, and what it is called.',
      icon: Gamepad2,
      blockedReason:
        form.title.trim().length < 3
          ? 'Give the competition a name (at least 3 letters) to continue.'
          : !form.game_slug
            ? 'Choose a game to continue.'
            : instantWinner && !(Number(form.win_odds) >= 2)
              ? 'Set the win odds to continue.'
              : null,
      content: (
        <div className="space-y-5">
          <WizardField label="Name" htmlFor="c-title">
            <Input
              id="c-title"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Spring 2048 Cup"
              className="h-12 bg-surface text-base font-medium"
            />
          </WizardField>

          <GamePicker
            games={playable}
            value={form.game_slug}
            onChange={(slug) => set('game_slug', slug)}
          />

          {game ? (
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm ring-1 ring-amber-200">
              <Coins className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <p className="text-amber-950">
                {game.play_cost_points === 0 ? (
                  <span className="font-semibold">Free to play.</span>
                ) : (
                  <>
                    Each play costs{' '}
                    <span className="font-semibold">
                      {game.play_cost_points.toLocaleString()} points
                    </span>
                    .
                  </>
                )}{' '}
                <span className="text-amber-900/75">
                  This is the game&apos;s price and can&apos;t be changed here
                  {game.practice ? (
                    <>
                      {' '}
                      change it on the{' '}
                      <Link to="/admin/games" className="font-medium underline">
                        Games
                      </Link>{' '}
                      page.
                    </>
                  ) : (
                    '.'
                  )}
                </span>
              </p>
            </div>
          ) : null}

          {instantWinner ? (
            <WizardField
              label="Win odds"
              htmlFor="c-odds"
              hint="Each play wins 1 in this many. The first winning play takes the prize."
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">1 in</span>
                <Input
                  id="c-odds"
                  inputMode="numeric"
                  value={form.win_odds}
                  onChange={(e) => set('win_odds', digitsOnly(e.target.value))}
                  placeholder="500"
                  className="h-11 w-32 bg-surface"
                />
              </div>
            </WizardField>
          ) : chance ? (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <Dices className="mt-0.5 size-4 shrink-0" />
              Every play is one entry. When it closes you run the draw and the server picks the
              winners at random.
            </p>
          ) : null}

          {form.game_slug === 'quiz' ? (
            <QuizEditor
              questions={form.quiz_questions.length ? form.quiz_questions : [emptyQuestion()]}
              onChange={(questions) => set('quiz_questions', questions)}
            />
          ) : null}
        </div>
      ),
    },
    {
      id: 'countries',
      title: 'Countries',
      description: 'Only players in these countries can enter.',
      icon: Earth,
      blockedReason: form.country_ids.length === 0 ? 'Choose at least one country.' : null,
      content: (
        <WizardField
          label="Countries"
          htmlFor="c-country"
          hint="Each country must allow competitions before it can be published."
        >
          <CountryMultiSelect
            id="c-country"
            value={form.country_ids}
            onChange={chooseCountries}
            countries={countries}
          />
        </WizardField>
      ),
      aside: (
        <CountryCards
          countries={chosenCountries}
          onRemove={(id) => chooseCountries(form.country_ids.filter((c) => c !== id))}
        />
      ),
    },
    {
      id: 'schedule',
      title: 'Schedule',
      description: 'When it opens and closes.',
      icon: CalendarClock,
      blockedReason:
        !startsAt || !endsAt
          ? 'Choose when it starts and ends.'
          : endsAt <= startsAt
            ? 'The end must be after the start.'
            : !form.timezone
              ? 'Choose a time zone.'
              : null,
      content: (
        <WizardFields>
          <WizardField
            label="Starts"
            htmlFor="c-start"
            hint="Pick “Right now” to open it the moment it is published."
          >
            <DateTimePicker
              id="c-start"
              value={form.starts_at}
              onChange={(value) => set('starts_at', value)}
              min={toLocalInput(new Date().toISOString())}
              presets={[
                { label: 'Right now', minutesFromNow: 0 },
                { label: 'In 1 hour', minutesFromNow: 60 },
                { label: 'Tomorrow, 9am', minutesFromNow: minutesUntilTomorrow9am() },
                { label: 'In 1 week', minutesFromNow: 60 * 24 * 7 },
              ]}
            />
          </WizardField>
          <WizardField label="Ends" htmlFor="c-end">
            <DateTimePicker
              id="c-end"
              value={form.ends_at}
              onChange={(value) => set('ends_at', value)}
              min={form.starts_at || undefined}
              presets={[
                { label: '+1 day', minutesFromNow: 60 * 24 },
                { label: '+1 week', minutesFromNow: 60 * 24 * 7 },
                { label: '+1 month', minutesFromNow: 60 * 24 * 30 },
              ]}
            />
          </WizardField>
          <WizardField label="Time zone" htmlFor="c-tz" full>
            <TimezoneSelect
              id="c-tz"
              value={form.timezone}
              onChange={(zone) => set('timezone', zone)}
            />
          </WizardField>
        </WizardFields>
      ),
      aside: <ScheduleTimeline startsAt={startsAt} endsAt={endsAt} timezone={form.timezone} />,
    },
    {
      id: 'prize',
      title: 'Prize',
      description: 'What the winners get.',
      icon: Trophy,
      aside: (
        <PrizePreview
          type={form.prize_type}
          amount={prizeLabel === '-' ? 'Set a value' : prizeLabel}
          description={form.prize_description}
          winners={instantWinner ? '1' : form.number_of_winners || '1'}
          grows={form.prize_growth_enabled && form.prize_type !== 'points'}
        />
      ),
      blockedReason: !form.prize_description.trim()
        ? 'Describe the prize to continue.'
        : form.prize_type === 'points' && !(Number(form.prize_points) >= 1)
          ? 'Set how many points each winner gets.'
          : null,
      content: (
        <div className="space-y-5">
          <WizardField label="Type">
            <PrizeTypeTiles value={form.prize_type} onChange={(t) => set('prize_type', t)} />
          </WizardField>

          <WizardField label="What the winner gets" htmlFor="c-prize">
            <Input
              id="c-prize"
              value={form.prize_description}
              onChange={(e) => set('prize_description', e.target.value)}
              placeholder={
                form.prize_type === 'points' ? '500 bonus points' : '$500 paid by bank transfer'
              }
              className="h-11 bg-surface"
            />
          </WizardField>

          {form.prize_type === 'points' ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <WizardField label="Points per winner" htmlFor="c-prize-points">
                <Input
                  id="c-prize-points"
                  inputMode="numeric"
                  value={form.prize_points}
                  onChange={(e) => set('prize_points', digitsOnly(e.target.value))}
                  placeholder="500"
                  className="h-11 bg-surface"
                />
              </WizardField>
              {winnersField}
            </div>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-[1fr_120px_120px]">
                <WizardField
                  label={form.prize_growth_enabled ? 'Starting value' : 'Value'}
                  htmlFor="c-value"
                >
                  <Input
                    id="c-value"
                    inputMode="decimal"
                    value={form.prize_value}
                    onChange={(e) => set('prize_value', decimalsOnly(e.target.value))}
                    placeholder="500.00"
                    className="h-11 bg-surface"
                  />
                </WizardField>
                <WizardField label="Currency" htmlFor="c-currency">
                  <CurrencySelect
                    id="c-currency"
                    value={form.prize_currency}
                    onChange={(code) => set('prize_currency', code)}
                    countries={chosenCountries.length ? chosenCountries : countries}
                    className="h-11"
                  />
                </WizardField>
                {winnersField}
              </div>

              <label className="flex items-center justify-between gap-3 rounded-xl border border-input bg-surface px-4 py-3 text-sm">
                <span>
                  <span className="font-medium">Grow the prize with every play</span>
                  <span className="block text-xs text-muted-foreground">
                    Needs a maximum, and approval in every chosen country.
                  </span>
                </span>
                <Switch
                  checked={form.prize_growth_enabled}
                  onCheckedChange={(checked) => set('prize_growth_enabled', checked === true)}
                />
              </label>
              {form.prize_growth_enabled ? (
                <WizardFields>
                  <WizardField label="Added per play" htmlFor="c-inc">
                    <Input
                      id="c-inc"
                      inputMode="decimal"
                      value={form.increment}
                      onChange={(e) => set('increment', decimalsOnly(e.target.value))}
                      placeholder="1.00"
                      className="h-11 bg-surface"
                    />
                  </WizardField>
                  <WizardField label="Maximum" htmlFor="c-max">
                    <Input
                      id="c-max"
                      inputMode="decimal"
                      value={form.max_prize}
                      onChange={(e) => set('max_prize', decimalsOnly(e.target.value))}
                      placeholder="5000.00"
                      className="h-11 bg-surface"
                    />
                  </WizardField>
                  {growthPreview(form) ? (
                    <p className="text-sm text-muted-foreground sm:col-span-2">
                      {growthPreview(form)}
                    </p>
                  ) : null}
                </WizardFields>
              ) : null}
            </>
          )}
        </div>
      ),
    },
    {
      id: 'rules',
      title: 'Rules',
      description: 'The official rules players read before entering.',
      icon: ScrollText,
      aside: <RulesChecklist rules={form.official_rules} />,
      content: (
        <WizardField
          label="Official rules"
          htmlFor="c-rules"
          hint="Optional for a draft, but needed before it can be published."
        >
          {!form.official_rules.trim() ? (
            <button
              type="button"
              onClick={() => set('official_rules', rulesTemplate())}
              className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/15"
            >
              <Wand2 className="size-3.5" />
              Start from a template
            </button>
          ) : null}
          <textarea
            id="c-rules"
            className={`${textareaClassName} min-h-56`}
            value={form.official_rules}
            onChange={(e) => set('official_rules', e.target.value)}
            placeholder="How to enter, how the winner is chosen, how the prize is paid…"
          />
        </WizardField>
      ),
    },
    {
      id: 'review',
      title: 'Review',
      description: 'Check everything before saving. It is saved as a draft.',
      icon: Eye,
      content: (
        <WizardPreviewFrame caption="This is what will be saved.">
          <div
            className="-mx-5 -mt-5 mb-5 flex items-center gap-4 rounded-t-2xl px-5 py-5 text-white"
            style={{ background: game ? gameColor(game.slug) : undefined }}
          >
            {game ? <GameBadge slug={game.slug} className="size-12 bg-white/20 shadow-none" /> : null}
            <div className="min-w-0">
              <p className="font-poster text-xl leading-tight tracking-tight">
                {form.title.trim() || 'Untitled competition'}
              </p>
              <p className="text-sm text-white/85">
                {chosenCountries.map((c) => flagOf(c.iso_code) || c.name).join(' ')} · {prizeLabel}
              </p>
            </div>
          </div>
          <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
            <ReviewRow label="Name" value={form.title.trim() || '-'} />
            <ReviewRow
              label="Game"
              value={
                game
                  ? `${game.name} · ${
                      game.play_cost_points === 0
                        ? 'free to play'
                        : `${game.play_cost_points.toLocaleString()} points a play`
                    }`
                  : '-'
              }
            />
            <ReviewRow
              label="Countries"
              value={chosenCountries.map((c) => c.name).join(', ') || '-'}
              full
            />
            <ReviewRow label="Starts" value={startsAt ? startsAt.toLocaleString() : '-'} />
            <ReviewRow label="Ends" value={endsAt ? endsAt.toLocaleString() : '-'} />
            <ReviewRow
              label="Prize"
              value={`${form.prize_description.trim() || '-'} · ${prizeLabel}${
                form.prize_growth_enabled && form.prize_type !== 'points' ? ' (grows)' : ''
              }`}
              full
            />
            <ReviewRow
              label="Winners"
              value={instantWinner ? '1' : form.number_of_winners || '1'}
            />
            <ReviewRow
              label="Rules"
              value={form.official_rules.trim() ? 'Written' : 'Not yet. Needed to publish'}
            />
          </dl>
        </WizardPreviewFrame>
      ),
    },
  ]

  return (
    <WizardDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      steps={steps.map(({ aside, ...step }) =>
        aside ? { ...step, content: <div className="space-y-6">{step.content}{aside}</div> } : step,
      )}
      onComplete={submit}
      completeLabel={submitLabel}
      completing={busy}
      error={<FormAlert error={error} />}
    />
  )
}

function ReviewRow({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={cn(full && 'sm:col-span-2')}>
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  )
}
