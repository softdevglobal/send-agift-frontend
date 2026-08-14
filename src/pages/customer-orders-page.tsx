import { ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  CustomerEmptyState,
  CustomerPageHeader,
  customerListRowClass,
  customerPanelClass,
  formatMoney,
  readOrders,
} from '@/features/customer-commerce'
import { cn } from '@/lib/utils'

function paymentLabel(method: string, status: string) {
  if (status === 'pay_on_delivery') return 'Pay on delivery'
  if (method === 'wallet') return 'Demo wallet · Paid'
  return 'Demo card · Paid'
}

function statusLabel(status: string) {
  if (status === 'shipped') return 'Shipped'
  if (status === 'delivered') return 'Delivered'
  return 'Processing'
}

export function CustomerOrdersPage() {
  const orders = readOrders()

  return (
    <div>
      <CustomerPageHeader
        title="Orders"
        description="Demo orders saved on this device, with payment and delivery status."
      />

      {orders.length ? (
        <section className={customerPanelClass}>
          <ul className="divide-y divide-border/50">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  to={`/customer/orders/${order.id}`}
                  className={cn(
                    customerListRowClass,
                    'rounded-none border-0 hover:bg-muted/50',
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-medium">{order.id}</p>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleString()} ·{' '}
                      {order.items.length} item
                      {order.items.length === 1 ? '' : 's'} ·{' '}
                      {paymentLabel(order.paymentMethod, order.paymentStatus)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatMoney(order.total)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {statusLabel(order.status)}
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
          description="When you complete a demo checkout, the order will show up here with payment and delivery status."
          action={
            <Button asChild className="h-10 rounded-full px-4">
              <Link to="/customer">Discover gifts</Link>
            </Button>
          }
        />
      )}
    </div>
  )
}
