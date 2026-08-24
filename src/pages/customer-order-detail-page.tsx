import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, LoaderCircle } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { getRecipient, type RecipientDetails } from '@/api/customers'
import { cancelOrder, getOrder, type OrderDetails } from '@/api/orders'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import {
  CustomerPageHeader,
  customerPanelClass,
  getCatalogProduct,
} from '@/features/customer-commerce'
import {
  canCancelOrder,
  formatDeliveryDate,
  formatOrderDate,
  fulfilmentStatusLabel,
  orderStatusLabel,
} from '@/features/customer-commerce/order-display'
import { getErrorMessage } from '@/lib/api'
import { formatPriceAmount } from '@/lib/money'
import { cn } from '@/lib/utils'

export function CustomerOrderDetailPage() {
  const { orderId } = useParams()
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [recipient, setRecipient] = useState<RecipientDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!orderId) return
    const details = await getOrder(orderId)
    setOrder(details)
    if (details.recipient_id) {
      setRecipient(await getRecipient(details.recipient_id).catch(() => null))
    } else {
      setRecipient(null)
    }
  }, [orderId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    load()
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load this order.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [load])

  async function handleCancel() {
    if (!orderId) return
    setError(null)
    setCancelling(true)
    try {
      setOrder(await cancelOrder(orderId))
    } catch (err) {
      setError(getErrorMessage(err, 'Could not cancel this order.'))
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!order) {
    return (
      <div>
        <CustomerPageHeader title="Order" description="This order could not be loaded." />
        <FormAlert error={error ?? 'Order not found.'} className="mb-5" />
        <Button asChild variant="outline" className="h-10 rounded-full px-4">
          <Link to="/account/orders">
            <ArrowLeft className="size-4" />
            All orders
          </Link>
        </Button>
      </div>
    )
  }

  const recipientAddress = recipient?.addresses?.find((address) => address.is_default) ??
    recipient?.addresses?.[0] ??
    null

  return (
    <div>
      <CustomerPageHeader
        title={order.order_number}
        description={`Placed ${formatOrderDate(order.created_at)}`}
        action={
          <Button asChild variant="outline" className="h-10 rounded-full px-4">
            <Link to="/account/orders">
              <ArrowLeft className="size-4" />
              All orders
            </Link>
          </Button>
        }
      />

      <FormAlert error={error} className="mb-5" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,1fr)]">
        <section className={cn(customerPanelClass, 'p-5 sm:p-6')}>
          <h2 className="font-medium">Items</h2>
          <ul className="mt-4 space-y-4">
            {order.items.map((item) => {
              const product = getCatalogProduct(item.product_id)
              return (
                <li key={item.id} className="flex gap-3">
                  <Link
                    to={`/products/${item.product_id}`}
                    className="size-16 shrink-0 overflow-hidden rounded-xl bg-muted"
                  >
                    {product?.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="size-full object-cover"
                      />
                    ) : null}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/products/${item.product_id}`}
                      className="font-medium hover:text-primary"
                    >
                      {product?.name ?? 'Product'}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      Qty {item.quantity} ·{' '}
                      {formatPriceAmount(item.unit_amount, order.currency)} ·{' '}
                      {fulfilmentStatusLabel(item.fulfilment_status)}
                    </p>
                  </div>
                  <p className="text-sm font-medium">
                    {formatPriceAmount(item.total_amount, order.currency)}
                  </p>
                </li>
              )
            })}
          </ul>
        </section>

        <div className="space-y-6">
          <section className={cn(customerPanelClass, 'p-5')}>
            <h2 className="font-medium">Summary</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Status</dt>
                <dd>{orderStatusLabel(order.status)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Delivery date</dt>
                <dd>{formatDeliveryDate(order.delivery_date)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{formatPriceAmount(order.subtotal_amount, order.currency)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Delivery</dt>
                <dd>
                  {order.delivery_amount === 0
                    ? 'Free'
                    : formatPriceAmount(order.delivery_amount, order.currency)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-border/60 pt-2 font-medium">
                <dt>Total</dt>
                <dd>{formatPriceAmount(order.total_amount, order.currency)}</dd>
              </div>
            </dl>

            {canCancelOrder(order.status) ? (
              <Button
                type="button"
                variant="outline"
                disabled={cancelling}
                onClick={handleCancel}
                className="mt-4 h-10 w-full rounded-full"
              >
                {cancelling ? (
                  <>
                    <LoaderCircle className="animate-spin" />
                    Cancelling…
                  </>
                ) : (
                  'Cancel order'
                )}
              </Button>
            ) : null}
          </section>

          <section className={cn(customerPanelClass, 'p-5')}>
            <h2 className="font-medium">Deliver to</h2>
            {recipient ? (
              <>
                <p className="mt-3 text-sm font-medium">{recipient.name}</p>
                {recipientAddress ? (
                  <p className="text-sm text-muted-foreground">
                    {[
                      recipientAddress.line1,
                      recipientAddress.line2,
                      recipientAddress.city,
                      recipientAddress.region,
                      recipientAddress.postal_code,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                ) : null}
                {recipient.email || recipient.phone ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {[recipient.email, recipient.phone].filter(Boolean).join(' · ')}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Sent to your own account address.
              </p>
            )}
            {order.gift_message ? (
              <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-sm">
                {order.gift_message}
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  )
}
