import { useState } from 'react'
import { Check, Coins, LoaderCircle, Pencil, X } from 'lucide-react'

import { setGamePlayCost, type AdminGameSummary } from '@/api/games'
import { FormAlert } from '@/components/common/form-alert'
import { Sparkle } from '@/components/common/storefront-decor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { gameColor } from '@/features/admin/games-format'
import { GameBadge } from '@/features/admin/games-ui'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

const MAX_PRICE = 1_000_000

function parsePrice(raw: string): number | null {
  if (raw.trim() === '') return null
  const n = Number(raw)
  return Number.isInteger(n) && n >= 0 && n <= MAX_PRICE ? n : null
}

function describe(points: number) {
  return points === 0 ? 'nothing' : `${points.toLocaleString()} points`
}

/** One-tap prices for the commonest choices. */
const PRESETS = [0, 10, 25, 50, 100]

function PriceTag({ points }: { points: number }) {
  return points === 0 ? (
    <span className="rounded-md bg-brand-teal px-2 py-0.5 text-[10px] font-bold tracking-[0.08em] text-brand-ink uppercase">
      Free
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-md bg-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-950">
      <Coins className="size-3" />
      {points.toLocaleString()} pts
    </span>
  )
}

/** A points field with Save and Cancel, shown only while editing. */
function PriceEditor({
  label,
  initial,
  busy,
  onSave,
  onCancel,
}: {
  label: string
  initial: string
  busy: boolean
  onSave: (price: number) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState(initial)
  const price = parsePrice(draft)
  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault()
        if (price !== null) onSave(price)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel()
      }}
    >
      <div className="relative">
        <Input
          autoFocus
          aria-label={label}
          inputMode="numeric"
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
          onFocus={(e) => e.target.select()}
          aria-invalid={(draft !== '' && price === null) || undefined}
          className="h-9 w-24 border-2 border-brand-ink bg-surface pr-9 text-right font-bold tabular-nums focus-visible:ring-0"
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
          pts
        </span>
      </div>
      <Button
        type="submit"
        size="icon"
        aria-label="Save"
        className="size-9"
        disabled={price === null || busy}
      >
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="Cancel"
        className="size-9"
        disabled={busy}
        onClick={onCancel}
      >
        <X className="size-4" />
      </Button>
    </form>
  )
}

type GamePricesPanelProps = {
  games: AdminGameSummary[]
  /** Platform admins can change prices; anyone else sees them read-only. */
  editable: boolean
  onSaved: (game: AdminGameSummary) => void
}

/**
 * What one play of each game costs, in points. The server takes it from the
 * player's balance when a game starts, so a price set here applies to the
 * very next play. Only games customers can play on their own are listed.
 * chance games and quizzes run inside competitions, priced there.
 */
