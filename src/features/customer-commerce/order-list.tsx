import { ChevronRight, Gift } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PageNav, TABLE_PAGE_SIZE, usePagedList } from '@/components/common/page-nav'

import type { Order } from '@/api/orders'
import {
  formatDeliveryDate,
  formatOrderDate,
  isFreeGiftOrder,
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
  const paged = usePagedList(orders, TABLE_PAGE_SIZE)

  return (
    <section className={customerPanelClass}>
      <ul className="divide-y divide-brand-ink/10">
        {paged.visible.map((order) => (
          <li key={order.id}>
            <Link
              to={`/orders/${order.id}`}
              className={cn(
                customerListRowClass,
                'flex-col items-stretch rounded-none border-0 bg-transparent hover:bg-accent/50',
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-extrabold tracking-tight">
                    {order.order_number}
                    {isFreeGiftOrder(order) ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-brand-teal px-2 py-0.5 text-[10px] font-bold tracking-[0.1em] text-brand-ink uppercase">
                        <Gift className="size-3" />
                        Free gift
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    Placed {formatOrderDate(order.created_at)} · Delivers{' '}
                    {formatDeliveryDate(order.delivery_date)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-right">
                  <div>
                    <p className="text-base font-extrabold tracking-tight">
                      {isFreeGiftOrder(order)
                        ? 'Free'
                        : formatPriceAmount(order.total_amount, order.currency)}
                    </p>
                    <div className="mt-1 flex justify-end">
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </div>
                  <ChevronRight className="mt-1 size-4 text-muted-foreground" />
                </div>
              </div>
              {variant === 'track' ? (
                <OrderTrackingProgressBar
                  status={order.status}
                  kind={order.order_kind}
                  className="mt-3"
                />
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
      <div className="px-4 pb-4">
        <PageNav
          page={paged.page}
          pageCount={paged.pageCount}
          onPage={paged.setPage}
          label="Order pages"
        />
      </div>
    </section>
  )
}
