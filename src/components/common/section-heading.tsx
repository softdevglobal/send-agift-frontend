import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'

type SectionHeadingProps = {
  title: string
  actionLabel?: string
  actionTo?: string
  className?: string
  align?: 'left' | 'center'
  /** Colour of the bar behind the title. */
  marker?: 'teal' | 'violet'
}

export function SectionHeading({
  title,
  actionLabel,
  actionTo,
  className,
  align = 'left',
  marker = 'teal',
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'mb-8 flex flex-col gap-3 sm:mb-10 sm:flex-row sm:items-end sm:justify-between',
        align === 'center' && 'items-center text-center sm:flex-col sm:items-center',
        className
      )}
    >
      <h2 className="font-poster text-[1.7rem] text-brand-ink sm:text-4xl dark:text-foreground">
        <span
          className="marker-underline"
          style={{
            ['--marker' as string]:
              marker === 'violet'
                ? 'color-mix(in oklch, var(--brand-violet), white 55%)'
                : 'color-mix(in oklch, var(--brand-teal), white 35%)',
          }}
        >
          {title}
        </span>
      </h2>
      {actionLabel && actionTo ? (
        <Link
          to={actionTo}
          className="group inline-flex items-center gap-2 text-xs font-bold tracking-[0.12em] text-brand-ink uppercase dark:text-foreground"
        >
          {actionLabel}
          <span className="flex size-7 items-center justify-center rounded-full bg-brand-ink text-white transition-transform group-hover:translate-x-0.5 dark:bg-primary">
            <ArrowRight className="size-3.5" />
          </span>
        </Link>
      ) : null}
    </div>
  )
}
