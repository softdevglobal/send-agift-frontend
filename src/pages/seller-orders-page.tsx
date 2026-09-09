import { LoaderCircle, ShoppingBag } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { SellerEmptyState, SellerPageHeader } from '@/features/seller'
import {
  SellerOrderItemDetailPanel,
  SellerOrderItemList,
  useSellerOrderItems,
} from '@/features/seller-orders'

/**
 * The orders list, with the fulfilment detail as a panel over it.
 *
 * `/seller/orders/:orderItemId` is this same page with the panel open, so a
 * deep link still lands on one item while the seller who clicked a row keeps
 * the list — and their scroll position — behind it.
 */
export function SellerOrdersPage() {
  const { orderItemId } = useParams()
  const navigate = useNavigate()
  const { items, loading, error, refresh } = useSellerOrderItems()

  return (
    <div>
      <SellerPageHeader
        icon={ShoppingBag}
        tone="teal"
        title="Orders"
        description="Accept gift items, compare shipping rates, and buy labels for fulfilment."
      />

      <FormAlert error={error} className="mb-5" />

      {loading ? (
        <div className="flex justify-center py-16">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length ? (
        <SellerOrderItemList
          items={items}
          activeItemId={orderItemId ?? null}
          onOpen={(id) => navigate(`/seller/orders/${id}`)}
        />
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

      <SellerOrderItemDetailPanel
        orderItemId={orderItemId ?? null}
        onClose={() => navigate('/seller/orders')}
        onChanged={refresh}
      />
    </div>
  )
}
