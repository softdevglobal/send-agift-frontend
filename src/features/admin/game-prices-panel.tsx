import { useState } from 'react'
import { Check, Coins, LoaderCircle, Pencil, X } from 'lucide-react'

import { setGamePlayCost, type AdminGameSummary } from '@/api/games'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { adminPanelClass } from '@/features/admin/admin-styles'
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

function PriceTag({ points }: { points: number }) {
  return points === 0 ? (
    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
      Free
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
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
          className="h-9 w-24 border-primary bg-surface pr-9 text-right tabular-nums"
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

  return (
    <section className={cn(adminPanelClass, 'mb-8 overflow-hidden')}>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/50 bg-[linear-gradient(135deg,oklch(0.97_0.05_88),var(--card)_70%)] px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500 text-white shadow-sm">
            <Coins className="size-5" />
          </span>
          <div>
            <h2 className="font-display text-lg tracking-tight">Price to play</h2>
            <p className="max-w-xl text-sm text-muted-foreground">
              What one play of each game costs. It is taken from the player&apos;s points when the
              game starts; 0 makes a game free, and guests can play free games too.
            </p>
          </div>
        </div>
        {editable ? (
          editing === '*' ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Every game</span>
              <PriceEditor
                label="Price for every game"
                initial=""
                busy={busy}
                onSave={(price) => void saveAll(price)}
                onCancel={() => setEditing(null)}
              />
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 bg-surface"
              disabled={busy || editing !== null}
              onClick={() => open('*')}
            >
              <Pencil className="size-3.5" />
              Set for all
            </Button>
          )
        ) : null}
      </div>

      <FormAlert error={error} notice={notice} className="mx-5 mt-4" />

      <ul className="mt-2 grid sm:grid-cols-2 xl:grid-cols-3">
        {practice.map((game) => (
          <li
            key={game.slug}
            className="flex min-h-[4.25rem] items-center gap-3 border-t border-border/40 px-5 py-3 sm:border-r sm:[&:nth-child(2n)]:border-r-0 xl:[&:nth-child(2n)]:border-r xl:[&:nth-child(3n)]:border-r-0"
          >
            <GameBadge slug={game.slug} className="size-9" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{game.name}</p>
              <p className="text-xs text-muted-foreground">{game.plays.toLocaleString()} plays</p>
            </div>
            {editing === game.slug ? (
              <PriceEditor
                label={`Price for ${game.name}`}
                initial={String(game.play_cost_points)}
                busy={busy}
                onSave={(price) => void save(game, price)}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <div className="flex items-center gap-2">
                <PriceTag points={game.play_cost_points} />
                {editable ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`Edit price for ${game.name}`}
                    className="h-8 gap-1 px-2 text-muted-foreground hover:text-foreground"
                    disabled={busy || editing !== null}
                    onClick={() => open(game.slug)}
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                ) : null}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

export { PriceTag }
