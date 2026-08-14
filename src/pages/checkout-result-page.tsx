import { CheckCircle2 } from 'lucide-react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  CustomerPageHeader,
  customerPanelClass,
  formatMoney,
  getOrder,
} from '@/features/customer-commerce'
import { cn } from '@/lib/utils'

export function CheckoutResultPage() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')
  const order = orderId ? getOrder(orderId) : null

  if (!order) {
    return <Navigate to="/customer/orders" replace />
  }

  const paidOnDelivery = order.paymentStatus === 'pay_on_delivery'

  return (
    <div>
      <CustomerPageHeader
        title="Order confirmed"
        description="This was a demo checkout. No payment provider was charged."
      />

      <section className={cn(customerPanelClass, 'relative overflow-hidden p-6 sm:p-8')}>
        <div className="flex size-12 items-center justify-center rounded-2xl bg-accent text-primary">
          <CheckCircle2 className="size-6" />
        </div>
        <h2 className="mt-4 font-display text-2xl tracking-tight">
          {paidOnDelivery ? 'Order placed — pay on delivery' : 'Demo payment recorded'}
        </h2>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
          Order <span className="font-medium text-foreground">{order.id}</span> is
          processing. Delivery updates will appear in your order history on this
          device.
        </p>
        <p className="mt-4 text-sm">
          Total {formatMoney(order.total)} · {order.items.length} item
          {order.items.length === 1 ? '' : 's'}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild className="h-10 rounded-full px-4">
            <Link to={`/customer/orders/${order.id}`}>View order</Link>
          </Button>
          <Button asChild variant="outline" className="h-10 rounded-full px-4">
            <Link to="/customer">Keep shopping</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
