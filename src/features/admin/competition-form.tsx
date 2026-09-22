import { useState, type FormEvent } from 'react'
import { LoaderCircle } from 'lucide-react'

import type { AdminCompetition, CompetitionInput } from '@/api/competitions'
import type { AdminGameSummary } from '@/api/games'
import type { Country } from '@/api/types'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/lib/api'
import { selectClassName, textareaClassName } from '@/lib/form-styles'
import { majorToMinor, minorToMajor } from '@/lib/money'

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
}

/** An ISO time as a `datetime-local` value in the admin's own time zone. */
function toLocalInput(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
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
    prize_value:
      c.prize_value_amount !== undefined && c.prize_currency
        ? String(minorToMajor(c.prize_value_amount, c.prize_currency))
        : '',
    prize_currency: c.prize_currency ?? '',
    official_rules: c.official_rules ?? '',
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
    const value = form.prize_value.trim() === '' ? null : Number(form.prize_value)
    if (value !== null && (Number.isNaN(value) || value < 0)) {
      setError('The prize value must be a positive amount.')
      return
    }
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
      number_of_winners: Number(form.number_of_winners) || 0,
      prize_description: form.prize_description.trim(),
      prize_value_amount: value === null || !currency ? null : majorToMinor(value, currency),
      prize_currency: currency || null,
      official_rules: form.official_rules.trim() || null,
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
          <Label htmlFor="c-points">Points per attempt</Label>
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
          <Label htmlFor="c-attempts">Attempts each</Label>
          <Input
            id="c-attempts"
            type="number"
            min={1}
            max={100}
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
            value={form.number_of_winners}
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

      <div className="grid gap-4 sm:grid-cols-[1fr_140px_110px]">
        <div className="space-y-2">
          <Label htmlFor="c-prize">Prize</Label>
          <Input
            id="c-prize"
            required
            value={form.prize_description}
            onChange={(e) => set('prize_description', e.target.value)}
            placeholder="NZ$50 gift card"
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="c-value">Prize value</Label>
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
            placeholder="NZD"
            className="h-11 uppercase"
          />
        </div>
      </div>

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
