import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'

type SectionHeadingProps = {
  title: string
  actionLabel?: string
  actionTo?: string
  className?: string
  align?: 'left' | 'center'
}

export function SectionHeading({
  title,
  actionLabel,
  actionTo,
  className,
  align = 'left',
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'mb-8 flex flex-col gap-3 sm:mb-10 sm:flex-row sm:items-end sm:justify-between',
        align === 'center' && 'items-center text-center sm:flex-col sm:items-center',
        className
      )}
    >
      <h2 className="font-display text-3xl tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      {actionLabel && actionTo ? (
        <Link
          to={actionTo}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          {actionLabel}
          <ArrowRight className="size-4" />
        </Link>
      ) : null}
    </div>
  )
}
