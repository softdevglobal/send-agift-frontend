import { Star } from 'lucide-react'

import { cn } from '@/lib/utils'

type StarRatingProps = {
  value: number
  count?: number
  size?: 'sm' | 'md'
  variant?: 'full' | 'compact'
  className?: string
}

export function StarRating({
  value,
  count,
  size = 'sm',
  variant = 'full',
  className,
}: StarRatingProps) {
  if (variant === 'compact') {
    return (
      <div className={cn('inline-flex items-center gap-1 text-xs text-muted-foreground', className)}>
        <Star className="size-3 fill-amber-400 text-amber-400" />
        {count && count > 0 ? (
          <>
            <span className="font-semibold text-foreground">{value.toFixed(1)}</span>
            <span>({count})</span>
          </>
        ) : null}
      </div>
    )
  }
  const iconClass = size === 'md' ? 'size-4' : 'size-3.5'
  const rounded = Math.round(value)

  return (
    <div className={cn('flex items-center gap-1.5 text-muted-foreground', className)}>
      <span className="inline-flex items-center gap-0.5" aria-hidden>
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            className={cn(
              iconClass,
              index < rounded ? 'fill-amber-400 text-amber-400' : 'text-border',
            )}
          />
        ))}
      </span>
      {value > 0 ? (
        <span
          className={cn(
            'font-medium text-foreground',
            size === 'md' ? 'text-sm' : 'text-xs',
          )}
        >
          {value.toFixed(1)}
        </span>
      ) : null}
      {count != null ? (
        <span className={size === 'md' ? 'text-sm' : 'text-xs'}>
          ({count} {count === 1 ? 'review' : 'reviews'})
        </span>
      ) : null}
    </div>
  )
}

type StarRatingInputProps = {
  value: number
  onChange: (value: number) => void
  id?: string
}

export function StarRatingInput({ value, onChange, id }: StarRatingInputProps) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {Array.from({ length: 5 }).map((_, index) => {
        const rating = index + 1
        const selected = rating <= value
        return (
          <button
            key={rating}
            id={rating === 1 ? id : undefined}
            type="button"
            role="radio"
            aria-checked={value === rating}
            aria-label={`${rating} star${rating === 1 ? '' : 's'}`}
            className="rounded-md p-0.5 text-border transition-colors hover:text-amber-400"
            onClick={() => onChange(rating)}
          >
            <Star
              className={cn(
                'size-6',
                selected ? 'fill-amber-400 text-amber-400' : 'text-current',
              )}
            />
          </button>
        )
      })}
    </div>
  )
}
