import { useId, useState } from 'react'
import { Star } from 'lucide-react'

import { ratingWord } from '@/features/reviews/rating-words'
import { cn } from '@/lib/utils'

/**
 * Stars, three ways.
 *
 * `StarMeter` shows a score and fills the last star *partially* — a 4.3 looks
 * like a 4.3 rather than rounding to a flat 4, which is the whole point of
 * showing a decimal average at all.
 *
 * `StarPicker` is the one a customer actually touches: big targets, a spring
 * on selection, a sparkle off the star just chosen, and a word for the score
 * so the number is never the only feedback.
 */

const SIZES = {
  xs: 'size-3',
  sm: 'size-3.5',
  md: 'size-4',
  lg: 'size-5',
} as const

export type StarSize = keyof typeof SIZES

type StarMeterProps = {
  value: number
  size?: StarSize
  /** Adds "4.3" next to the stars. */
  showValue?: boolean
  /** Adds "(12 reviews)". Pass 0 to render "No reviews yet". */
  count?: number
  className?: string
}

/**
 * Read-only stars with a fractional fill.
 *
 * Two identical rows are stacked: outlines underneath, gold on top clipped to
 * the score's width. That keeps a half star exact at any size without needing
 * half-star icons or SVG masks per size.
 */
export function StarMeter({
  value,
  size = 'sm',
  showValue = false,
  count,
  className,
}: StarMeterProps) {
  const safe = Math.max(0, Math.min(5, value))
  const iconClass = SIZES[size]
  const textClass = size === 'lg' || size === 'md' ? 'text-sm' : 'text-xs'

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span
        className="relative inline-flex shrink-0"
        role="img"
        aria-label={`${safe.toFixed(1)} out of 5 stars`}
      >
        <span className="inline-flex gap-0.5" aria-hidden>
          {Array.from({ length: 5 }).map((_, index) => (
            <Star key={index} className={cn(iconClass, 'text-muted-foreground/30')} />
          ))}
        </span>
        <span
          className="pointer-events-none absolute inset-0 inline-flex gap-0.5 overflow-hidden"
          style={{ width: `${(safe / 5) * 100}%` }}
          aria-hidden
        >
          {Array.from({ length: 5 }).map((_, index) => (
            <Star
              key={index}
              className={cn(iconClass, 'shrink-0 fill-amber-400 text-amber-400')}
            />
          ))}
        </span>
      </span>
      {showValue && safe > 0 ? (
        <span className={cn('font-semibold text-foreground', textClass)}>
          {safe.toFixed(1)}
        </span>
      ) : null}
      {count != null ? (
        <span className={cn('text-muted-foreground', textClass)}>
          {count === 0
            ? 'No reviews yet'
            : `(${count.toLocaleString()} ${count === 1 ? 'review' : 'reviews'})`}
        </span>
      ) : null}
    </div>
  )
}

type StarPickerProps = {
  value: number
  onChange: (value: number) => void
  /** Small is for the three breakdown rows; large is the headline rating. */
  size?: 'md' | 'lg'
  /** Shows the live word for the current score. */
  showWord?: boolean
  label: string
  id?: string
  disabled?: boolean
  className?: string
}

/**
 * The rating control.
 *
 * Hovering previews a score without committing it, so the stars answer
 * "what would 4 look like?" before the click. Arrow keys move the score for
 * anyone not using a pointer — the group is one tab stop, not five.
 */
