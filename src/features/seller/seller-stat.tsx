import type { LucideIcon } from 'lucide-react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import {
  sellerCardClass,
  sellerPanelClass,
  sellerToneClass,
  type SellerTone,
} from '@/features/seller/seller-styles'
import { cn } from '@/lib/utils'

type SellerStatProps = {
  icon: LucideIcon
  label: string
  value: string
  hint?: string
  tone: SellerTone
  /** Turns the whole tile into a link to the page the number comes from. */
  to?: string
}

/**
 * One figure from the portal, as a tone-washed tile.
 *
 * Shared so Earnings, Analytics and the dashboard read as one system — four
 * identical white boxes made a stat row look like decoration.
 */
export function SellerStat({ icon: Icon, label, value, hint, tone, to }: SellerStatProps) {
  const styles = sellerToneClass[tone]
  const body = (
    <>
      <div
        className={cn(
          'mb-4 flex size-10 items-center justify-center rounded-xl',
          styles.icon,
        )}
      >
        <Icon className="size-4.5" />
      </div>
      <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 truncate font-display text-2xl tracking-tight">{value}</p>
      {hint ? (
        <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>
      ) : null}
      {to ? (
        <ArrowRight className="absolute top-5 right-5 size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      ) : null}
    </>
  )

  const className = cn(
    to ? sellerCardClass : sellerPanelClass,
    styles.tile,
    'group relative block p-4 sm:p-5',
  )

  return to ? (
    <Link to={to} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  )
}
