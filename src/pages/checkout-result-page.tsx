import { useEffect, useState } from 'react'
import { CheckCircle2, LoaderCircle } from 'lucide-react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'

import { getOrder, type OrderDetails } from '@/api/orders'
import { Button } from '@/components/ui/button'
import { CustomerPageHeader, customerPanelClass } from '@/features/customer-commerce'
import {
  formatDeliveryDate,
  orderStatusLabel,
} from '@/features/customer-commerce/order-display'
import { formatPriceAmount } from '@/lib/money'
import { cn } from '@/lib/utils'

export function CheckoutResultPage() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    if (!orderId) {
      setLoading(false)
      return
    }
    getOrder(orderId)
      .then((details) => {
        if (!cancelled) setOrder(details)
      })
      .catch(() => {
        if (!cancelled) setOrder(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [orderId])

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!order) {
    return <Navigate to="/account/orders" replace />
  }

  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div>
      <CustomerPageHeader
        title="Order placed"
        description="Your order is with the seller. You can track it from your order history."
      />

      <section className={cn(customerPanelClass, 'relative overflow-hidden p-6 sm:p-8')}>
        <div className="flex size-12 items-center justify-center rounded-2xl bg-accent text-primary">
          <CheckCircle2 className="size-6" />
        </div>
        <h2 className="mt-4 font-display text-2xl tracking-tight">
          {orderStatusLabel(order.status)}
        </h2>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
          Order{' '}
          <span className="font-medium text-foreground">{order.order_number}</span> is
          set to deliver on {formatDeliveryDate(order.delivery_date)}.
        </p>
        <p className="mt-4 text-sm">
          Total {formatPriceAmount(order.total_amount, order.currency)} · {itemCount} item
          {itemCount === 1 ? '' : 's'}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild className="h-10 rounded-full px-4">
            <Link to={`/account/orders/${order.id}`}>View order</Link>
          </Button>
          <Button asChild variant="outline" className="h-10 rounded-full px-4">
            <Link to="/products">Keep shopping</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
