import { LoaderCircle, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'

import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { SellerEmptyState, SellerPageHeader } from '@/features/seller'
import { SellerOrderItemList, useSellerOrderItems } from '@/features/seller-orders'

export function SellerOrdersPage() {
  const { items, loading, error } = useSellerOrderItems()

  return (
    <div>
      <SellerPageHeader
        title="Orders"
        description="Accept gift items, compare shipping rates, and buy labels for fulfilment."
      />

      <FormAlert error={error} className="mb-5" />

      {loading ? (
        <div className="flex justify-center py-16">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length ? (
        <SellerOrderItemList items={items} />
      ) : (
        <SellerEmptyState
          icon={ShoppingBag}
          title="No orders yet"
          description="When a buyer purchases from one of your shops, the order item will show up here so you can accept it and buy a shipping label."
          action={
            <Button asChild className="h-10 rounded-full px-4">
              <Link to="/seller/shops">Set up a shop</Link>
            </Button>
          }
        />
      )}
    </div>
  )
}
