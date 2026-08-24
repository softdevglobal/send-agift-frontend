import { useEffect, useState } from 'react'
import { LoaderCircle, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'

import { listOrders, type Order } from '@/api/orders'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import {
  CustomerEmptyState,
  CustomerPageHeader,
  customerListRowClass,
  customerPanelClass,
} from '@/features/customer-commerce'
import {
  formatDeliveryDate,
  formatOrderDate,
  orderStatusLabel,
} from '@/features/customer-commerce/order-display'
import { getErrorMessage } from '@/lib/api'
import { formatPriceAmount } from '@/lib/money'
import { cn } from '@/lib/utils'

export function CustomerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listOrders()
      .then((list) => {
        if (!cancelled) setOrders(Array.isArray(list) ? list : [])
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load your orders.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div>
      <CustomerPageHeader
        title="Orders"
        description="Every gift you have ordered, with its delivery date and current status."
      />

      <FormAlert error={error} className="mb-5" />

      {loading ? (
        <div className="flex justify-center py-16">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : orders.length ? (
        <section className={customerPanelClass}>
          <ul className="divide-y divide-border/50">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  to={`/account/orders/${order.id}`}
                  className={cn(
                    customerListRowClass,
                    'rounded-none border-0 hover:bg-muted/50',
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-medium">{order.order_number}</p>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      Placed {formatOrderDate(order.created_at)} · Delivers{' '}
                      {formatDeliveryDate(order.delivery_date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {formatPriceAmount(order.total_amount, order.currency)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {orderStatusLabel(order.status)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <CustomerEmptyState
          icon={ShoppingBag}
          title="No orders yet"
          description="When you complete a checkout, the order will show up here with its delivery date and status."
          action={
            <Button asChild className="h-10 rounded-full px-4">
              <Link to="/products">Discover gifts</Link>
            </Button>
          }
        />
      )}
    </div>
  )
}
