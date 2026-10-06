import { Star } from 'lucide-react'

import type { Testimonial } from '@/features/marketing/data'
import { cn } from '@/lib/utils'

type TestimonialCardProps = {
  testimonial: Testimonial
  /** Cycles the card's solid colour so a row of three reads as a set. */
  index?: number
}

const tones = [
  'bg-accent text-brand-ink',
  'bg-brand-ink text-white',
  'bg-[color-mix(in_oklch,var(--brand-teal),white_70%)] text-brand-ink',
]

export function TestimonialCard({ testimonial, index = 0 }: TestimonialCardProps) {
  const tone = tones[index % tones.length]
  const onDark = index % tones.length === 1

  return (
    <article className={cn('flex h-full flex-col rounded-2xl p-7', tone)}>
      <span
        aria-hidden
        className={cn(
          'font-poster text-6xl leading-none',
          onDark ? 'text-brand-teal' : 'text-brand-violet',
        )}
      >
        “
      </span>
      <p className={cn('mt-2 flex-1 text-[15px] leading-relaxed font-medium', onDark ? 'text-white/85' : '')}>
        {testimonial.quote}
      </p>
      <div
        className={cn(
          'mt-6 flex items-center justify-between gap-3 border-t pt-4',
          onDark ? 'border-white/15' : 'border-brand-ink/10',
        )}
      >
        <div className="flex items-center gap-3">
          <img
            src={testimonial.avatar}
            alt={testimonial.name}
            className="size-10 rounded-full object-cover"
            loading="lazy"
          />
          <div>
            <p className="text-sm font-bold">{testimonial.name}</p>
            {testimonial.role ? (
              <p className={cn('text-xs', onDark ? 'text-white/60' : 'text-muted-foreground')}>
                {testimonial.role}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {Array.from({ length: testimonial.rating }).map((_, index) => (
            <Star key={index} className="size-3.5 fill-amber-400 text-amber-400" />
          ))}
        </div>
      </div>
    </article>
  )
}
