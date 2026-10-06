import { ChevronRight } from 'lucide-react'

import { PageNav, TABLE_PAGE_SIZE, usePagedList } from '@/components/common/page-nav'

import type { SellerOrderItemSummary } from '@/api/seller-orders'
import { formatDeliveryDate } from '@/features/customer-commerce/order-display'
import { OrderStatusBadge } from '@/features/customer-commerce/order-tracking'
import { sellerPanelClass } from '@/features/seller'
import { formatPriceAmount } from '@/lib/money'
import { cn } from '@/lib/utils'

import { FulfilmentStatusBadge } from './fulfilment-status-badge'

/**
 * One row per shop parcel: an order's products from the same shop ship
 * together, and a seller with two shops on one order has two parcels.
 */
type SellerParcelGroup = {
  key: string
  orderNumber: string
  shopName: string
  recipientName: string
  orderStatus: SellerOrderItemSummary['order_status']
  deliveryDate: string
  items: SellerOrderItemSummary[]
}

function groupSellerParcels(items: SellerOrderItemSummary[]): SellerParcelGroup[] {
  const groups: SellerParcelGroup[] = []
  const index = new Map<string, SellerParcelGroup>()
  for (const item of items) {
    const key = `${item.order_id}:${item.shop_id}`
    let group = index.get(key)
    if (!group) {
      group = {
        key,
        orderNumber: item.order_number,
        shopName: item.shop_name || '',
        recipientName: item.recipient_name || '',
        orderStatus: item.order_status,
        deliveryDate: item.delivery_date,
        items: [],
      }
      index.set(key, group)
      groups.push(group)
    }
    group.items.push(item)
  }
  return groups
}

export function SellerOrderItemList({
  items,
  activeItemId = null,
  onOpen,
}: {
  items: SellerOrderItemSummary[]
  /** The row whose detail panel is open, kept marked behind the panel. */
  activeItemId?: string | null
  onOpen: (itemId: string) => void
}) {
  const orders = groupSellerParcels(items)
  const paged = usePagedList(orders, TABLE_PAGE_SIZE)

  return (
    <section className={cn(sellerPanelClass, 'overflow-hidden')}>
      {/* Phones get one card per parcel: a seven-column table would scroll
          sideways and hide half its columns. */}
      <ul className="divide-y divide-brand-ink/10 md:hidden">
        {paged.visible.map((order) => {
          const active = order.items.some((item) => item.id === activeItemId)
          const openId =
            order.items.find((item) => item.id === activeItemId)?.id ?? order.items[0].id
          const total = order.items.reduce((sum, item) => sum + item.total_amount, 0)
          const statuses = new Set(order.items.map((item) => item.fulfilment_status))
          const sharedStatus = statuses.size === 1 ? order.items[0].fulfilment_status : null
          return (
            <li key={order.key}>
              <button
                type="button"
                onClick={() => onOpen(openId)}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'flex w-full flex-col gap-3 px-4 py-4 text-left transition-colors',
                  active ? 'bg-accent' : 'active:bg-accent/60',
                )}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate font-extrabold tracking-tight">
                      {order.orderNumber}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {[order.shopName, order.recipientName && `for ${order.recipientName}`]
                        .filter(Boolean)
                        .join(' · ') || '-'}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-poster text-lg">
                      {formatPriceAmount(total, 'USD')}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {order.items.length} product{order.items.length === 1 ? '' : 's'}
                    </span>
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-1.5">
                  {sharedStatus ? (
                    <FulfilmentStatusBadge status={sharedStatus} />
                  ) : (
                    <span className="rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold tracking-[0.08em] text-brand-ink uppercase">
                      Mixed
                    </span>
                  )}
                  <OrderStatusBadge status={order.orderStatus} />
                  <span className="ml-auto text-[11px] font-bold tracking-[0.06em] text-brand-violet uppercase">
                    Deliver {formatDeliveryDate(order.deliveryDate)}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[52rem] text-left text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-surface/50 text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Shop</th>
              <th className="px-4 py-3 font-medium">Recipient</th>
              <th className="px-4 py-3 font-medium">Products</th>
              <th className="px-4 py-3 font-medium">Fulfilment</th>
              <th className="px-4 py-3 font-medium">Order status</th>
              <th className="px-4 py-3 font-medium">Delivery</th>
              <th className="px-4 py-3 font-medium">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {paged.visible.map((order) => {
              const active = order.items.some((item) => item.id === activeItemId)
              const openId =
                order.items.find((item) => item.id === activeItemId)?.id ??
                order.items[0].id
              const total = order.items.reduce((sum, item) => sum + item.total_amount, 0)
              const statuses = new Set(order.items.map((item) => item.fulfilment_status))
              const sharedStatus =
                statuses.size === 1 ? order.items[0].fulfilment_status : null
              return (
                <tr
                  key={order.key}
                  tabIndex={0}
                  aria-current={active ? 'true' : undefined}
                  className={cn(
                    'cursor-pointer transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none',
                    active && 'bg-accent/60 hover:bg-accent/60',
                  )}
                  onClick={() => onOpen(openId)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onOpen(openId)
                    }
                  }}
                >
                  <td className="px-4 py-3 align-middle font-medium">
                    {order.orderNumber}
                  </td>
                  <td className="px-4 py-3 align-middle">{order.shopName || '-'}</td>
                  <td className="px-4 py-3 align-middle text-muted-foreground">
                    {order.recipientName || '-'}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <span className="font-medium">{formatPriceAmount(total, 'USD')}</span>
                    <span className="block text-xs text-muted-foreground">
                      {order.items.length} product{order.items.length === 1 ? '' : 's'}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    {sharedStatus ? (
                      <FulfilmentStatusBadge status={sharedStatus} />
                    ) : (
                      <span className="text-xs text-muted-foreground">Mixed</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <OrderStatusBadge status={order.orderStatus} />
                  </td>
                  <td className="px-4 py-3 align-middle text-muted-foreground">
                    {formatDeliveryDate(order.deliveryDate)}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <ChevronRight
                      className={cn(
                        'ml-auto size-4 transition-transform',
                        active ? 'text-primary' : 'text-muted-foreground',
                      )}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
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
