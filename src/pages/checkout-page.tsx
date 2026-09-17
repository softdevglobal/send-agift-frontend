import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  CalendarDays,
  Gift,
  LoaderCircle,
  MapPin,
  Truck,
  TriangleAlert,
  User,
} from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { listCountries, type Country } from '@/api/countries'
import {
  getCustomerMe,
  getRecipient,
  listRecipients,
  type Recipient,
  type RecipientAddress,
  type RecipientDetails,
} from '@/api/customers'
import { createOrder, quoteDelivery, type DeliveryQuote } from '@/api/orders'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CustomerPageHeader, customerPanelClass, useCart } from '@/features/customer-commerce'
import { toDateInputValue } from '@/features/customer-commerce/order-display'
import type { CartCustomerType } from '@/features/customer-commerce/types'
import { getErrorMessage } from '@/lib/api'
import { selectClassName, textareaClassName } from '@/lib/form-styles'
import { formatPriceAmount, majorToMinor } from '@/lib/money'
import { isUuid } from '@/lib/uuid'
import { cn } from '@/lib/utils'

function tomorrow() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return toDateInputValue(date)
}

function inDays(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return toDateInputValue(date)
}

/**
 * Shortcuts for when a gift should land. Delivery cost depends on the date, so
 * these are not only convenience — they let someone see the price move.
 */
const DATE_PRESETS = [
  { label: 'Tomorrow', days: 1 },
  { label: 'In 3 days', days: 3 },
  { label: 'Next week', days: 7 },
] as const

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?'
  )
}

function recipientLabel(recipient: Recipient) {
  return recipient.relationship
    ? `${recipient.name} · ${recipient.relationship}`
    : recipient.name
}

/** The address a recipient would actually be shipped to: their default, or their only one. */
function defaultAddress(details: RecipientDetails): RecipientAddress | null {
  return (
    details.addresses.find((address) => address.id === details.default_address_id) ??
    details.addresses[0] ??
    null
  )
}

/**
 * Delivery is quoted in the carrier's currency, which is not always the
 * currency the cart is priced in — USPS quotes USD for a cart priced in AUD.
 * Adding the two numbers would be nonsense, so a combined total is only ever
 * shown when both sides agree.
 */
function sameCurrency(a: string | undefined, b: string): boolean {
  return Boolean(a) && a!.toUpperCase() === b.toUpperCase()
}

function formatRecipientAddress(address: RecipientAddress, countryName?: string) {
  return [address.line1, address.line2, address.city, address.region, address.postal_code, countryName]
    .filter(Boolean)
    .join(', ')
}