export function GamePricesPanel({ games, editable, onSaved }: GamePricesPanelProps) {
  const practice = games.filter((g) => g.practice)
  // Which price is open for editing: a game's slug, '*' for every game.
  const [editing, setEditing] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  function open(key: string) {
    setEditing(key)
    setError(null)
    setNotice(null)
  }

  async function save(game: AdminGameSummary, price: number) {
    if (price === game.play_cost_points) {
      setEditing(null)
      return
    }
    setBusy(true)
    setError(null)
    try {
      onSaved(await setGamePlayCost(game.slug, price))
      setNotice(`${game.name} now costs ${describe(price)} a play.`)
      setEditing(null)
    } catch (err) {
      setError(getErrorMessage(err, `Could not set the price for ${game.name}.`))
    } finally {
      setBusy(false)
    }
  }

  async function saveAll(price: number) {
    setBusy(true)
    setError(null)
    try {
      for (const game of practice) {
        if (game.play_cost_points === price) continue
        onSaved(await setGamePlayCost(game.slug, price))
      }
      setNotice(`Every game now costs ${describe(price)} a play.`)
      setEditing(null)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not update every price.'))
    } finally {
      setBusy(false)
    }
  }

  if (practice.length === 0) return null

  const freeCount = practice.filter((g) => g.play_cost_points === 0).length
  const paid = practice.filter((g) => g.play_cost_points > 0)
  const average = paid.length
    ? Math.round(paid.reduce((sum, g) => sum + g.play_cost_points, 0) / paid.length)
    : 0

  return (
    <section className="mb-8 space-y-4">
      {/* The rule, the two numbers worth knowing, and the bulk action. */}
      <div className="relative grid overflow-hidden rounded-xl bg-amber-300 text-amber-950 lg:grid-cols-[minmax(0,1fr)_auto]">
        <Sparkle className="absolute top-5 right-[38%] hidden size-6 text-white lg:block" />
        <div className="px-6 py-6 sm:px-8">
          <p className="inline-flex items-center gap-1.5 rounded-md bg-brand-ink px-2.5 py-1 text-[10px] font-bold tracking-[0.18em] text-white uppercase">
            <Coins className="size-3.5 text-amber-300" />
            Price to play
          </p>
          <p className="mt-3 font-poster text-3xl sm:text-4xl">Points per play</p>
          <p className="mt-2 max-w-xl text-sm font-medium text-amber-950/75">
            Taken from the player&apos;s points when a game starts. 0 makes a game free, and guests
            can play free games too. A change applies to the very next play.
          </p>
        </div>
        <div className="flex flex-wrap items-stretch gap-2 p-4 sm:p-5 lg:w-[26rem]">
          <div className="flex flex-1 flex-col justify-between rounded-lg bg-white/70 p-3.5">
            <span className="text-[10px] font-bold tracking-[0.14em] uppercase opacity-70">Free games</span>
            <span className="mt-2 font-poster text-3xl">
              {freeCount}
              <span className="ml-1 font-sans text-sm font-bold opacity-60">/{practice.length}</span>
            </span>
          </div>
          <div className="flex flex-1 flex-col justify-between rounded-lg bg-brand-ink p-3.5 text-white">
            <span className="text-[10px] font-bold tracking-[0.14em] uppercase opacity-70">Average price</span>
            <span className="mt-2 font-poster text-3xl text-amber-300">
              {average}
              <span className="ml-1 font-sans text-sm font-bold text-white/60">pts</span>
            </span>
          </div>
          {editable ? (
            <div className="flex w-full items-center justify-between gap-2 rounded-lg bg-white/70 p-2.5">
              {editing === '*' ? (
                <>
                  <span className="pl-1 text-xs font-bold tracking-[0.08em] uppercase">Every game</span>
                  <PriceEditor
                    label="Price for every game"
                    initial=""
                    busy={busy}
                    onSave={(price) => void saveAll(price)}
                    onCancel={() => setEditing(null)}
                  />
                </>
              ) : (
                <Button
                  type="button"
                  className="h-9 w-full"
                  disabled={busy || editing !== null}
                  onClick={() => open('*')}
                >
                  <Pencil className="size-3.5" />
                  Set one price for all
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <FormAlert error={error} notice={notice} />

      {/* One ticket per game. */}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {practice.map((game) => (
          <li
            key={game.slug}
            className="flex flex-col overflow-hidden rounded-xl border-2 border-brand-ink/10 bg-card"
          >
            <span aria-hidden className="h-1.5" style={{ background: gameColor(game.slug) }} />
            <div className="flex items-center gap-3 px-4 pt-4">
              <GameBadge slug={game.slug} className="size-10" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-extrabold">{game.name}</p>
                <p className="text-xs text-muted-foreground">{game.plays.toLocaleString()} plays</p>
              </div>
              <div className="text-right">
                {game.play_cost_points === 0 ? (
                  <span className="font-poster text-2xl text-brand-teal">FREE</span>
                ) : (
                  <span className="font-poster text-2xl">
                    {game.play_cost_points.toLocaleString()}
                    <span className="ml-0.5 font-sans text-[11px] font-bold text-muted-foreground">PTS</span>
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 border-t-2 border-dashed border-brand-ink/10 px-4 py-3">
              {editing === game.slug ? (
                <PriceEditor
                  label={`Price for ${game.name}`}
                  initial={String(game.play_cost_points)}
                  busy={busy}
                  onSave={(price) => void save(game, price)}
                  onCancel={() => setEditing(null)}
                />
              ) : editable ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {PRESETS.map((price) => {
                    const current = game.play_cost_points === price
                    return (
                      <button
                        key={price}
                        type="button"
                        disabled={busy || editing !== null || current}
                        onClick={() => void save(game, price)}
                        className={cn(
                          'h-8 rounded-md px-2.5 text-[11px] font-bold tracking-[0.04em] uppercase transition-colors disabled:cursor-default',
                          current
                            ? 'bg-brand-ink text-white'
                            : 'border-2 border-brand-ink/15 text-brand-ink hover:border-brand-ink disabled:opacity-50',
                        )}
                      >
                        {price === 0 ? 'Free' : price}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    aria-label={`Set a custom price for ${game.name}`}
                    disabled={busy || editing !== null}
                    onClick={() => open(game.slug)}
                    className="ml-auto flex h-8 items-center gap-1 rounded-md px-2 text-[11px] font-bold tracking-[0.04em] text-brand-violet uppercase hover:bg-accent disabled:opacity-50"
                  >
                    <Pencil className="size-3.5" />
                    Custom
                  </button>
                </div>
              ) : (
                <PriceTag points={game.play_cost_points} />
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export { PriceTag }
