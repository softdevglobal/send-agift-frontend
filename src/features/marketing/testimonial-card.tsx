import { Quote, Star } from 'lucide-react'

import type { Testimonial } from '@/features/marketing/data'

type TestimonialCardProps = {
  testimonial: Testimonial
}

export function TestimonialCard({ testimonial }: TestimonialCardProps) {
  return (
    <article className="flex h-full flex-col rounded-2xl bg-card p-6 shadow-[0_8px_30px_rgba(40,50,30,0.06)] ring-1 ring-border/60">
      <Quote className="mb-4 size-7 text-primary" strokeWidth={1.5} />
      <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
        “{testimonial.quote}”
      </p>
      <div className="mt-6 flex items-center justify-between gap-3 border-t border-border/70 pt-4">
        <div className="flex items-center gap-3">
          <img
            src={testimonial.avatar}
            alt={testimonial.name}
            className="size-10 rounded-full object-cover"
            loading="lazy"
          />
          <div>
            <p className="text-sm font-semibold">{testimonial.name}</p>
            {testimonial.role ? (
              <p className="text-xs text-muted-foreground">{testimonial.role}</p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {Array.from({ length: testimonial.rating }).map((_, index) => (
            <Star
              key={index}
              className="size-3.5 fill-amber-400 text-amber-400"
            />
          ))}
        </div>
      </div>
    </article>
  )
}
