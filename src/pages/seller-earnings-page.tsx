import { Wallet } from 'lucide-react'

import { SellerPageHeader, sellerPanelClass } from '@/features/seller'
import { cn } from '@/lib/utils'

const snapshots = [
  { label: 'Available funds', value: '$0.00' },
  { label: 'This month', value: '$0.00' },
  { label: 'Pending clearance', value: '$0.00' },
  { label: 'Withdrawn', value: '$0.00' },
]

export function SellerEarningsPage() {
  return (
    <div className="space-y-6">
      <SellerPageHeader
        title="Earnings"
        description="Balance, pending clearance, and payout history for completed orders."
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {snapshots.map((item) => (
          <div key={item.label} className={cn(sellerPanelClass, 'px-4 py-5')}>
            <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
              {item.label}
            </p>
            <p className="mt-2 font-display text-2xl tracking-tight">{item.value}</p>
          </div>
        ))}
      </section>

      <section className={sellerPanelClass}>
        <div className="flex items-center gap-2 border-b border-border/50 px-5 py-4">
          <Wallet className="size-4 text-muted-foreground" />
          <h2 className="font-medium">Payout activity</h2>
        </div>
        <p className="px-5 py-14 text-center text-sm text-muted-foreground">
          No payouts yet. Earnings from completed gift orders will appear here.
        </p>
      </section>
    </div>
  )
}
