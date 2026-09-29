import { useState, type FormEvent } from 'react'
import { LoaderCircle } from 'lucide-react'

import {
  PRIZE_TYPES,
  isChanceGame,
  type AdminCompetition,
  type CompetitionInput,
  type PrizeType,
  type QuizQuestion,
} from '@/api/competitions'
import { emptyQuestion } from '@/features/admin/quiz'
import { QuizEditor } from '@/features/admin/quiz-editor'
import type { AdminGameSummary } from '@/api/games'
import type { Country } from '@/api/types'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/lib/api'
import { selectClassName, textareaClassName } from '@/lib/form-styles'
import { formatPriceAmount, majorToMinor, minorToMajor } from '@/lib/money'

type FormState = {
  country_id: string
  game_slug: string
  title: string
  starts_at: string
  ends_at: string
  timezone: string
  points_per_attempt: string
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

function money(minor: number | undefined, currency: string | undefined): string {
  return minor !== undefined && currency ? String(minorToMajor(minor, currency)) : ''
}

function fromCompetition(c: AdminCompetition): FormState {
  return {
    country_id: c.country_id,
    game_slug: c.game_slug,
    title: c.title,
    starts_at: toLocalInput(c.starts_at),
    ends_at: toLocalInput(c.ends_at),
    timezone: c.timezone,
    points_per_attempt: String(c.points_per_attempt),
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
  country_id: '',
  game_slug: '',
  title: '',
  starts_at: '',
  ends_at: '',
  timezone: '',
  points_per_attempt: '0',
  max_attempts_per_customer: '3',
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
  initial?: AdminCompetition
  games: AdminGameSummary[]
  countries: Country[]
  submitLabel: string
  onSubmit: (input: CompetitionInput) => Promise<void>
}

/**
 * Creates or edits a competition. Editing is only possible until it starts —
 * after that the rules are locked (§13.8) — and saving an edit returns it to
 * draft so every publishing check runs again.
 */
export function CompetitionForm({
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

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function chooseCountry(id: string) {
    const country = countries.find((c) => c.id === id)
    setForm((prev) => ({
      ...prev,
      country_id: id,
      timezone: prev.timezone || country?.default_timezone || '',
      prize_currency: prev.prize_currency || country?.default_currency || '',
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
      country_id: form.country_id,
      game_slug: form.game_slug,
      title: form.title.trim(),
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
      timezone: form.timezone.trim(),
      points_per_attempt: Number(form.points_per_attempt) || 0,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="c-title">Title</Label>
        <Input
          id="c-title"
          required
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Spring 2048 Cup"
          className="h-11"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="c-game">Game</Label>
          <select
            id="c-game"
            required
            className={selectClassName}
            value={form.game_slug}
            onChange={(e) => set('game_slug', e.target.value)}
          >
            <option value="">Choose a game</option>
            {playable.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.name} (v{g.version})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="c-country">Country</Label>
          <select
            id="c-country"
            required
            className={selectClassName}
            value={form.country_id}
            onChange={(e) => chooseCountry(e.target.value)}
          >
            <option value="">Choose a country</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {form.game_slug === 'quiz' ? (
        <QuizEditor
          questions={form.quiz_questions.length ? form.quiz_questions : [emptyQuestion()]}
          onChange={(questions) => set('quiz_questions', questions)}
        />
      ) : null}

      {isChanceGame(form.game_slug) ? (
        <div className="space-y-3 rounded-2xl bg-amber-50 p-4 text-sm ring-1 ring-amber-200">
          <p className="font-semibold text-amber-900">Game of chance</p>
          {form.game_slug === 'prize-draw' ? (
            <p className="text-amber-900/80">
              Every play is one entry. When the round closes you run the draw: winners are picked at random from all
              entries by the server, and the full draw is kept for audit.
            </p>
          ) : (
            <>
              <p className="text-amber-900/80">
                The server decides each play the moment it is made. The first winning play takes the prize and closes
                the round, so there is one winner.
              </p>
              <div className="flex items-center gap-2">
                <Label htmlFor="c-odds" className="shrink-0">
                  Each play wins 1 in
                </Label>
                <Input
                  id="c-odds"
                  type="number"
                  min={2}
                  step={1}
                  value={form.win_odds}
                  onChange={(e) => set('win_odds', e.target.value)}
                  placeholder="500"
                  className="h-10 w-32"
                />
              </div>
            </>
          )}
          <p className="text-xs text-amber-900/70">
            Needs the country&apos;s &quot;Games of chance&quot; approval before it can be published.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="c-start">Starts</Label>
          <Input
            id="c-start"
            type="datetime-local"
            required
            value={form.starts_at}
            onChange={(e) => set('starts_at', e.target.value)}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="c-end">Ends</Label>
          <Input
            id="c-end"
            type="datetime-local"
            required
            value={form.ends_at}
            onChange={(e) => set('ends_at', e.target.value)}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="c-tz">Time zone</Label>
          <Input
            id="c-tz"
            required
            value={form.timezone}
            onChange={(e) => set('timezone', e.target.value)}
            placeholder="Pacific/Auckland"
            className="h-11"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="c-points">Points per play</Label>
          <Input
            id="c-points"
            type="number"
            min={0}
            value={form.points_per_attempt}
            onChange={(e) => set('points_per_attempt', e.target.value)}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="c-attempts">Plays each</Label>
          <Input
            id="c-attempts"
            type="number"
            min={1}
            max={10000}
            value={form.max_attempts_per_customer}
            onChange={(e) => set('max_attempts_per_customer', e.target.value)}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="c-age">Minimum age</Label>
          <Input
            id="c-age"
            type="number"
            min={18}
            value={form.min_age}
            onChange={(e) => set('min_age', e.target.value)}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="c-winners">Winners</Label>
          <Input
            id="c-winners"
            type="number"
            min={1}
            max={100}
            disabled={isChanceGame(form.game_slug) && form.game_slug !== 'prize-draw'}
            value={isChanceGame(form.game_slug) && form.game_slug !== 'prize-draw' ? '1' : form.number_of_winners}
            onChange={(e) => set('number_of_winners', e.target.value)}
            className="h-11"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={form.requires_identity_verification}
          onChange={(e) => set('requires_identity_verification', e.target.checked)}
        />
        Entrants must have their identity verified
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="c-daily">Plays per day (optional)</Label>
          <Input
            id="c-daily"
            type="number"
            min={1}
            value={form.daily_play_limit}
            onChange={(e) => set('daily_play_limit', e.target.value)}
            placeholder="No daily limit"
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="c-minplays">Plays needed to win (optional)</Label>
          <Input
            id="c-minplays"
            type="number"
            min={1}
            value={form.min_plays_to_win}
            onChange={(e) => set('min_plays_to_win', e.target.value)}
            placeholder="Any number"
            className="h-11"
          />
        </div>
      </div>

      <fieldset className="space-y-4 rounded-2xl bg-muted/40 p-4 ring-1 ring-border/60">
        <legend className="px-1 text-sm font-semibold">Prize</legend>
        <div className="grid gap-4 sm:grid-cols-[1fr_130px]">
          <div className="space-y-2">
            <Label htmlFor="c-prize">Description</Label>
            <Input
              id="c-prize"
              required
              value={form.prize_description}
              onChange={(e) => set('prize_description', e.target.value)}
              placeholder="Cash prize, paid by bank transfer"
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-ptype">Type</Label>
            <select
              id="c-ptype"
              className={selectClassName}
              value={form.prize_type}
              onChange={(e) => set('prize_type', e.target.value as PrizeType)}
            >
              {PRIZE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {form.prize_type === 'points' ? (
          <div className="space-y-2">
            <Label htmlFor="c-prize-points">Points per winner</Label>
            <Input
              id="c-prize-points"
              type="number"
              min={1}
              step={1}
              value={form.prize_points}
              onChange={(e) => set('prize_points', e.target.value)}
              placeholder="500"
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              Credited to each winner’s points balance the moment you validate them — nothing to
              claim or ship, and no money reserve is needed.
            </p>
          </div>
        ) : (
        <>
        <div className="grid gap-4 sm:grid-cols-[1fr_110px]">
          <div className="space-y-2">
            <Label htmlFor="c-value">{form.prize_growth_enabled ? 'Starting prize' : 'Prize value'}</Label>
            <Input
              id="c-value"
              type="number"
              min={0}
              step="0.01"
              value={form.prize_value}
              onChange={(e) => set('prize_value', e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-currency">Currency</Label>
            <Input
              id="c-currency"
              maxLength={3}
              value={form.prize_currency}
              onChange={(e) => set('prize_currency', e.target.value.toUpperCase())}
              placeholder="USD"
              className="h-11 uppercase"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={form.prize_growth_enabled}
            onChange={(e) => set('prize_growth_enabled', e.target.checked)}
          />
          Grow the prize with every play
        </label>
        {form.prize_growth_enabled ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="c-inc">Added per play</Label>
                <Input
                  id="c-inc"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.increment}
                  onChange={(e) => set('increment', e.target.value)}
                  placeholder="1.00"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-max">Maximum prize</Label>
                <Input
                  id="c-max"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.max_prize}
                  onChange={(e) => set('max_prize', e.target.value)}
                  placeholder="5000.00"
                  className="h-11"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={form.continue_at_cap}
                onChange={(e) => set('continue_at_cap', e.target.checked)}
              />
              Keep taking plays once the prize reaches its maximum
            </label>
            {growthPreview(form) ? <p className="text-sm text-muted-foreground">{growthPreview(form)}</p> : null}
            <p className="text-xs text-muted-foreground">
              The funded reserve must cover the maximum, and growing prizes must be approved for the country before
              the round can be published.
            </p>
          </>
        ) : null}
        </>
        )}
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="c-rules">Official rules</Label>
        <textarea
          id="c-rules"
          className={`${textareaClassName} min-h-36`}
          value={form.official_rules}
          onChange={(e) => set('official_rules', e.target.value)}
          placeholder="Must be published before the competition can be scheduled."
        />
      </div>

      <FormAlert error={error} />

      <Button type="submit" className="h-11 w-full" disabled={busy}>
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {submitLabel}
      </Button>
    </form>
  )
}
