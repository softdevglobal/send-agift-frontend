import { BarChart3 } from 'lucide-react'

import { SellerEmptyState, SellerPageHeader } from '@/features/seller'

export function SellerAnalyticsPage() {
  return (
    <div>
      <SellerPageHeader
        title="Analytics"
        description="Impressions, shop visits, and conversion once your gifts start selling."
      />
      <SellerEmptyState
        icon={BarChart3}
        title="Not enough data yet"
        description="Analytics unlock after your shops receive visits and orders. Keep your profile complete and shops active so buyers can find you."
      />
    </div>
  )
}
