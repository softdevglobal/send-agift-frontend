import { BarChart3, Eye, MousePointerClick, Send, Store } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { SellerEmptyState, SellerPageHeader, SellerStat } from '@/features/seller'
import type { SellerTone } from '@/features/seller'

const placeholders: {
  label: string
  icon: LucideIcon
  tone: SellerTone
  hint: string
}[] = [
  { label: 'Impressions', icon: Eye, tone: 'violet', hint: 'Reels + gift cards seen' },
  { label: 'Shop visits', icon: Store, tone: 'teal', hint: 'Storefront opens' },
  {
    label: 'Add to cart',
    icon: MousePointerClick,
    tone: 'amber',
    hint: 'Gifts added by buyers',
  },
  { label: 'Sent as gifts', icon: Send, tone: 'navy', hint: 'Completed checkouts' },
]

export function SellerAnalyticsPage() {
  return (
    <div className="space-y-6">
      <SellerPageHeader
        icon={BarChart3}
        tone="navy"
        title="Analytics"
        description="Impressions, shop visits, and conversion once your gifts start selling."
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {placeholders.map((item) => (
          <SellerStat
            key={item.label}
            icon={item.icon}
            label={item.label}
            value="—"
            hint={item.hint}
            tone={item.tone}
          />
        ))}
      </section>

      <SellerEmptyState
        icon={BarChart3}
        title="Not enough data yet"
        description="These numbers fill in once your shops get visits and orders. Keep your profile complete and shops active so buyers can find you."
      />
    </div>
  )
}
