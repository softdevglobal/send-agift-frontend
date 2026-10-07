import {
  ArrowRight,
  CalendarClock,
  Check,
  CircleCheck,
  Coins,
  Earth,
  Gift as GiftIcon,
  Package,
  Search,
  Sparkles,
  Ticket,
  Trophy,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { PRIZE_TYPES, type PrizeType } from '@/api/competitions'
import type { AdminGameSummary } from '@/api/games'
import type { Country } from '@/api/types'
import { gameColor, gameLook } from '@/features/admin/games-format'
import { flagOf } from '@/lib/country-options'
import { cn } from '@/lib/utils'

/** "50 pts a play", or "Free". */
function priceLabel(points: number): string {
  return points === 0 ? 'Free' : `${points.toLocaleString()} pts a play`
}

/**
 * The working games as picture cards, with a search. Chance mechanics and
 * quizzes are not games of their own, so they are left out. Unless an older
 * competition already uses one, which stays selectable so it can be edited.
 */
export function GamePicker({
  games,
  value,
  onChange,
}: {
  games: AdminGameSummary[]
  value: string
  onChange: (slug: string) => void
}) {
  const [query, setQuery] = useState('')
  const working = games.filter((g) => g.practice || g.slug === value)
  const q = query.trim().toLowerCase()
  const shown = q ? working.filter((g) => g.name.toLowerCase().includes(q)) : working

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm leading-none font-medium">Game</p>
        <span className="text-xs text-muted-foreground">
          {working.length} {working.length === 1 ? 'game' : 'games'}
        </span>
      </div>
      <div className="flex h-11 items-center gap-2 rounded-lg border border-input bg-surface px-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search games…"
          aria-label="Search games"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>
      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          {working.length === 0 ? 'No working games yet.' : `No game matches “${query.trim()}”.`}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {shown.map((game) => {
            const selected = game.slug === value
            const Icon = gameLook(game.slug).icon
            return (
              <button
                key={game.slug}
                type="button"
                onClick={() => onChange(game.slug)}
                aria-pressed={selected}
                className={cn(
                  'group relative overflow-hidden rounded-2xl bg-surface text-left ring-1 transition',
                  selected
                    ? 'shadow-lg ring-2 ring-primary'
                    : 'ring-border/70 hover:-translate-y-0.5 hover:shadow-md',
                )}
              >
                <div
                  className="relative flex h-20 items-center justify-center"
                  style={{ background: gameColor(game.slug) }}
                >
                  <Icon className="size-8 text-white drop-shadow transition-transform group-hover:scale-110" />
                  {selected ? (
                    <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-white text-primary shadow">
                      <Check className="size-3.5" />
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <p className="truncate text-sm font-semibold">{game.name}</p>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
                    <Coins className="size-3" />
                    {priceLabel(game.play_cost_points)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** A soft, centred placeholder for a step that has nothing to show yet. */
export function EmptyHint({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon
  title: string
  text: string
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-8 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-6" />
      </span>
      <p className="text-sm font-semibold">{title}</p>
      <p className="max-w-xs text-xs text-muted-foreground">{text}</p>
    </div>
  )
}

/** The chosen countries as flag cards, with what the prize could be paid in. */
export function CountryCards({
  countries,
  onRemove,
}: {
  countries: Country[]
  onRemove: (id: string) => void
}) {
  if (countries.length === 0) {
    return (
      <EmptyHint
        icon={Earth}
        title="No countries yet"
        text="Pick one or more above. Players outside these countries won't see the competition."
      />
    )
  }
  return (
    <div className="space-y-2.5">
      <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        Open to players in {countries.length} {countries.length === 1 ? 'country' : 'countries'}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {countries.map((c) => (
          <div
            key={c.id}
            className="group relative flex items-center gap-3 rounded-2xl bg-violet-50 p-3 ring-1 ring-violet-100"
          >
            <span className="text-3xl leading-none" aria-hidden>
              {flagOf(c.iso_code) || '🌐'}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{c.name}</p>
              <p className="text-xs text-muted-foreground">
                {[c.iso_code?.toUpperCase(), c.default_currency?.toUpperCase()]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(c.id)}
              className="absolute top-1.5 right-2 text-xs text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-foreground"
              aria-label={`Remove ${c.name}`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

/** "7 days", "1 day 4 hours", "3 hours". */
function duration(ms: number): string {
  const hours = Math.round(ms / 3_600_000)
  const days = Math.floor(hours / 24)
  const rest = hours % 24
  const part = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`
  if (days === 0) return part(Math.max(hours, 1), 'hour')
  return rest ? `${part(days, 'day')} ${part(rest, 'hour')}` : part(days, 'day')
}

function whenLabel(d: Date): { day: string; time: string } {
  return {
    day: d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }),
    time: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
  }
}

/** Start → end as a timeline, with how long the round runs. */
export function ScheduleTimeline({
  startsAt,
  endsAt,
  timezone,
}: {
  startsAt: Date | null
  endsAt: Date | null
  timezone: string
}) {
  if (!startsAt || !endsAt || endsAt <= startsAt) {
    return (
      <EmptyHint
        icon={CalendarClock}
        title="Pick a start and an end"
        text="The round opens and closes on its own at these times. No need to come back and press anything."
      />
    )
  }
  const from = whenLabel(startsAt)
  const to = whenLabel(endsAt)
  return (
    <div className="overflow-hidden rounded-2xl bg-brand-navy p-5 text-white shadow-lg">
      <p className="text-xs font-semibold tracking-[0.12em] text-white/70 uppercase">
        Runs for {duration(endsAt.getTime() - startsAt.getTime())}
      </p>
      <div className="mt-4 flex items-center gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-white/60 uppercase">Opens</p>
          <p className="font-display text-lg leading-tight">{from.day}</p>
          <p className="text-sm text-white/80">{from.time}</p>
        </div>
        <div className="relative mx-1 h-1.5 flex-1 rounded-full bg-white/20">
          <div className="absolute inset-y-0 left-0 w-full rounded-full bg-brand-teal" />
          <ArrowRight className="absolute top-1/2 left-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-violet p-0.5" />
        </div>
        <div className="min-w-0 text-right">
          <p className="text-[11px] text-white/60 uppercase">Closes</p>
          <p className="font-display text-lg leading-tight">{to.day}</p>
          <p className="text-sm text-white/80">{to.time}</p>
        </div>
      </div>
      {timezone ? <p className="mt-4 text-xs text-white/60">Times shown in your browser&apos;s time; the round runs on {timezone}.</p> : null}
    </div>
  )
}

const prizeIcons: Record<PrizeType, LucideIcon> = {
  cash: Coins,
  product: Package,
  voucher: Ticket,
  gift: GiftIcon,
  points: Sparkles,
  other: Trophy,
}

/** The prize types as icon tiles. */
export function PrizeTypeTiles({
  value,
  onChange,
}: {
  value: PrizeType
  onChange: (type: PrizeType) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
      {PRIZE_TYPES.map((t) => {
        const Icon = prizeIcons[t.value]
        const selected = value === t.value
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            aria-pressed={selected}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-xs font-medium ring-1 transition',
              selected
                ? 'bg-primary text-primary-foreground shadow-md ring-primary'
                : 'bg-surface ring-border/70 hover:bg-accent',
            )}
          >
            <Icon className="size-5" />
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

/** A live card of the prize, as players will roughly see it. */
export function PrizePreview({
  type,
  amount,
  description,
  winners,
  grows,
}: {
  type: PrizeType
  amount: string
  description: string
  winners: string
  grows: boolean
}) {
  const Icon = prizeIcons[type]
  return (
    <div className="relative overflow-hidden rounded-2xl bg-orange-500 p-5 text-white shadow-lg">
      <Icon className="absolute -right-4 -bottom-4 size-28 text-white/15" />
      <p className="text-[11px] font-semibold tracking-[0.14em] text-white/80 uppercase">
        Prize preview
      </p>
      <p className="mt-1 font-poster text-3xl">{amount}</p>
      <p className="mt-1 max-w-[80%] text-sm text-white/90">
        {description.trim() || 'Describe what the winner gets'}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <Chip>
          {winners} {winners === '1' ? 'winner' : 'winners'}
        </Chip>
        {grows ? <Chip>Grows with every play</Chip> : null}
      </div>
    </div>
  )
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-white/20 px-2.5 py-1 font-medium backdrop-blur">{children}</span>
}

/** What good official rules cover, ticked off as the admin writes them. */
export function RulesChecklist({ rules }: { rules: string }) {
  const text = rules.toLowerCase()
  const items = [
    { label: 'Who can enter', done: /enter|eligib|open to|age/.test(text) },
    { label: 'How the winner is chosen', done: /winner|highest|score|draw|random/.test(text) },
    { label: 'What the prize is', done: /prize/.test(text) },
    { label: 'When it opens and closes', done: /open|close|start|end/.test(text) },
    { label: 'How the prize is claimed', done: /claim|paid|deliver|contact/.test(text) },
  ]
  return (
    <div className="rounded-2xl bg-muted/50 p-4">
      <p className="mb-2 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        Good rules cover
      </p>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-sm">
            <CircleCheck
              className={cn('size-4 shrink-0', item.done ? 'text-emerald-600' : 'text-muted-foreground/40')}
            />
            <span className={cn(!item.done && 'text-muted-foreground')}>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
