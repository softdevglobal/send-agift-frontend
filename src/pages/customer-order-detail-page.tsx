import { ArrowLeft } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  CustomerPageHeader,
  customerPanelClass,
  formatMoney,
  getOrder,
} from '@/features/customer-commerce'
import { cn } from '@/lib/utils'

function paymentCopy(method: string, status: string) {
  if (status === 'pay_on_delivery') {
    return 'Pay on delivery — no demo charge was recorded.'
  }
  if (method === 'wallet') {
    return 'Demo digital wallet — marked paid locally. No provider was charged.'
  }
  return 'Demo card — marked paid locally. No card details were collected.'
}

export function CustomerOrderDetailPage() {
  const { orderId } = useParams()
  const order = orderId ? getOrder(orderId) : null

  if (!order) {
    return <Navigate to="/customer/orders" replace />
  }

  const address = [
    order.recipient.line1,
    order.recipient.line2,
    order.recipient.city,
    order.recipient.region,
    order.recipient.postalCode,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <div>
      <CustomerPageHeader
        title={order.id}
        description={`Placed ${new Date(order.createdAt).toLocaleString()}`}
        action={
          <Button asChild variant="outline" className="h-10 rounded-full px-4">
            <Link to="/customer/orders">
              <ArrowLeft className="size-4" />
              All orders
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,1fr)]">
        <section className={cn(customerPanelClass, 'p-5 sm:p-6')}>
          <h2 className="font-medium">Items</h2>
          <ul className="mt-4 space-y-4">
            {order.items.map((item) => (
              <li key={`${item.productId}-${item.name}`} className="flex gap-3">
                <Link
                  to={`/customer/gifts/${item.productId}`}
                  className="size-16 shrink-0 overflow-hidden rounded-xl bg-muted"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="size-full object-cover"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/customer/gifts/${item.productId}`}
                    className="font-medium hover:text-primary"
                  >
                    {item.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    Qty {item.quantity} · {formatMoney(item.price)}
                  </p>
                </div>
                <p className="text-sm font-medium">
                  {formatMoney(item.price * item.quantity)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-6">
          <section className={cn(customerPanelClass, 'p-5')}>
            <h2 className="font-medium">Status</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Delivery</dt>
                <dd className="capitalize">{order.status}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Payment</dt>
                <dd className="capitalize">
                  {order.paymentStatus.replaceAll('_', ' ')}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Total</dt>
                <dd>{formatMoney(order.total)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {paymentCopy(order.paymentMethod, order.paymentStatus)}
            </p>
          </section>

          <section className={cn(customerPanelClass, 'p-5')}>
            <h2 className="font-medium">Deliver to</h2>
            <p className="mt-3 text-sm font-medium">{order.recipient.name}</p>
            <p className="text-sm text-muted-foreground">{address}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {order.recipient.email}
              {order.recipient.phone ? ` · ${order.recipient.phone}` : ''}
            </p>
            {order.recipient.note ? (
              <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-sm">
                {order.recipient.note}
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  )
}
