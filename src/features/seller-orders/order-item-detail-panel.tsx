import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ExternalLink,
  Gift,
  LoaderCircle,
  MapPin,
  MessageSquare,
  Package,
  Truck,
  TriangleAlert,
  User,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { listCountries, type Country } from '@/api/countries'
import {
  acceptSellerOrderItem,
  buyShippingLabel,
  getSellerOrderItem,
  getShippingRates,
  type SellerOrderItemDetails,
  type Shipment,
  type ShippingRatesResult,
  type ShippoRate,
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
  sellerDisplayName,
} from '@/features/seller'
import {
  buildShippingRatesBody,
  canAcceptOrderItem,
  canGetShippingRates,
  defaultCustomsForm,
  DEFAULT_PARCEL_FORM,
  EMPTY_CUSTOMS_FORM,
  EMPTY_PARCEL_FORM,
  formatShippoRateAmount,
  formatShippingAddress,
  hasShippingAddress,
  isDispatchedOrderItem,
  isInternationalShipment,
  newLabelIdempotencyKey,
  resolveShipFrom,
  resolveShipTo,
  type CustomsFormState,
  type ParcelFormState,
} from '@/features/seller-orders/order-item-display'
import { FulfilmentStatusBadge } from '@/features/seller-orders/fulfilment-status-badge'
import { ShippingRatesForm } from '@/features/seller-orders/shipping-rates-form'
import { ApiError, getErrorMessage } from '@/lib/api'
import { formatPriceAmount } from '@/lib/money'
import { cn } from '@/lib/utils'

const RATES_ADDRESS_HINT =
  'Set your shop ship-from address (address_id) and make sure the recipient has street, city, and country (ISO 2).'

const SHIPPING_NOT_CONFIGURED_HINT =
  'Shipping is not connected on the API. Add SHIPPO_API_KEY to the backend .env (use a shippo_test_… key for local labels) and restart the server on port 8081.'

const SAMPLE_LABEL_NOTICE = 'Test labels are watermarked SAMPLE — do not mail.'

