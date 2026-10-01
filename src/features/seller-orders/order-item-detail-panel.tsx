import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bike,
  ExternalLink,
  Gift,
  LoaderCircle,
  MapPin,
  MessageSquare,
  Package,
  PackageCheck,
  Truck,
  User,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { listCountries, type Country } from '@/api/countries'
import {
  acceptSellerOrderItem,
  completeLocalDelivery,
  getSellerOrderItem,
  type SellerOrderItemDetails,
  type SellerOrderItemSummary,
  type Shipment,
} from '@/api/seller-orders'
import { getSellerMe, type SellerDetails } from '@/api/sellers'
import { FormAlert } from '@/components/common/form-alert'
import { Toast } from '@/components/common/toast'
import { Button } from '@/components/ui/button'
import {
  formatDeliveryDate,
  formatOrderDate,
} from '@/features/customer-commerce/order-display'
import { OrderStatusBadge } from '@/features/customer-commerce/order-tracking'
import {
  SellerSheet,
  SellerSheetFacts,
  SellerSheetRow,
  SellerSheetSection,
} from '@/features/seller'
import {
  canAcceptOrderItem,
  canGetShippingRates,
  formatShippingAddress,
  hasShippingAddress,
  isDispatchedOrderItem,
  isInternationalShipment,
  isLocalDeliveryTracking,
} from '@/features/seller-orders/order-item-display'
import { FulfilmentStatusBadge } from '@/features/seller-orders/fulfilment-status-badge'
import { LocalDeliveryDialog } from '@/features/seller-orders/local-delivery-dialog'
import { ApiError, getErrorMessage } from '@/lib/api'
import { formatPriceAmount } from '@/lib/money'

type OrderItemDetailPanelProps = {
  /** The item to show. `null` closes the panel. */
  orderItemId: string | null
  /** Every line on the seller list, so this order's products can be shown together. */
  orderItems?: SellerOrderItemSummary[]
  onClose: () => void
  /** Called after accept/label-buy so the list behind the panel restates itself. */
  onChanged?: () => void
}

/**
 * The fulfilment workspace for one order item, as a right-side panel over the
 * orders table.
 *
 * This was a full route. Sellers work an order list top to bottom, and going
 * out to a page and back lost their scroll position on every item — the panel
 * keeps the list in place behind it. The route still exists and deep links
 * still open this panel; the orders page owns the URL.
 */
