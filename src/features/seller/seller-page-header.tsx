import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { type SellerTone } from '@/features/seller/seller-styles'
import { cn } from '@/lib/utils'

type SellerPageHeaderProps = {
  title: string
  description?: string
  action?: ReactNode
  /** Repeats the sidebar icon for this page, so the header identifies itself. */
  icon?: LucideIcon
  tone?: SellerTone
  /**
   * Extra content along the bottom of the card — a filter row, a stat strip,
   * a tab bar. Sits under a hairline, inside the same panel.
   */
  children?: ReactNode
}

/** A tone-coloured glow behind each dark header, so the pages still read apart. */
const toneGlow: Record<SellerTone, string> = {
  violet: 'bg-[var(--brand-violet)]/40',
  teal: 'bg-[var(--brand-teal)]/35',
  amber: 'bg-[oklch(0.8_0.14_75)]/35',
  navy: 'bg-[oklch(0.55_0.16_265)]/40',
}

/**
 * The banner every seller page opens with: a dark card carrying the page's
 * icon, name and one-line purpose, with room for the page's primary action and
 * an optional strip of controls beneath.
 *
 * Dark on purpose — it echoes the sidebar and the dashboard hero, so each page
 * announces itself the way the portal's chrome does rather than floating as
 * bare text on the page background.
 */
export function SellerPageHeader({
  title,
  description,
  action,
  icon: Icon,
  tone = 'violet',
  children,
}: SellerPageHeaderProps) {
  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-navy via-brand-ink to-brand-navy text-white shadow-[0_16px_44px_rgba(20,20,55,0.28)] ring-1 ring-white/10">
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -top-20 -right-16 size-64 rounded-full blur-3xl',
          toneGlow[tone],
        )}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 left-8 size-48 rounded-full bg-white/5 blur-2xl"
      />

      <div className="relative flex flex-wrap items-start justify-between gap-4 px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex items-start gap-4">
          {Icon ? (
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-white shadow-sm ring-1 ring-white/15 backdrop-blur-sm">
              <Icon className="size-5.5" />
            </span>
          ) : null}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-white/45 uppercase">
              Seller portal
            </p>
            <h1 className="font-display text-2xl tracking-tight sm:text-3xl">
              {title}
            </h1>
            {description ? (
              <p className="max-w-xl text-sm leading-relaxed text-white/65">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      {children ? (
        <div className="relative border-t border-white/10 bg-white/5 px-5 py-3.5 backdrop-blur-sm sm:px-7">
          {children}
        </div>
      ) : null}
    </div>
  )
}
