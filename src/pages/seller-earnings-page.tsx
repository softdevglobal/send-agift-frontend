import {
  ArrowDownToLine,
  Clock,
  Coins,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { SellerPageHeader, SellerStat, sellerPanelClass } from '@/features/seller'
import type { SellerTone } from '@/features/seller'

const snapshots: {
  label: string
  value: string
  hint: string
  icon: LucideIcon
  tone: SellerTone
}[] = [
  {
    label: 'Available funds',
    value: '$0.00',
    hint: 'Ready to withdraw',
    icon: Coins,
    tone: 'teal',
  },
  {
    label: 'This month',
    value: '$0.00',
    hint: 'Earned so far',
    icon: TrendingUp,
    tone: 'violet',
  },
  {
    label: 'Pending clearance',
    value: '$0.00',
    hint: 'Clears after delivery',
    icon: Clock,
    tone: 'amber',
  },
  {
    label: 'Withdrawn',
    value: '$0.00',
    hint: 'All-time payouts',
    icon: ArrowDownToLine,
    tone: 'navy',
  },
]

export function SellerEarningsPage() {
  return (
    <div className="space-y-6">
      <SellerPageHeader
        icon={Wallet}
        tone="amber"
        title="Earnings"
        description="Balance, pending clearance, and payout history for completed orders."
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {snapshots.map((item) => (
          <SellerStat
            key={item.label}
            icon={item.icon}
            label={item.label}
            value={item.value}
            hint={item.hint}
            tone={item.tone}
          />
        ))}
      </section>

      <section className={sellerPanelClass}>
        <div className="flex items-center gap-2 border-b border-border/50 px-5 py-4">
          <span className="flex size-6 items-center justify-center rounded-md bg-accent text-primary">
            <Wallet className="size-3.5" />
          </span>
          <h2 className="font-medium">Payout activity</h2>
        </div>
        <div className="relative overflow-hidden px-6 py-16 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(ellipse_at_top,oklch(0.96_0.05_85/0.6),transparent_70%)]"
          />
          <div className="relative mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-card text-primary ring-1 ring-primary/15 shadow-[0_10px_28px_rgba(40,50,30,0.10)]">
            <ArrowDownToLine className="size-5" />
          </div>
          <p className="relative text-sm font-medium">No payouts yet</p>
          <p className="relative mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Earnings from completed gift orders land here, then clear for withdrawal
            once the buyer has received their gift.
          </p>
        </div>
      </section>
    </div>
  )
}
