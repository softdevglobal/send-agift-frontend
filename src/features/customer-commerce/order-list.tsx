import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { Order } from '@/api/orders'
import {
  formatDeliveryDate,
  formatOrderDate,
} from '@/features/customer-commerce/order-display'
import {
  OrderStatusBadge,
  OrderTrackingProgressBar,
} from '@/features/customer-commerce/order-tracking'
import { formatPriceAmount } from '@/lib/money'
import { cn } from '@/lib/utils'

import { customerListRowClass, customerPanelClass } from './customer-styles'

export function CustomerOrderList({
  orders,
  variant,
}: {
  orders: Order[]
  variant: 'track' | 'history'
}) {
  return (
    <section className={customerPanelClass}>
      <ul className="divide-y divide-border/50">
        {orders.map((order) => (
          <li key={order.id}>
            <Link
              to={`/orders/${order.id}`}
              className={cn(
                customerListRowClass,
                'flex-col items-stretch rounded-none border-0 hover:bg-muted/50',
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium">{order.order_number}</p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    Placed {formatOrderDate(order.created_at)} · Delivers{' '}
                    {formatDeliveryDate(order.delivery_date)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-right">
                  <div>
                    <p className="text-sm font-medium">
                      {formatPriceAmount(order.total_amount, order.currency)}
                    </p>
                    <div className="mt-1 flex justify-end">
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </div>
                  <ChevronRight className="mt-1 size-4 text-muted-foreground" />
                </div>
              </div>
              {variant === 'track' ? (
                <OrderTrackingProgressBar status={order.status} className="mt-3" />
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
