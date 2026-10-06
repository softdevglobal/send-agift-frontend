import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Dot, Sparkle } from '@/components/common/storefront-decor'

import { type SellerTone } from '@/features/seller/seller-styles'

type SellerPageHeaderProps = {
  title: string
  description?: string
  action?: ReactNode
  /** Repeats the sidebar icon for this page, so the header identifies itself. */
  icon?: LucideIcon
  tone?: SellerTone
  /**
   * Extra content along the bottom of the card. A filter row, a stat strip,
   * a tab bar. Sits under a hairline, inside the same panel.
   */
  children?: ReactNode
}

/**
 * The banner every seller page opens with: a dark card carrying the page's
 * icon, name and one-line purpose, with room for the page's primary action and
 * an optional strip of controls beneath.
 *
 * Dark on purpose. It echoes the sidebar and the dashboard hero, so each page
 * announces itself the way the portal's chrome does rather than floating as
 * bare text on the page background.
 */
export function SellerPageHeader({
  title,
  description,
  action,
  icon: Icon,
  children,
}: SellerPageHeaderProps) {
  return (
    <div className="relative mb-6 overflow-hidden rounded-xl bg-brand-ink text-white">
      <Sparkle className="absolute top-5 right-[30%] hidden size-6 text-brand-teal sm:block" />
      <Dot className="absolute right-[18%] bottom-6 hidden size-2.5 bg-white/40 sm:block" />

      <div className="relative flex flex-wrap items-start justify-between gap-4 px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex items-start gap-4">
          {Icon ? (
            <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-brand-teal text-brand-ink">
              <Icon className="size-5.5" />
            </span>
          ) : null}
          <div className="space-y-1.5">
            <p className="w-fit rounded-md bg-white px-2 py-0.5 text-[10px] font-bold tracking-[0.18em] text-brand-ink uppercase">
              Seller portal
            </p>
            <h1 className="font-poster text-3xl sm:text-4xl">
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
        <div className="relative border-t border-white/10 bg-white/5 px-5 py-3.5 sm:px-7">
          {children}
        </div>
      ) : null}
    </div>
  )
}
