import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { sellerToneClass, type SellerTone } from '@/features/seller/seller-styles'
import { cn } from '@/lib/utils'

type SellerPageHeaderProps = {
  title: string
  description?: string
  action?: ReactNode
  /** Repeats the sidebar icon for this page, so the header identifies itself. */
  icon?: LucideIcon
  tone?: SellerTone
}

export function SellerPageHeader({
  title,
  description,
  action,
  icon: Icon,
  tone = 'violet',
}: SellerPageHeaderProps) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3.5">
        {Icon ? (
          <span
            className={cn(
              'mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl',
              sellerToneClass[tone].icon,
            )}
          >
            <Icon className="size-5" />
          </span>
        ) : null}
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Seller portal
          </p>
          <h1 className="font-display text-3xl tracking-tight">{title}</h1>
          {description ? (
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
