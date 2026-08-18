import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { adminPanelClass } from '@/features/admin/admin-styles'
import { cn } from '@/lib/utils'

type AdminEmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
  /** Shows a "Coming soon" ribbon for sections without backend endpoints yet. */
  soon?: boolean
}

export function AdminEmptyState({
  icon: Icon,
  title,
  description,
  action,
  soon = false,
}: AdminEmptyStateProps) {
  return (
    <div
      className={cn(
        adminPanelClass,
        'relative overflow-hidden px-6 py-16 text-center sm:py-20',
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_top,oklch(0.94_0.03_125/0.45),transparent_70%)]"
      />
      {soon ? (
        <span className="relative mb-4 inline-flex rounded-full bg-accent px-3 py-1 text-[11px] font-medium tracking-[0.12em] text-accent-foreground uppercase">
          Coming soon
        </span>
      ) : null}
      <div className="relative mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-accent text-primary ring-1 ring-primary/10">
        <Icon className="size-6" />
      </div>
      <h2 className="relative font-display text-xl tracking-tight">{title}</h2>
      <p className="relative mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action ? <div className="relative mt-6">{action}</div> : null}
    </div>
  )
}
