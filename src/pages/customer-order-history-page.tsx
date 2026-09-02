import { History, LoaderCircle, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'

import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import {
  CustomerEmptyState,
  CustomerPageHeader,
} from '@/features/customer-commerce'
import { CustomerOrderList } from '@/features/customer-commerce/order-list'
import { isHistoryOrderStatus } from '@/features/customer-commerce/order-display'
import { useCustomerOrders } from '@/features/customer-commerce/use-customer-orders'

export function CustomerOrderHistoryPage() {
  const { orders, loading, error } = useCustomerOrders()
  const history = orders.filter((order) => isHistoryOrderStatus(order.status))
  const hasActive = orders.some((order) => !isHistoryOrderStatus(order.status))

  return (
    <div>
      <CustomerPageHeader
        title="Order history"
        description="Delivered, cancelled, and refunded gifts you have ordered."
      />

      <FormAlert error={error} className="mb-5" />

      {loading ? (
        <div className="flex justify-center py-16">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : history.length ? (
        <CustomerOrderList orders={history} variant="history" />
      ) : (
        <CustomerEmptyState
          icon={hasActive ? History : ShoppingBag}
          title={hasActive ? 'No completed orders yet' : 'No orders yet'}
          description={
            hasActive
              ? 'Gifts still in progress appear under Track orders. Completed deliveries will land here.'
              : 'When a gift is delivered, cancelled, or refunded, it will show up here.'
          }
          action={
            hasActive ? (
              <Button asChild className="h-10 rounded-full px-4">
                <Link to="/orders">Track orders</Link>
              </Button>
            ) : (
              <Button asChild className="h-10 rounded-full px-4">
                <Link to="/products">Discover gifts</Link>
              </Button>
            )
          }
        />
      )}
    </div>
  )
}
