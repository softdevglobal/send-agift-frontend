import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { sellerPanelClass } from '@/features/seller/seller-styles'
import { cn } from '@/lib/utils'

type SellerEmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}

export function SellerEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: SellerEmptyStateProps) {
  return (
    <div
      className={cn(
        sellerPanelClass,
        'relative overflow-hidden px-6 py-16 text-center sm:py-20',
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,oklch(0.94_0.03_125/0.55),transparent_72%)]"
      />
      {/* Faint dot grid so the panel isn't a blank field of white. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5] [background-image:radial-gradient(oklch(0.7_0.02_120/0.35)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
      />

      <div className="relative mx-auto mb-6 grid size-14 place-items-center">
        {/* Concentric halo — the icon reads as a focal point, not a lone chip. */}
        <span
          aria-hidden
          className="absolute size-14 rounded-2xl bg-accent/40 ring-1 ring-primary/10"
        />
        <span
          aria-hidden
          className="absolute size-[4.75rem] rounded-[1.4rem] ring-1 ring-primary/10"
        />
        <span
          aria-hidden
          className="absolute size-24 rounded-[1.7rem] ring-1 ring-primary/[0.06]"
        />
        <span className="relative grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_10px_26px_rgba(60,45,140,0.28)]">
          <Icon className="size-5" />
        </span>
      </div>

      <h2 className="relative font-display text-xl tracking-tight">{title}</h2>
      <p className="relative mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action ? <div className="relative mt-6">{action}</div> : null}
    </div>
  )
}
