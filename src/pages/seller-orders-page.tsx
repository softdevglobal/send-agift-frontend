import { ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { SellerEmptyState, SellerPageHeader } from '@/features/seller'

export function SellerOrdersPage() {
  return (
    <div>
      <SellerPageHeader
        title="Orders"
        description="Track active, completed, and cancelled gift orders from buyers."
      />
      <SellerEmptyState
        icon={ShoppingBag}
        title="No orders yet"
        description="When a buyer purchases from one of your shops, the order will show up here with delivery status and due dates."
        action={
          <Button asChild className="h-10 rounded-full px-4">
            <Link to="/seller/shops">Set up a shop</Link>
          </Button>
        }
      />
    </div>
  )
}