type OrderItemDetailPanelProps = {
  /** The item to show. `null` closes the panel. */
  orderItemId: string | null
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
  const [ratesLoading, setRatesLoading] = useState(false)
  const [buying, setBuying] = useState(false)
  const [forceInternational, setForceInternational] = useState(false)

  const [ratesResult, setRatesResult] = useState<ShippingRatesResult | null>(null)
  const [selectedRate, setSelectedRate] = useState<ShippoRate | null>(null)
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null)
  const [shipment, setShipment] = useState<Shipment | null>(null)

  const [parcel, setParcel] = useState<ParcelFormState>(EMPTY_PARCEL_FORM)
  const [customs, setCustoms] = useState<CustomsFormState>(EMPTY_CUSTOMS_FORM)
  const [formItemId, setFormItemId] = useState<string | null>(null)

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
      setRatesResult(null)
      setSelectedRate(null)
      setIdempotencyKey(null)
      setShipment(null)
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

  const international = forceInternational || detectedInternational
  const shipFrom = item ? resolveShipFrom({ item, seller, countries }) : null
  const shipTo = item ? resolveShipTo({ item, countries }) : null

  useEffect(() => {
    if (!item) return
    const origin = shipFrom?.iso || ''
    const signer =
      shipFrom?.shopName ||
      (seller ? sellerDisplayName(seller) : '') ||
      seller?.legal_name ||
      ''
    const detected = isInternationalShipment({ item, seller, countries })
    const itemChanged = formItemId !== item.id

    if (itemChanged) {
      setFormItemId(item.id)
      setForceInternational(false)
      setParcel(detected ? DEFAULT_PARCEL_FORM : EMPTY_PARCEL_FORM)
      setCustoms(
        defaultCustomsForm({ item, certifySigner: signer, originCountry: origin }),
      )
      return
    }

    if (!international) return

    setParcel((current) =>
      current.length || current.width || current.height || current.weight
        ? current
        : DEFAULT_PARCEL_FORM,
    )
    setCustoms((current) => ({
      ...current,
      ...(current.origin_country.trim() ? {} : { origin_country: origin }),
      ...(current.certify_signer.trim() ? {} : { certify_signer: signer }),
      ...(current.description.trim()
        ? {}
        : { description: item.product?.name || current.description }),
      ...(current.net_weight.trim() ? {} : { net_weight: DEFAULT_PARCEL_FORM.weight }),
    }))
  }, [item, formItemId, international, seller, countries, shipFrom?.iso, shipFrom?.shopName])

  function clearShippingDraft() {
    setRatesResult(null)
    setSelectedRate(null)
    setIdempotencyKey(null)
  }

  function selectRate(rate: ShippoRate) {
    if (!item) return
    if (selectedRate?.object_id === rate.object_id) return
    setSelectedRate(rate)
    setIdempotencyKey(newLabelIdempotencyKey(item.id))
  }

  async function handleAccept() {
    if (!item || !canAcceptOrderItem(item.fulfilment_status)) return
    setError(null)
    setNotice(null)
    setAccepting(true)
    try {
      const accepted = await acceptSellerOrderItem(item.id)
      setItem((current) => (current ? { ...current, ...accepted } : current))
      clearShippingDraft()
      await load()
      onChanged?.()
      setToast('Order item accepted. You can get shipping rates now.')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not accept this order item.'))
      if (err instanceof ApiError && (err.status === 409 || err.status === 404)) {
        await load().catch(() => undefined)
      }
    } finally {
      setAccepting(false)
    }
  }

  async function handleGetRates() {
    if (!item || !canGetShippingRates(item.fulfilment_status)) return
    setError(null)
    setNotice(null)
    const built = buildShippingRatesBody(international, parcel, customs)
    if (built.error) {
      setError(built.error)
      return
    }
    setRatesLoading(true)
    try {
      const result = await getShippingRates(item.id, built.body)
      setRatesResult(result)
      setSelectedRate(null)
      setIdempotencyKey(null)
      if (!result.rates?.length) {
        setNotice('No shipping rates were returned. Check shop and recipient addresses.')
      }
    } catch (err) {
      setRatesResult(null)
      setSelectedRate(null)
      setIdempotencyKey(null)
      const message = getErrorMessage(err, 'Could not load shipping rates.')
      setError(message)
      if (err instanceof ApiError && err.status === 503) {
        setNotice(SHIPPING_NOT_CONFIGURED_HINT)
      } else if (err instanceof ApiError && err.status === 400) {
        if (message.toLowerCase().includes('customs')) {
          setForceInternational(true)
          setNotice(
            'International shipments need parcel dimensions/weight and a customs declaration.',
          )
        } else {
          setNotice(RATES_ADDRESS_HINT)
        }
      }
    } finally {
      setRatesLoading(false)
    }
  }

  async function handleBuyLabel() {
    if (!item || !selectedRate || !idempotencyKey) return
    if (!canGetShippingRates(item.fulfilment_status)) return
    setError(null)
    setNotice(null)
    setBuying(true)
    try {
      const purchased = await buyShippingLabel(item.id, {
        rate_object_id: selectedRate.object_id,
        provider: selectedRate.provider,
        idempotency_key: idempotencyKey,
      })
      setShipment(purchased)
      clearShippingDraft()
      await load()
      onChanged?.()
      setNotice(SAMPLE_LABEL_NOTICE)
      setToast('Shipping label created.')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not buy a shipping label.'))
      if (err instanceof ApiError && err.status === 503) {
        setNotice(SHIPPING_NOT_CONFIGURED_HINT)
      } else if (err instanceof ApiError && (err.status === 409 || err.status === 404)) {
        await load().catch(() => undefined)
      }
    } finally {
      setBuying(false)
    }
  }

  const currency = item?.order?.currency || 'USD'
  const product = item?.product
  const recipient = item?.recipient
  const shippingAddress = item?.shipping_address
  const missingAddress = !hasShippingAddress(shippingAddress)
  const pending = item ? canAcceptOrderItem(item.fulfilment_status) : false
  const rateable = item ? canGetShippingRates(item.fulfilment_status) : false
  const dispatched = item ? isDispatchedOrderItem(item.fulfilment_status) : false
  const cancelled = item?.fulfilment_status === 'cancelled'

  return (
    <>
      <SellerSheet
        open={orderItemId !== null}
        onOpenChange={(open) => !open && onClose()}
        size="lg"
        eyebrow="Order item"
        title={item?.order?.order_number ?? (loading ? 'Loading…' : 'Order item')}
        description={
          item ? `Placed ${formatOrderDate(item.created_at)}` : undefined
        }
        badge={
          item ? <FulfilmentStatusBadge status={item.fulfilment_status} /> : null
        }
        footer={
          item && (pending || rateable) ? (
            <div className="space-y-2">
              {pending ? (
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
                  ) : (
                    'Accept this item'
                  )}
                </Button>
              ) : null}

              {rateable ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={ratesLoading}
                    onClick={handleGetRates}
                    className="h-11 flex-1 rounded-full"
                  >
                    {ratesLoading ? (
                      <>
                        <LoaderCircle className="animate-spin" />
                        Getting rates…
                      </>
                    ) : (
                      'Get shipping rates'
                    )}
                  </Button>
                  <Button
                    type="button"
                    disabled={!selectedRate || !idempotencyKey || buying}
                    onClick={handleBuyLabel}
                    className="h-11 flex-1 rounded-full"
                  >
                    {buying ? (
                      <>
                        <LoaderCircle className="animate-spin" />
                        Buying label…
                      </>
                    ) : (
                      'Buy shipping label'
                    )}
                  </Button>
                </div>
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

            {missingAddress && rateable ? (
              <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-surface/60 p-4">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  This recipient needs a shipping address before you can get rates.
                </p>
              </div>
            ) : null}

            <SellerSheetSection icon={Gift} title="Gift">
              <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-surface/60 p-3">
                <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {product?.image_url ? (
                    <img
                      src={product.image_url}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground">
                      <Package className="size-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{product?.name ?? 'Product'}</p>
                  <p className="text-sm text-muted-foreground">
                    Qty {item.quantity} · {formatPriceAmount(item.unit_amount, currency)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-medium">
                  {formatPriceAmount(item.total_amount, currency)}
                </p>
              </div>
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
                <SellerSheetRow label="Item total" emphasis>
                  {formatPriceAmount(item.total_amount, currency)}
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
                      ? `${formatShippingAddress(shippingAddress)}${shipTo?.iso ? ` · ${shipTo.iso}` : ''}`
                      : 'Recipient needs a shipping address.'}
                  </p>
                </div>
              </div>
            </SellerSheetSection>

            {rateable ? (
              <ShippingRatesForm
                flat
                international={international}
                originIso={shipFrom?.iso ?? null}
                destIso={shipTo?.iso ?? null}
                parcel={parcel}
                customs={customs}
                onParcelChange={(patch) =>
                  setParcel((current) => ({ ...current, ...patch }))
                }
                onCustomsChange={(patch) =>
                  setCustoms((current) => ({ ...current, ...patch }))
                }
              />
            ) : null}

            {rateable && ratesResult?.rates?.length ? (
              <SellerSheetSection icon={Truck} title="Shipping rates">
                <p className="text-sm text-muted-foreground">
                  Pick a rate, then buy the label. {SAMPLE_LABEL_NOTICE}
                </p>
                <ul className="space-y-2">
                  {ratesResult.rates.map((rate) => {
                    const selected = selectedRate?.object_id === rate.object_id
                    return (
                      <li key={rate.object_id}>
                        <button
                          type="button"
                          onClick={() => selectRate(rate)}
                          className={cn(
                            'w-full rounded-xl border px-4 py-3 text-left transition-colors',
                            selected
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                              : 'border-border/50 hover:border-border hover:bg-muted/40',
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium">
                                {rate.provider} · {rate.service_name}
                              </p>
                              <p className="mt-0.5 text-sm text-muted-foreground">
                                {rate.estimated_days != null
                                  ? `${rate.estimated_days} day${rate.estimated_days === 1 ? '' : 's'} estimated`
                                  : null}
                                {rate.estimated_days != null && rate.duration_terms
                                  ? ' · '
                                  : null}
                                {rate.duration_terms}
                              </p>
                            </div>
                            <p className="shrink-0 font-medium">
                              {formatShippoRateAmount(rate)}
                            </p>
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </SellerSheetSection>
            ) : null}

            {dispatched ? (
              <SellerSheetSection icon={Truck} title="Label created">
                <div className="rounded-xl border border-border/50 bg-surface/60 p-4">
                  {shipment ? (
                    <>
                      {shipment.is_international ? (
                        <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                          International
                        </p>
                      ) : null}
                      {shipment.tracking_number ? (
                        <p className="text-sm">
                          Tracking{' '}
                          <span className="font-medium">{shipment.tracking_number}</span>
                        </p>
                      ) : null}
                      {shipment.provider_tracking_url ? (
                        <a
                          href={shipment.provider_tracking_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                        >
                          Track shipment
                          <ExternalLink className="size-3.5" />
                        </a>
                      ) : null}
                      <p className="mt-3 text-xs text-muted-foreground">
                        {SAMPLE_LABEL_NOTICE}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      A shipping label has already been bought for this item.
                    </p>
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

      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
    </>
  )
}