export function CheckoutPage() {
  const navigate = useNavigate()
  const { lines, subtotal, clearCart, mixedCustomerType, cartCustomerType } = useCart()

  const [countries, setCountries] = useState<Country[]>([])
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [placed, setPlaced] = useState(false)

  const [recipientId, setRecipientId] = useState('')
  const [recipientDetails, setRecipientDetails] = useState<RecipientDetails | null>(null)
  const [recipientLoading, setRecipientLoading] = useState(false)
  const [countryId, setCountryId] = useState('')
  const [quote, setQuote] = useState<DeliveryQuote | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [customerType, setCustomerType] = useState<CartCustomerType>(
    cartCustomerType ?? 'personal',
  )
  const [deliveryDate, setDeliveryDate] = useState(tomorrow)
  const [giftMessage, setGiftMessage] = useState('')

  useEffect(() => {
    if (cartCustomerType) setCustomerType(cartCustomerType)
  }, [cartCustomerType])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      getCustomerMe(),
      listRecipients().catch(() => [] as Recipient[]),
      listCountries().catch(() => [] as Country[]),
    ])
      .then(([me, recipientList, countryList]) => {
        if (cancelled) return
        setRecipients(Array.isArray(recipientList) ? recipientList : [])
        setCountries(Array.isArray(countryList) ? countryList : [])
        setCountryId((current) => current || me.country_id)
        setCustomerType((current) => {
          if (cartCustomerType) return cartCustomerType
          if (me.customer_type === 'personal' || me.customer_type === 'corporate') {
            return me.customer_type
          }
          return current
        })
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load your account details.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [cartCustomerType])

  // Loads the picked recipient's saved addresses — the list only carries a
  // name, so the address has to be fetched once someone is actually chosen.
  useEffect(() => {
    if (!recipientId) {
      setRecipientDetails(null)
      return
    }
    let cancelled = false
    setRecipientLoading(true)
    getRecipient(recipientId)
      .then((details) => {
        if (cancelled) return
        setRecipientDetails(details)
        // Match the delivery country to where the gift is actually going,
        // rather than leaving it on the buyer's own country by default.
        const address = defaultAddress(details)
        if (address?.country_id) setCountryId(address.country_id)
      })
      .catch(() => {
        if (!cancelled) setRecipientDetails(null)
      })
      .finally(() => {
        if (!cancelled) setRecipientLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [recipientId])

  // Prices delivery once there is a recipient, a date and a real cart. Re-runs
  // when any of those change, because the chosen service depends on all three.
  const quoteKey = lines
    .map((line) => `${line.product.id}:${line.quantity}`)
    .sort()
    .join('|')

  useEffect(() => {
    const items = lines
      .filter((line) => isUuid(line.product.id))
      .map((line) => ({ product_id: line.product.id, quantity: line.quantity }))

    if (!recipientId || !deliveryDate || items.length === 0) {
      setQuote(null)
      return
    }
    let cancelled = false
    setQuoteLoading(true)
    quoteDelivery({
      recipient_id: recipientId,
      delivery_date: deliveryDate,
      items,
    })
      .then((result) => {
        if (!cancelled) setQuote(result)
      })
      .catch(() => {
        // A failed quote must not block checkout — delivery is then arranged
        // after the order, exactly as it was before this existed.
        if (!cancelled) setQuote(null)
      })
      .finally(() => {
        if (!cancelled) setQuoteLoading(false)
      })
    return () => {
      cancelled = true
    }
    // quoteKey stands in for the cart contents; `lines` is a new array each render.
  }, [recipientId, deliveryDate, quoteKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Only API-backed products can be ordered — demo catalog entries have no server record.
  const unorderable = useMemo(
    () => lines.filter((line) => !isUuid(line.product.id)),
    [lines],
  )

  const currencies = useMemo(
    () => [...new Set(lines.map((line) => line.product.currency).filter(Boolean))],
    [lines],
  )
  const currency = currencies[0] ?? 'USD'
  const mixedCurrency = currencies.length > 1
  const typeMismatch = Boolean(cartCustomerType && customerType !== cartCustomerType)

  const money = (major: number) => formatPriceAmount(majorToMinor(major, currency), currency)

  const blocker = unorderable.length
    ? 'Your cart holds sample products that are not published by a seller. Remove them to check out.'
    : mixedCurrency
      ? 'All items in one order must share the same currency. Split your cart and order separately.'
      : mixedCustomerType
        ? 'Your cart mixes personal and corporate catalog items. Remove one type to check out.'
        : typeMismatch
          ? 'Order type must match the catalog you used when adding these gifts to your cart.'
          : null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (blocker) return
    setError(null)
    setSubmitting(true)
    try {
      const order = await createOrder({
        ...(recipientId ? { recipient_id: recipientId } : {}),
        country_id: countryId,
        customer_type: customerType,
        delivery_date: deliveryDate,
        ...(giftMessage.trim() ? { gift_message: giftMessage.trim() } : {}),
        // Only send a delivery amount that was actually quoted, and only when
        // it is in the order's own currency — the order stores a bare integer,
        // so a USD quote saved against an AUD order would be silently wrong.
        ...(quote?.complete && sameCurrency(quote.currency, currency)
          ? { delivery_amount: quote.amount }
          : {}),
        items: lines.map((line) => ({
          product_id: line.product.id,
          quantity: line.quantity,
        })),
      })
      setPlaced(true)
      clearCart()
      navigate(`/orders/${encodeURIComponent(order.id)}?placed=1`, {
        replace: true,
      })
    } catch (err) {
      setError(getErrorMessage(err, 'Could not place your order.'))
      setSubmitting(false)
    }
  }

  if (placed || loading) {
    return (
      <div className="flex justify-center py-24">
        <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!lines.length) {
    return <Navigate to="/cart" replace />
  }

  return (
    <div>
      <CustomerPageHeader
        title="Checkout"
        description="Confirm who this gift is for and when it should arrive. After placing, you can track the gift and find it in your order history."
      />

      <FormAlert error={error ?? blocker} className="mb-5" />

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,1fr)]"
      >
        <div className="space-y-6">
          <section className={cn(customerPanelClass, 'space-y-4 p-5 sm:p-6')}>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <User className="size-4" />
              </span>
              <div>
                <h2 className="font-medium">Who is it for?</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Pick someone from your saved recipients, or send without one.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkout-recipient">Send to</Label>
              <select
                id="checkout-recipient"
                value={recipientId}
                onChange={(event) => setRecipientId(event.target.value)}
                className={selectClassName}
              >
                <option value="">Send without a recipient</option>
                {recipients.map((recipient) => (
                  <option key={recipient.id} value={recipient.id}>
                    {recipientLabel(recipient)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Need someone new?{' '}
                <Link
                  to="/account/recipients"
                  className="font-medium text-primary hover:underline"
                >
                  Manage recipients
                </Link>
              </p>

              {recipientId ? (
                recipientLoading ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <LoaderCircle className="size-3.5 animate-spin" />
                    Loading their address…
                  </p>
                ) : recipientDetails ? (
                  (() => {
                    const address = defaultAddress(recipientDetails)
                    if (!address) {
                      return (
                        <p className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
                          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                          <span>
                            {recipientDetails.name} has no saved address yet.{' '}
                            <Link
                              to="/account/recipients"
                              className="font-medium text-primary hover:underline"
                            >
                              Add one
                            </Link>{' '}
                            before sending this gift.
                          </span>
                        </p>
                      )
                    }
                    const countryName = countries.find(
                      (country) => country.id === address.country_id,
                    )?.name
                    return (
                      <div className="animate-fade-in flex items-start gap-3 rounded-xl border border-border/60 bg-gradient-to-br from-accent/40 to-transparent p-3.5 text-sm">
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                          {initials(recipientDetails.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium">{recipientDetails.name}</p>
                          <p className="mt-0.5 flex items-start gap-1.5 text-muted-foreground">
                            <MapPin className="mt-0.5 size-3.5 shrink-0" />
                            <span>{formatRecipientAddress(address, countryName)}</span>
                          </p>
                          {recipientDetails.phone ? (
                            <p className="mt-0.5 pl-5 text-muted-foreground">
                              {recipientDetails.phone}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    )
                  })()
                ) : null
              ) : null}
            </div>
          </section>

          <section className={cn(customerPanelClass, 'space-y-4 p-5 sm:p-6')}>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <CalendarDays className="size-4" />
              </span>
              <div>
                <h2 className="font-medium">When should it arrive?</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Delivery is priced for the date you choose.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="checkout-country">Delivery country</Label>
                {countries.length ? (
                  <select
                    id="checkout-country"
                    value={countryId}
                    onChange={(event) => setCountryId(event.target.value)}
                    className={selectClassName}
                    required
                  >
                    <option value="">Select a country</option>
                    {countries.map((country) => (
                      <option key={country.id} value={country.id}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id="checkout-country"
                    value={countryId}
                    onChange={(event) => setCountryId(event.target.value)}
                    className="h-11 bg-surface px-3"
                    placeholder="Country id"
                    required
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="checkout-delivery-date">Delivery date</Label>
                <Input
                  id="checkout-delivery-date"
                  type="date"
                  value={deliveryDate}
                  min={toDateInputValue(new Date())}
                  onChange={(event) => setDeliveryDate(event.target.value)}
                  className="h-11 bg-surface px-3"
                  required
                />
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {DATE_PRESETS.map((preset) => {
                    const value = inDays(preset.days)
                    const active = deliveryDate === value
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setDeliveryDate(value)}
                        className={cn(
                          'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                          active
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                        )}
                      >
                        {preset.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="checkout-customer-type">Order type</Label>
                <select
                  id="checkout-customer-type"
                  value={customerType}
                  onChange={(event) =>
                    setCustomerType(event.target.value as CartCustomerType)
                  }
                  className={selectClassName}
                >
                  <option value="personal">Personal</option>
                  <option value="corporate">Corporate</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Must match the catalog (personal or corporate) used when you added
                  these gifts to your cart.
                </p>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="checkout-gift-message">Gift message (optional)</Label>
                <textarea
                  id="checkout-gift-message"
                  value={giftMessage}
                  onChange={(event) => setGiftMessage(event.target.value)}
                  className={textareaClassName}
                  placeholder="Happy birthday — thinking of you"
                />
              </div>
            </div>
          </section>
        </div>

        <aside className={cn(customerPanelClass, 'h-fit p-5 lg:sticky lg:top-24')}>
          <div className="flex items-center gap-2">
            <Gift className="size-4 text-primary" />
            <h2 className="font-medium">Your gift</h2>
          </div>
          <ul className="mt-4 space-y-3">
            {lines.map((line) => (
              <li key={line.product.id} className="flex items-center gap-3 text-sm">
                <span className="size-12 shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-border/50">
                  {line.product.image ? (
                    <img
                      src={line.product.image}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{line.product.name}</span>
                  <span className="text-xs text-muted-foreground">
                    Qty {line.quantity}
                    {line.product.shopName ? ` · ${line.product.shopName}` : ''}
                  </span>
                </span>
                <span className="shrink-0">{money(line.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-border/60 pt-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{money(subtotal)}</dd>
            </div>

            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Delivery</dt>
              <dd className={quote?.complete ? undefined : 'text-muted-foreground'}>
                {quoteLoading ? (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <LoaderCircle className="size-3 animate-spin" />
                    Pricing…
                  </span>
                ) : quote?.complete ? (
                  formatPriceAmount(quote.amount, quote.currency || currency)
                ) : !recipientId ? (
                  'Pick a recipient'
                ) : (
                  'Arranged after ordering'
                )}
              </dd>
            </div>

            {/* Which service was picked, and why — one line per shop, because a
                cart can span shops that each post their own parcel. */}
            {quote?.shipments.map((shipment) => (
              <div
                key={shipment.shop_id}
                className="flex justify-between gap-4 text-xs text-muted-foreground"
              >
                <dt className="flex min-w-0 items-start gap-1.5">
                  <Truck className="mt-0.5 size-3 shrink-0" />
                  <span className="min-w-0 truncate">
                    {shipment.shop_name} · {shipment.provider} {shipment.service_name}
                    {shipment.estimated_days > 0
                      ? ` · ${shipment.estimated_days} day${shipment.estimated_days === 1 ? '' : 's'}`
                      : ''}
                  </span>
                </dt>
                <dd className="shrink-0">
                  {formatPriceAmount(shipment.amount, shipment.currency)}
                </dd>
              </div>
            ))}

            <div className="flex justify-between gap-4 border-t border-border/60 pt-3 text-base font-medium">
              <dt>Total</dt>
              <dd className="text-right">
                {quote?.complete && sameCurrency(quote.currency, currency) ? (
                  formatPriceAmount(
                    majorToMinor(subtotal, currency) + quote.amount,
                    currency,
                  )
                ) : quote?.complete ? (
                  // Two currencies, no exchange rate to combine them with.
                  <span className="inline-flex flex-col items-end">
                    <span>{money(subtotal)}</span>
                    <span className="text-sm font-normal text-muted-foreground">
                      + {formatPriceAmount(quote.amount, quote.currency)} delivery
                    </span>
                  </span>
                ) : (
                  money(subtotal)
                )}
              </dd>
            </div>
          </dl>

          {quote?.complete && !sameCurrency(quote.currency, currency) ? (
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              The carrier quotes delivery in {quote.currency.toUpperCase()} while this
              cart is priced in {currency.toUpperCase()}, so the two are shown
              separately rather than converted at a rate we cannot verify.
            </p>
          ) : null}

          {quote?.shipments.some((shipment) => shipment.misses_delivery_date) ? (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              <span>
                No service can reach {recipientDetails?.name ?? 'the recipient'} by{' '}
                {deliveryDate}. The fastest available has been picked, but it may
                arrive after that date.
              </span>
            </p>
          ) : null}

          {quote && !quote.complete && quote.unquoted?.length ? (
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Delivery for {quote.unquoted.length === 1 ? 'one shop' : 'some shops'} could
              not be priced ({quote.unquoted.join('; ')}), so the shop will arrange it
              after you order.
            </p>
          ) : null}

          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Line prices are confirmed by the seller when the order is created, so the
            final total may differ. Payment is not captured yet — new orders stay
            awaiting payment.
          </p>
          <Button
            type="submit"
            disabled={submitting || Boolean(blocker)}
            className="mt-5 h-11 w-full rounded-full"
          >
            {submitting ? (
              <>
                <LoaderCircle className="animate-spin" />
                Placing order…
              </>
            ) : (
              'Place order'
            )}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Or{' '}
            <Link to="/cart" className="font-medium text-primary hover:underline">
              return to cart
            </Link>
          </p>
        </aside>
      </form>
    </div>
  )
}
