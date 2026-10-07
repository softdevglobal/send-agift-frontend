import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'

/**
 * "Back to the list" in the box template: an arrow tile and an uppercase
 * label. `onDark` for links that sit on an ink or violet header.
 */
export function BackLink({
  to,
  label,
  onDark = false,
  className,
}: {
  to: string
  label: string
  onDark?: boolean
  className?: string
}) {
  return (
    <Link
      to={to}
      className={cn(
        'group inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.12em] uppercase transition-colors',
        onDark ? 'text-white/80 hover:text-white' : 'text-brand-ink dark:text-foreground',
        className,
      )}
    >
      <span
        className={cn(
          'flex size-8 items-center justify-center rounded-md border-2 transition-colors',
          onDark
            ? 'border-white/25 group-hover:border-white group-hover:bg-white group-hover:text-brand-ink'
            : 'border-brand-ink/15 group-hover:border-brand-ink group-hover:bg-brand-ink group-hover:text-white',
        )}
      >
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
      </span>
      {label}
    </Link>
  )
}
