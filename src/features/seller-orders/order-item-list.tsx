import { ChevronRight, Package } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import type { SellerOrderItemSummary } from '@/api/seller-orders'
import { formatDeliveryDate } from '@/features/customer-commerce/order-display'
import { OrderStatusBadge } from '@/features/customer-commerce/order-tracking'
import { sellerPanelClass } from '@/features/seller'
import { formatPriceAmount } from '@/lib/money'
import { cn } from '@/lib/utils'

import { FulfilmentStatusBadge } from './fulfilment-status-badge'

export function SellerOrderItemList({ items }: { items: SellerOrderItemSummary[] }) {
  const navigate = useNavigate()

  return (
    <section className={cn(sellerPanelClass, 'overflow-hidden')}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[52rem] text-left text-sm">
          <thead>
            <tr className="border-b border-border/50 text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Recipient</th>
              <th className="px-4 py-3 font-medium">Qty</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Fulfilment</th>
              <th className="px-4 py-3 font-medium">Order status</th>
              <th className="px-4 py-3 font-medium">Delivery</th>
              <th className="px-4 py-3 font-medium">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {items.map((item) => (
              <tr
                key={item.id}
                tabIndex={0}
                className="cursor-pointer transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
                onClick={() => navigate(`/seller/order-items/${item.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    navigate(`/seller/order-items/${item.id}`)
                  }
                }}
              >
                <td className="px-4 py-3 align-middle font-medium">{item.order_number}</td>
                <td className="px-4 py-3 align-middle">
                  <div className="flex items-center gap-3">
                    <span className="size-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {item.product_image_url ? (
                        <img
                          src={item.product_image_url}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <span className="flex size-full items-center justify-center text-muted-foreground">
                          <Package className="size-4" />
                        </span>
                      )}
                    </span>
                    <span className="truncate font-medium">{item.product_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 align-middle text-muted-foreground">
                  {item.recipient_name || '—'}
                </td>
                <td className="px-4 py-3 align-middle">{item.quantity}</td>
                <td className="px-4 py-3 align-middle font-medium">
                  {formatPriceAmount(item.total_amount, 'USD')}
                </td>
                <td className="px-4 py-3 align-middle">
                  <FulfilmentStatusBadge status={item.fulfilment_status} />
                </td>
                <td className="px-4 py-3 align-middle">
                  <OrderStatusBadge status={item.order_status} />
                </td>
                <td className="px-4 py-3 align-middle text-muted-foreground">
                  {formatDeliveryDate(item.delivery_date)}
                </td>
                <td className="px-4 py-3 align-middle">
                  <ChevronRight className="ml-auto size-4 text-muted-foreground" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