export function StarPicker({
  value,
  onChange,
  size = 'lg',
  showWord = false,
  label,
  id,
  disabled = false,
  className,
}: StarPickerProps) {
  const [hovered, setHovered] = useState(0)
  const [justPicked, setJustPicked] = useState(0)
  const groupId = useId()
  // While the pointer is over the strip the stars show what that click would
  // give; they fall back to the committed value the moment it leaves.
  const shown = hovered || value

  const starClass = size === 'lg' ? 'size-9' : 'size-6'
  const gapClass = size === 'lg' ? 'gap-1.5' : 'gap-1'

  function pick(next: number) {
    if (disabled) return
    onChange(next)
    setJustPicked(next)
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1', className)}>
      <div
        role="radiogroup"
        aria-label={label}
        id={id}
        tabIndex={disabled ? -1 : 0}
        onMouseLeave={() => setHovered(0)}
        onKeyDown={(event) => {
          if (disabled) return
          if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
            event.preventDefault()
            pick(Math.min(5, (value || 0) + 1))
          }
          if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
            event.preventDefault()
            pick(Math.max(1, (value || 1) - 1))
          }
        }}
        className={cn(
          'inline-flex rounded-xl outline-none',
          gapClass,
          'focus-visible:ring-3 focus-visible:ring-ring/50',
          disabled && 'opacity-60',
        )}
      >
        {Array.from({ length: 5 }).map((_, index) => {
          const rating = index + 1
          const lit = rating <= shown
          return (
            <button
              key={rating}
              type="button"
              role="radio"
              aria-checked={value === rating}
              aria-label={`${rating} ${rating === 1 ? 'star' : 'stars'} — ${ratingWord(rating)}`}
              disabled={disabled}
              tabIndex={-1}
              onMouseEnter={() => setHovered(rating)}
              onFocus={() => setHovered(rating)}
              onClick={() => pick(rating)}
              className={cn(
                'relative rounded-lg p-0.5 transition-transform duration-150',
                !disabled && 'hover:-translate-y-0.5 active:scale-95',
                disabled && 'cursor-not-allowed',
              )}
            >
              {/* The sparkle is keyed on the score so re-picking replays it. */}
              {justPicked === rating ? (
                <span
                  key={`${groupId}-${rating}-${value}`}
                  className="animate-star-sparkle pointer-events-none absolute inset-0 rounded-full bg-amber-400/40"
                  aria-hidden
                />
              ) : null}
              <Star
                className={cn(
                  starClass,
                  'transition-colors duration-150',
                  lit
                    ? 'fill-amber-400 text-amber-400 drop-shadow-[0_1px_6px_rgb(251_191_36/0.45)]'
                    : 'text-muted-foreground/35',
                  // Only the star that was clicked springs — popping the whole
                  // row on every click turns a small confirmation into noise.
                  justPicked === rating && 'animate-star-pop',
                )}
              />
            </button>
          )
        })}
      </div>
      {showWord ? (
        <span
          className={cn(
            'text-sm font-medium',
            shown > 0 ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {ratingWord(shown)}
        </span>
      ) : null}
    </div>
  )
}

type RatingBarsProps = {
  /** Keys "1".."5" → count, straight from the summary endpoint. */
  breakdown: Record<string, number>
  total: number
  className?: string
  /** Clicking a row filters the list; omit to render plain bars. */
  onSelect?: (stars: number | null) => void
  selected?: number | null
}

/** The 5→1 distribution, so a 4.6 made of forty 5s reads differently to one made of 4s. */
export function RatingBars({
  breakdown,
  total,
  className,
  onSelect,
  selected = null,
}: RatingBarsProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {[5, 4, 3, 2, 1].map((stars) => {
        const count = breakdown[String(stars)] ?? 0
        const percent = total > 0 ? (count / total) * 100 : 0
        const active = selected === stars
        const Row = onSelect ? 'button' : 'div'
        return (
          <Row
            key={stars}
            {...(onSelect
              ? {
                  type: 'button' as const,
                  onClick: () => onSelect(active ? null : stars),
                  'aria-pressed': active,
                }
              : {})}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-1.5 py-0.5 text-left',
              onSelect && 'transition-colors hover:bg-muted',
              active && 'bg-muted',
            )}
          >
            <span className="w-8 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
              {stars}★
            </span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className="animate-meter-fill block h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
                style={{ width: `${percent}%` }}
              />
            </span>
            <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {count}
            </span>
          </Row>
        )
      })}
    </div>
  )
}