export function SellerOrderItemDetailPanel({
  orderItemId,
  orderItems = [],
  onClose,
  onChanged,
}: OrderItemDetailPanelProps) {
  const [item, setItem] = useState<SellerOrderItemDetails | null>(null)
  const [seller, setSeller] = useState<SellerDetails | null>(null)
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [accepting, setAccepting] = useState(false)
  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [localDeliveryOpen, setLocalDeliveryOpen] = useState(false)
  const [completingLocal, setCompletingLocal] = useState(false)

  const load = useCallback(async () => {
    if (!orderItemId) return
    const [details, profile, countryList] = await Promise.all([
      getSellerOrderItem(orderItemId),
      getSellerMe().catch(() => null),
      listCountries().catch(() => [] as Country[]),
    ])
    setItem(details)
    setSeller(profile)
    setCountries(Array.isArray(countryList) ? countryList : [])
  }, [orderItemId])

  useEffect(() => {
    if (!orderItemId) {
      // Reset on close so reopening never flashes the previous item's data.
      setItem(null)
      setError(null)
      setNotice(null)
      setShipment(null)
      setLocalDeliveryOpen(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    load()
      .catch((err) => {
        if (!cancelled) {
          setItem(null)
          setError(getErrorMessage(err, 'Could not load this order item.'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [orderItemId, load])

  const detectedInternational = useMemo(() => {
    if (!item) return false
    return isInternationalShipment({ item, seller, countries })
  }, [item, seller, countries])

  const international = detectedInternational

  async function handleAccept() {
    if (!item) return
    const targets = orderItems
      .filter(
        (line) =>
          line.order_id === item.order_id &&
          line.shop_id === item.shop_id &&
          canAcceptOrderItem(line.fulfilment_status),
      )
      .map((line) => line.id)
    const ids = targets.length
      ? targets
      : canAcceptOrderItem(item.fulfilment_status)
        ? [item.id]
        : []
    if (!ids.length) return
    setError(null)
    setNotice(null)
    setAccepting(true)
    try {
      for (const id of ids) {
        await acceptSellerOrderItem(id)
      }
      await load()
      onChanged?.()
      setToast(
        ids.length > 1
          ? 'All products accepted. Deliver them together from this shop.'
          : 'Order item accepted. You can start shop delivery now.',
      )
    } catch (err) {
      setError(getErrorMessage(err, 'Could not accept this order item.'))
      if (err instanceof ApiError && (err.status === 409 || err.status === 404)) {
        await load().catch(() => undefined)
      }
    } finally {
      setAccepting(false)
    }
  }

  /** Confirms a personal delivery was handed over: item and order go delivered. */
  async function handleCompleteLocal() {
    if (!item) return
    setCompletingLocal(true)
    setError(null)
    try {
      const delivered = await completeLocalDelivery({
        orderId: item.order_id,
        shopId: item.shop_id,
      })
      setShipment(delivered)
      await load()
      onChanged?.()
      setToast('Marked as delivered.')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not mark this as delivered.'))
    } finally {
      setCompletingLocal(false)
    }
  }

  const currency = item?.order?.currency || 'USD'
  const product = item?.product
  const shopItems = item
    ? orderItems.filter(
        (line) => line.order_id === item.order_id && line.shop_id === item.shop_id,
      )
    : []
  const productsInShipment = shopItems.length > 1 ? shopItems : []
  const shopPendingCount = shopItems.filter((line) =>
    canAcceptOrderItem(line.fulfilment_status),
  ).length
  const parcelItemsTotal = shopItems.length
    ? shopItems.reduce((sum, line) => sum + line.total_amount, 0)
    : (item?.total_amount ?? 0)
  const shopDelivery = item?.shop_delivery ?? null
  // The order also holds products from other shops (this seller's or others').
  const orderHasOtherShops = Boolean(
    item?.order && item.order.subtotal_amount > parcelItemsTotal,
  )
  const recipient = item?.recipient
  const shippingAddress = item?.shipping_address
  const pending = item ? canAcceptOrderItem(item.fulfilment_status) : false
  const rateable = item ? canGetShippingRates(item.fulfilment_status) : false
  const dispatched = item ? isDispatchedOrderItem(item.fulfilment_status) : false
  const itemDelivered = item?.fulfilment_status === 'delivered'
  const cancelled = item?.fulfilment_status === 'cancelled'
  const localDelivery = item
    ? isLocalDeliveryTracking(item.tracking, shipment)
    : false
  const deliveryStatus = shipment?.status || item?.tracking?.status || ''
  const localDeliveryComplete =
    localDelivery &&
    (deliveryStatus === 'delivered' || itemDelivered)
  const showShipmentSection = dispatched || itemDelivered

  return (
    <>
      <SellerSheet
        open={orderItemId !== null}
        onOpenChange={(open) => !open && onClose()}
        size="lg"
        eyebrow="Order"
        title={item?.order?.order_number ?? (loading ? 'Loading…' : 'Order')}
        description={
          item ? `Placed ${formatOrderDate(item.created_at)}` : undefined
        }
        badge={
          item ? <FulfilmentStatusBadge status={item.fulfilment_status} /> : null
        }
        footer={
          item && (pending || shopPendingCount > 0 || rateable || (dispatched && localDelivery && !localDeliveryComplete)) ? (
            <div className="space-y-3">
              {pending || shopPendingCount > 0 ? (
                <Button
                  type="button"
                  disabled={accepting}
                  onClick={handleAccept}
                  className="h-11 w-full rounded-full"
                >
                  {accepting ? (
                    <>
                      <LoaderCircle className="animate-spin" />
                      Accepting…
                    </>
                  ) : shopPendingCount > 1 ? (
                    'Accept all products'
                  ) : (
                    'Accept this item'
                  )}
                </Button>
              ) : null}

              {rateable ? (
                <div className="rounded-2xl border border-primary/25 bg-primary/5 p-3">
                  <p className="text-sm font-medium">Deliver this gift</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Hand it over inside the shop's delivery zone. Mark delivered
                    after you hand it over.
                  </p>
                  <Button
                    type="button"
                    onClick={() => setLocalDeliveryOpen(true)}
                    className="mt-3 h-11 w-full rounded-full"
                  >
                    <Bike className="size-4" />
                    Start shop delivery
                  </Button>
                </div>
              ) : null}

              {dispatched && localDelivery && !localDeliveryComplete ? (
                <Button
                  type="button"
                  onClick={() => void handleCompleteLocal()}
                  disabled={completingLocal}
                  className="h-11 w-full rounded-full"
                >
                  {completingLocal ? (
                    <>
                      <LoaderCircle className="animate-spin" />
                      Marking delivered…
                    </>
                  ) : (
                    <>
                      <PackageCheck className="size-4" />
                      Mark as delivered
                    </>
                  )}
                </Button>
              ) : null}
            </div>
          ) : null
        }
      >
        {loading ? (
          <div className="flex justify-center py-24">
            <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : !item ? (
          <FormAlert error={error ?? 'Order item not found.'} />
        ) : (
          <>
            <FormAlert error={error} notice={notice} />

            <SellerSheetSection icon={Gift} title={productsInShipment.length > 1 ? 'Products' : 'Gift'}>
              <ul className="space-y-2">
                {(productsInShipment.length > 1 ? productsInShipment : [null]).map((line) => {
                  const name = line?.product_name ?? product?.name ?? 'Product'
                  const image = line?.product_image_url ?? product?.image_url
                  const quantity = line?.quantity ?? item.quantity
                  const unit = line?.unit_amount ?? item.unit_amount
                  const total = line?.total_amount ?? item.total_amount
                  return (
                    <li
                      key={line?.id ?? item.id}
                      className="flex items-center gap-3 rounded-xl border border-border/50 bg-surface/60 p-3"
                    >
                      <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {image ? (
                          <img src={image} alt="" className="size-full object-cover" />
                        ) : (
                          <div className="flex size-full items-center justify-center text-muted-foreground">
                            <Package className="size-5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{name}</p>
                        <p className="text-sm text-muted-foreground">
                          Qty {quantity} · {formatPriceAmount(unit, currency)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-medium">
                          {formatPriceAmount(total, currency)}
                        </p>
                        {line && productsInShipment.length > 1 ? (
                          <FulfilmentStatusBadge status={line.fulfilment_status} />
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
              {productsInShipment.length > 1 ? (
                <p className="text-sm text-muted-foreground">
                  These products leave together from {item.shop_name || 'this shop'}.
                </p>
              ) : null}
              {orderHasOtherShops ? (
                <p className="text-sm text-muted-foreground">
                  This order also has products from other shops. Each shop ships
                  its own parcel.
                </p>
              ) : null}
            </SellerSheetSection>

            <SellerSheetSection
              icon={Truck}
              title="Order"
              action={item.order ? <OrderStatusBadge status={item.order.status} /> : null}
            >
              <SellerSheetFacts>
                <SellerSheetRow label="Delivery">
                  {item.order ? formatDeliveryDate(item.order.delivery_date) : '—'}
                </SellerSheetRow>
                <SellerSheetRow label="Shipment">
                  {international ? 'International' : 'Domestic'}
                </SellerSheetRow>
                {item.shop_name ? (
                  <SellerSheetRow label="Shop">{item.shop_name}</SellerSheetRow>
                ) : null}
                <SellerSheetRow label="Products" emphasis>
                  {formatPriceAmount(parcelItemsTotal, currency)}
                </SellerSheetRow>
                <SellerSheetRow label="Shipping paid">
                  {shopDelivery ? (
                    <span className="text-right">
                      {shopDelivery.amount === 0
                        ? 'Free'
                        : formatPriceAmount(shopDelivery.amount, shopDelivery.currency || currency)}
                      <span className="block text-xs text-muted-foreground">
                        {shopDelivery.mode === 'seller_delivery'
                          ? 'Shop delivery'
                          : `${shopDelivery.provider} · ${shopDelivery.service_name}`}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Not priced at checkout</span>
                  )}
                </SellerSheetRow>
                {typeof item.order?.delivery_amount === 'number' ? (
                  <SellerSheetRow label="Total delivery" emphasis>
                    {formatPriceAmount(item.order.delivery_amount, currency)}
                  </SellerSheetRow>
                ) : null}
                <SellerSheetRow label="Parcel total" emphasis>
                  {formatPriceAmount(parcelItemsTotal + (shopDelivery?.amount ?? 0), currency)}
                </SellerSheetRow>
              </SellerSheetFacts>
              {item.order?.gift_message ? (
                <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm italic">
                  “{item.order.gift_message}”
                </p>
              ) : null}
              <Button asChild variant="outline" className="h-10 w-full rounded-full">
                <Link to={`/seller/inbox?orderItem=${item.id}`}>
                  <MessageSquare className="size-4" />
                  Message the customer
                </Link>
              </Button>
            </SellerSheetSection>

            <SellerSheetSection icon={User} title="Recipient">
              <div className="rounded-xl border border-border/50 bg-surface/60 p-4">
                {recipient ? (
                  <>
                    <p className="text-sm font-medium">{recipient.name}</p>
                    {recipient.email || recipient.phone ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {[recipient.email, recipient.phone].filter(Boolean).join(' · ')}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No recipient was attached to this item.
                  </p>
                )}
                <div className="mt-3 flex items-start gap-2.5 border-t border-border/50 pt-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {hasShippingAddress(shippingAddress)
                      ? formatShippingAddress(shippingAddress)
                      : 'Recipient needs a shipping address.'}
                  </p>
                </div>
              </div>
            </SellerSheetSection>

            {showShipmentSection ? (
              <SellerSheetSection
                icon={Truck}
                title={
                  localDeliveryComplete || itemDelivered
                    ? 'Delivered'
                    : localDelivery
                      ? 'Out for delivery'
                      : 'Label created'
                }
              >
                <div className="rounded-xl border border-border/50 bg-surface/60 p-4">
                  {localDelivery ? (
                    <>
                      <p className="text-sm">
                        Courier{' '}
                        <span className="font-medium">
                          {shipment?.courier_provider ||
                            item.tracking?.courier_provider ||
                            'Local delivery'}
                        </span>
                      </p>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Delivered by you — no carrier label for this item.
                      </p>
                      {localDeliveryComplete ? (
                        <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                          <PackageCheck className="size-4" />
                          Handed over to the recipient
                        </p>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => void handleCompleteLocal()}
                          disabled={completingLocal}
                          className="mt-3 rounded-full"
                        >
                          {completingLocal ? (
                            <LoaderCircle className="size-4 animate-spin" />
                          ) : (
                            <PackageCheck className="size-4" />
                          )}
                          Mark as delivered
                        </Button>
                      )}
                    </>
                  ) : shipment ? (
                    <>
                      {shipment.is_international ? (
                        <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                          International
                        </p>
                      ) : null}
                      {shipment.courier_provider ? (
                        <p className="text-sm">
                          Courier{' '}
                          <span className="font-medium">{shipment.courier_provider}</span>
                        </p>
                      ) : null}
                      {shipment.tracking_number ? (
                        <p className="text-sm">
                          Tracking{' '}
                          <span className="font-medium">{shipment.tracking_number}</span>
                        </p>
                      ) : item.tracking?.tracking_number ? (
                        <p className="text-sm">
                          Tracking{' '}
                          <span className="font-medium">
                            {item.tracking.tracking_number}
                          </span>
                        </p>
                      ) : null}
                      {(shipment.provider_tracking_url || item.tracking?.tracking_url) ? (
                        <a
                          href={
                            shipment.provider_tracking_url ||
                            item.tracking?.tracking_url ||
                            '#'
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                        >
                          Track shipment
                          <ExternalLink className="size-3.5" />
                        </a>
                      ) : null}
                      <p className="mt-3 text-xs text-muted-foreground">
                        The shop is delivering this gift.
                      </p>
                    </>
                  ) : (
                    <>
                      {item.tracking?.courier_provider ? (
                        <p className="text-sm">
                          Courier{' '}
                          <span className="font-medium">
                            {item.tracking.courier_provider}
                          </span>
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          This item has been dispatched.
                        </p>
                      )}
                      {item.tracking?.tracking_number ? (
                        <p className="mt-1 text-sm">
                          Tracking{' '}
                          <span className="font-medium">
                            {item.tracking.tracking_number}
                          </span>
                        </p>
                      ) : null}
                      {item.tracking?.tracking_url ? (
                        <a
                          href={item.tracking.tracking_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                        >
                          Track shipment
                          <ExternalLink className="size-3.5" />
                        </a>
                      ) : null}

                    </>
                  )}
                </div>
              </SellerSheetSection>
            ) : null}

            {cancelled ? (
              <p className="text-sm text-muted-foreground">
                This item is cancelled. No fulfilment actions are available.
              </p>
            ) : null}
          </>
        )}
      </SellerSheet>

      {item ? (
        <LocalDeliveryDialog
          parcel={{ orderId: item.order_id, shopId: item.shop_id }}
          open={localDeliveryOpen}
          onOpenChange={setLocalDeliveryOpen}
          onStarted={(started) => {
            setShipment(started)
            void load()
            onChanged?.()
            setToast('Delivery started. Confirm it once handed over.')
          }}
        />
      ) : null}

      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
    </>
  )
}
