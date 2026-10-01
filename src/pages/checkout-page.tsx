import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  Bike,
  CalendarDays,
  Gift,
  LoaderCircle,
  MapPin,
  Plus,
  Truck,
  TriangleAlert,
  User,
} from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { listCountries, type Country } from '@/api/countries'
import {
  createRecipient,
  getCustomerMe,
  getRecipient,
  listRecipients,
  type Recipient,
  type RecipientAddress,
  type RecipientDetails,
} from '@/api/customers'
import { addressFieldsFromPlace } from '@/api/places'
import type { PlaceDetails } from '@/api/types'
import {
  createOrder,
  defaultQuoteSelections,
  quoteDelivery,
  selectionsDeliveryAmount,
  selectionsToShippingQuotes,
  sellerDeliveryChoice,
  type CheckoutDeliveryChoice,
  type DeliveryQuote,
} from '@/api/orders'
import { AddressAutocomplete } from '@/components/common/place-autocomplete'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  cartShops,
  CustomerPageHeader,
  customerPanelClass,
  MIXED_SHOPS_MESSAGE,
  useCart,
} from '@/features/customer-commerce'
import { toDateInputValue } from '@/features/customer-commerce/order-display'
import type { CartCustomerType } from '@/features/customer-commerce/types'
import {
  describeIntent,
  useDeliveryIntent,
  type DeliveryIntent,
} from '@/features/customer-commerce/delivery-intent-context'
import { PhoneField } from '@/features/auth/phone-field'
import { getErrorMessage } from '@/lib/api'
import { optionalString } from '@/lib/form'
import { selectClassName, textareaClassName } from '@/lib/form-styles'
import { formatPriceAmount, majorToMinor } from '@/lib/money'
import { isUuid } from '@/lib/uuid'
import { cn } from '@/lib/utils'

function blankRecipient(country = '') {
  return {
    name: '',
    phone: '',
    country_id: country,
    label: '',
    address_type: 'shipping',
    line1: '',
    line2: '',
    city: '',
    region: '',
    postal_code: '',
    latitude: null as number | null,
    longitude: null as number | null,
    is_default: true,
  }
}

/** The address chosen on the home search, ready to drop into a new recipient. */
function recipientFromSearch(intent: DeliveryIntent | null) {
  const searched = intent?.address?.trim() ?? ''
  return {
    ...blankRecipient(),
    line1: intent?.line1?.trim() || searched,
    line2: intent?.line2 ?? '',
    city: intent?.city ?? '',
    region: intent?.region ?? '',
    postal_code: intent?.postalCode ?? '',
    latitude: typeof intent?.latitude === 'number' ? intent.latitude : null,
    longitude: typeof intent?.longitude === 'number' ? intent.longitude : null,
  }
}

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

function formatStreetAddress(
  address: {
    line1?: string
    line2?: string | null
    city?: string
    region?: string | null
    postal_code?: string | null
  },
  countryName?: string | null,
) {
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

  const { intent } = useDeliveryIntent()

  const [recipientId, setRecipientId] = useState('')
  const [recipientDetails, setRecipientDetails] = useState<RecipientDetails | null>(null)
  const [recipientLoading, setRecipientLoading] = useState(false)
  const [addingRecipient, setAddingRecipient] = useState(() =>
    Boolean(intent?.address?.trim()),
  )
  const [savingRecipient, setSavingRecipient] = useState(false)
  const [newRecipient, setNewRecipient] = useState(() => recipientFromSearch(intent))
  const appliedSearchCountry = useRef(false)
  const [countryId, setCountryId] = useState('')
  const [quote, setQuote] = useState<DeliveryQuote | null>(null)
  const [quoteSelections, setQuoteSelections] = useState<
    Record<string, CheckoutDeliveryChoice>
  >({})
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteSettled, setQuoteSettled] = useState(false)
  const [customerType, setCustomerType] = useState<CartCustomerType>(
    cartCustomerType ?? 'personal',
  )
  // The date asked for on the home page, unless it has since passed. The
  // address from there is only a hint: where it actually ships is the
  // recipient's saved address, which is the one that has been verified.
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const wanted = intent?.date
    return wanted && wanted >= toDateInputValue(new Date()) ? wanted : tomorrow()
  })
  const [giftMessage, setGiftMessage] = useState('')

  useEffect(() => {
    if (cartCustomerType) setCustomerType(cartCustomerType)
  }, [cartCustomerType])

  // The country list arrives after the form opens. Match it once to the
  // country from the home search, then leave later edits alone.
  useEffect(() => {
    if (appliedSearchCountry.current) return
    if (!intent?.countryCode || countries.length === 0) return
    const matched = countries.find(
      (country) =>
        country.iso_code.toLowerCase() === intent.countryCode?.toLowerCase(),
    )
    if (!matched) return
    appliedSearchCountry.current = true
    setNewRecipient((current) =>
      current.country_id === matched.id
        ? current
        : { ...current, country_id: matched.id },
    )
  }, [intent, countries])

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
      setQuoteSelections({})
      setQuoteLoading(false)
      setQuoteSettled(false)
      return
    }
    let cancelled = false
    setQuoteLoading(true)
    setQuoteSettled(false)
    quoteDelivery({
      recipient_id: recipientId,
      delivery_date: deliveryDate,
      items,
    })
      .then((result) => {
        if (cancelled) return
        setQuote(result)
        setQuoteSelections(defaultQuoteSelections(result))
      })
      .catch(() => {
        if (!cancelled) {
          setQuote(null)
          setQuoteSelections({})
        }
      })
      .finally(() => {
        if (!cancelled) {
          setQuoteLoading(false)
          setQuoteSettled(true)
        }
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

  // Each shop is its own parcel. A selection only counts when it is quoted in
  // the cart currency — otherwise the order cannot be placed.
  const chargeableSelections = Object.fromEntries(
    Object.entries(quoteSelections).filter(([, choice]) => sameCurrency(choice.currency, currency)),
  )
  const selectedDeliveryAmount = selectionsDeliveryAmount(chargeableSelections)
  const deliveryCurrency = currency
  const pricedShopCount = Object.keys(chargeableSelections).length
  const hasPricedDelivery = pricedShopCount > 0
  const otherCurrencySelections = Object.keys(quoteSelections).length - pricedShopCount

  const mixedShops = cartShops(lines).length > 1

  const quotedShops = quote?.shops ?? []
  const hasChargeableDelivery =
    quotedShops.length > 0 &&
    quotedShops.every(
      (shop) =>
        Boolean(shop.seller_delivery?.available) &&
        Boolean(chargeableSelections[shop.shop_id]),
    )
  const awaitingDeliveryQuote = Boolean(recipientId) && !quoteSettled
  const noDeliveryOptions = Boolean(recipientId) && quoteSettled && !hasChargeableDelivery
  const shopsLackOptions =
    quotedShops.length === 0 ||
    quotedShops.some(
      (shop) => !shop.seller_delivery?.available,
    )

  const blocker = unorderable.length
    ? 'Your cart holds sample products that are not published by a seller. Remove them to check out.'
    : mixedShops
      ? MIXED_SHOPS_MESSAGE
      : mixedCurrency
      ? 'All items in one order must share the same currency. Split your cart and order separately.'
      : mixedCustomerType
        ? 'Your cart mixes personal and corporate catalog items. Remove one type to check out.'
        : typeMismatch
          ? 'Order type must match the catalog you used when adding these gifts to your cart.'
          : noDeliveryOptions
            ? shopsLackOptions
              ? 'This address is outside the shop delivery zones, so this order cannot be placed.'
              : 'Delivery for this order is not priced in the cart currency, so it cannot be placed.'
            : null

  function openAddRecipient() {
    setAddingRecipient(true)
    setNewRecipient((current) => ({
      ...current,
      country_id: current.country_id || countryId,
    }))
  }

  function applyNewAddress(place: PlaceDetails) {
    const fields = addressFieldsFromPlace(place)
    const matched = countries.find(
      (country) =>
        country.iso_code.toLowerCase() === (place.country_code ?? '').toLowerCase(),
    )
    // Some places omit a city. Take the next-to-last part of the formatted
    // address so city, and therefore Save, still have something to use.
    const parts = (place.formatted_address ?? '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
    const city =
      fields.city ||
      fields.region ||
      (parts.length > 1 ? parts[parts.length - 2] : '')
    setNewRecipient((current) => ({
      ...current,
      line1: fields.line1 || place.formatted_address || current.line1,
      line2: fields.line2,
      city,
      region: fields.region,
      postal_code: fields.postal_code,
      latitude: fields.latitude,
      longitude: fields.longitude,
      country_id: matched?.id || current.country_id || countryId,
    }))
  }

  async function handleCreateRecipient() {
    const name = newRecipient.name.trim()
    const addressCountry = newRecipient.country_id || countryId
    if (!name) {
      setError('Enter the recipient’s name.')
      return
    }
    const line1 = newRecipient.line1.trim()
    const city = newRecipient.city.trim() || newRecipient.region.trim()
    if (!addressCountry || !line1 || !city) {
      setError('Pick an address from the list so the street and city fill in.')
      return
    }
    setSavingRecipient(true)
    setError(null)
    try {
      const created = await createRecipient({
        name,
        phone: optionalString(newRecipient.phone) ?? null,
        addresses: [
          {
            country_id: addressCountry,
            label: optionalString(newRecipient.label) ?? null,
            address_type: optionalString(newRecipient.address_type) || 'shipping',
            line1,
            line2: optionalString(newRecipient.line2) ?? null,
            city,
            region: optionalString(newRecipient.region) ?? null,
            postal_code: optionalString(newRecipient.postal_code) ?? null,
            latitude: newRecipient.latitude,
            longitude: newRecipient.longitude,
            is_default: newRecipient.is_default,
          },
        ],
      })
      const details = created.addresses?.length ? created : await getRecipient(created.id)
      setRecipients((current) => [
        ...current.filter((recipient) => recipient.id !== details.id),
        details,
      ])
      setRecipientDetails(details)
      setRecipientId(details.id)
      setAddingRecipient(false)
      setNewRecipient(blankRecipient(countryId))
    } catch (err) {
      setError(getErrorMessage(err, 'Could not add this recipient.'))
    } finally {
      setSavingRecipient(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (blocker) return
    setError(null)
    setSubmitting(true)
    try {
      // The server adds up delivery from these per-shop quotes; the client
      // never sends its own delivery total.
      const shippingQuotes = selectionsToShippingQuotes(chargeableSelections)

      const order = await createOrder({
        ...(recipientId ? { recipient_id: recipientId } : {}),
        country_id: countryId,
        customer_type: customerType,
        delivery_date: deliveryDate,
        ...(giftMessage.trim() ? { gift_message: giftMessage.trim() } : {}),
        ...(shippingQuotes.length ? { shipping_quotes: shippingQuotes } : {}),
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
                  Pick someone you have saved, or add them here.
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Need someone new? Add them here, or{' '}
                  <Link
                    to="/account/recipients"
                    className="font-medium text-primary hover:underline"
                  >
                    manage recipients
                  </Link>
                  .
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-full"
                  onClick={() =>
                    addingRecipient ? setAddingRecipient(false) : openAddRecipient()
                  }
                >
                  <Plus className="size-3.5" />
                  {addingRecipient ? 'Close' : 'Add recipient'}
                </Button>
              </div>

              {addingRecipient ? (
                <div
                  className="space-y-3 rounded-xl border border-border/60 bg-surface/60 p-4"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.preventDefault()
                  }}
                >
                  <p className="text-sm font-medium">New recipient</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="checkout-new-name">Name</Label>
                      <Input
                        id="checkout-new-name"
                        value={newRecipient.name}
                        onChange={(event) =>
                          setNewRecipient((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        className="h-11 bg-surface px-3"
                        placeholder="Jane Receiver"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkout-new-phone">Phone</Label>
                      <PhoneField
                        id="checkout-new-phone"
                        value={newRecipient.phone}
                        onChange={(phone) =>
                          setNewRecipient((current) => ({ ...current, phone }))
                        }
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="checkout-new-country">Country</Label>
                      <select
                        id="checkout-new-country"
                        value={newRecipient.country_id || countryId}
                        onChange={(event) =>
                          setNewRecipient((current) => ({
                            ...current,
                            country_id: event.target.value,
                          }))
                        }
                        className={selectClassName}
                      >
                        <option value="">Select country</option>
                        {countries.map((country) => (
                          <option key={country.id} value={country.id}>
                            {country.name} ({country.iso_code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkout-new-label">Label</Label>
                      <Input
                        id="checkout-new-label"
                        value={newRecipient.label}
                        onChange={(event) =>
                          setNewRecipient((current) => ({
                            ...current,
                            label: event.target.value,
                          }))
                        }
                        className="h-11 bg-surface px-3"
                        placeholder="Home"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkout-new-type">Address type</Label>
                      <Input
                        id="checkout-new-type"
                        value={newRecipient.address_type}
                        onChange={(event) =>
                          setNewRecipient((current) => ({
                            ...current,
                            address_type: event.target.value,
                          }))
                        }
                        className="h-11 bg-surface px-3"
                        placeholder="shipping"
                      />
                    </div>
                    <AddressAutocomplete
                      id="checkout-new-address-search"
                      className="sm:col-span-2"
                      countryCode={
                        countries.find(
                          (country) =>
                            country.id === (newRecipient.country_id || countryId),
                        )?.iso_code
                      }
                      onSelect={applyNewAddress}
                    />
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="checkout-new-line1">Line 1</Label>
                      <Input
                        id="checkout-new-line1"
                        value={newRecipient.line1}
                        onChange={(event) =>
                          setNewRecipient((current) => ({
                            ...current,
                            line1: event.target.value,
                          }))
                        }
                        className="h-11 bg-surface px-3"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="checkout-new-line2">Line 2</Label>
                      <Input
                        id="checkout-new-line2"
                        value={newRecipient.line2}
                        onChange={(event) =>
                          setNewRecipient((current) => ({
                            ...current,
                            line2: event.target.value,
                          }))
                        }
                        className="h-11 bg-surface px-3"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkout-new-city">City</Label>
                      <Input
                        id="checkout-new-city"
                        value={newRecipient.city}
                        onChange={(event) =>
                          setNewRecipient((current) => ({
                            ...current,
                            city: event.target.value,
                          }))
                        }
                        className="h-11 bg-surface px-3"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkout-new-region">Region</Label>
                      <Input
                        id="checkout-new-region"
                        value={newRecipient.region}
                        onChange={(event) =>
                          setNewRecipient((current) => ({
                            ...current,
                            region: event.target.value,
                          }))
                        }
                        className="h-11 bg-surface px-3"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkout-new-postal">Postal code</Label>
                      <Input
                        id="checkout-new-postal"
                        value={newRecipient.postal_code}
                        onChange={(event) =>
                          setNewRecipient((current) => ({
                            ...current,
                            postal_code: event.target.value,
                          }))
                        }
                        className="h-11 bg-surface px-3"
                      />
                    </div>
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <Checkbox
                        id="checkout-new-default"
                        checked={newRecipient.is_default}
                        onCheckedChange={(value) =>
                          setNewRecipient((current) => ({
                            ...current,
                            is_default: value === true,
                          }))
                        }
                      />
                      <Label htmlFor="checkout-new-default" className="font-normal">
                        Default address
                      </Label>
                    </div>
                  </div>
                  <Button
                    type="button"
                    className="h-10 rounded-full"
                    disabled={savingRecipient}
                    onClick={() => void handleCreateRecipient()}
                  >
                    {savingRecipient ? (
                      <>
                        <LoaderCircle className="animate-spin" />
                        Saving…
                      </>
                    ) : (
                      'Create recipient'
                    )}
                  </Button>
                </div>
              ) : null}

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
                            <span>{formatStreetAddress(address, countryName)}</span>
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

              {intent?.address ? (
                <div className="space-y-2 sm:col-span-2">
                  <p className="rounded-xl border border-border/60 bg-surface px-3 py-2 text-xs text-muted-foreground">
                    You asked to send this to{' '}
                    <span className="font-medium text-foreground">
                      {describeIntent(intent)}
                    </span>
                    . Pick the recipient whose address matches — theirs is
                    where it will actually go.
                  </p>
                </div>
              ) : null}

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

          {recipientId ? (
            <section className={cn(customerPanelClass, 'space-y-4 p-5 sm:p-6')}>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <Truck className="size-4" />
                </span>
                <div>
                  <h2 className="font-medium">Delivery options</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Shop delivery is priced from each shop's zones. The price updates the total.
                  </p>
                </div>
              </div>

              {quoteLoading ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LoaderCircle className="size-3.5 animate-spin" />
                  Pricing shop delivery…
                </p>
              ) : quote?.shops?.length ? (
                <div className="space-y-5">
                  {quote.shops.map((shop) => {
                    const toAddress = recipientDetails
                      ? defaultAddress(recipientDetails)
                      : null
                    const toCountry = toAddress
                      ? countries.find((country) => country.id === toAddress.country_id)?.name
                      : undefined
                    return (
                    <div key={shop.shop_id} className="space-y-2">
                      <p className="text-sm font-medium">{shop.shop_name}</p>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {shop.from ? (
                          <p className="flex items-start gap-1.5">
                            <MapPin className="mt-0.5 size-3.5 shrink-0" />
                            <span>
                              <span className="font-medium text-foreground">From </span>
                              {formatStreetAddress(shop.from, shop.from.country)}
                            </span>
                          </p>
                        ) : null}
                        {toAddress ? (
                          <p className="flex items-start gap-1.5">
                            <MapPin className="mt-0.5 size-3.5 shrink-0" />
                            <span>
                              <span className="font-medium text-foreground">To </span>
                              {formatStreetAddress(toAddress, toCountry)}
                            </span>
                          </p>
                        ) : null}
                      </div>
                      <ul className="space-y-2">
                        {shop.seller_delivery?.available ? (
                          <li>
                            <button
                              type="button"
                              onClick={() =>
                                setQuoteSelections((current) => ({
                                  ...current,
                                  [shop.shop_id]: sellerDeliveryChoice(
                                    shop.seller_delivery!,
                                  ),
                                }))
                              }
                              className={cn(
                                'flex w-full items-start justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                                quoteSelections[shop.shop_id]?.mode === 'seller_delivery'
                                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                  : 'border-border/50 hover:border-border hover:bg-muted/40',
                              )}
                            >
                              <div className="min-w-0">
                                <p className="flex items-center gap-1.5 font-medium">
                                  <Bike className="size-3.5 shrink-0" />
                                  Shop delivery
                                </p>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                  The shop delivers this address
                                  {shop.seller_delivery.distance_km != null
                                    ? ` · ${shop.seller_delivery.distance_km} km`
                                    : ''}
                                  {shop.seller_delivery.max_km != null
                                    ? ` · up to ${shop.seller_delivery.max_km} km`
                                    : ''}
                                  {shop.seller_delivery.estimated_days != null
                                    ? ` · ${shop.seller_delivery.estimated_days} day${shop.seller_delivery.estimated_days === 1 ? '' : 's'}`
                                    : ''}
                                </p>
                              </div>
                              <p className="shrink-0 font-medium">
                                {shop.seller_delivery.is_free ||
                                shop.seller_delivery.price_amount === 0
                                  ? 'Free'
                                  : formatPriceAmount(
                                      shop.seller_delivery.price_amount,
                                      shop.seller_delivery.currency,
                                    )}
                              </p>
                            </button>
                          </li>
                        ) : shop.seller_delivery && !shop.seller_delivery.available ? (
                          <li className="rounded-xl border border-dashed border-border/60 px-4 py-3 text-sm text-muted-foreground">
                            Shop delivery is not available
                            {shop.seller_delivery.reason
                              ? ` — ${shop.seller_delivery.reason}`
                              : shop.seller_delivery.distance_km != null
                                ? ` (${shop.seller_delivery.distance_km} km is outside the shop zones)`
                                : '.'}
                          </li>
                        ) : null}
                      </ul>
                    </div>
                    )
                  })}
                </div>
              ) : quote?.complete ? (
                <p className="text-sm text-muted-foreground">
                  Delivery is priced from the shop's zones.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Shop delivery appears once this address can be priced.
                </p>
              )}
            </section>
          ) : null}
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

            {quote?.shops?.map((shop) =>
              shop.from ? (
                <div key={`${shop.shop_id}-from`} className="flex justify-between gap-4 text-xs">
                  <dt className="text-muted-foreground">From</dt>
                  <dd className="max-w-[14rem] text-right">
                    {formatStreetAddress(shop.from, shop.from.country)}
                  </dd>
                </div>
              ) : null,
            )}

            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Delivery</dt>
              <dd className={hasPricedDelivery ? 'text-right' : 'text-muted-foreground'}>
                {quoteLoading || awaitingDeliveryQuote ? (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <LoaderCircle className="size-3 animate-spin" />
                    Pricing…
                  </span>
                ) : hasPricedDelivery ? (
                  <>
                    {formatPriceAmount(selectedDeliveryAmount, deliveryCurrency)}
                  </>
                ) : !recipientId ? (
                  'Pick a recipient'
                ) : (
                  'Not available'
                )}
              </dd>
            </div>

            {Object.entries(quoteSelections).map(([shopId, choice]) => {
              const shopName =
                quote?.shops?.find((shop) => shop.shop_id === shopId)?.shop_name ||
                quote?.shipments.find((shipment) => shipment.shop_id === shopId)
                  ?.shop_name ||
                'Shop'
              const label = `Shop delivery${choice.distance_km != null ? ` · ${choice.distance_km} km` : ''}`
              return (
                <div
                  key={shopId}
                  className="flex justify-between gap-4 text-xs text-muted-foreground"
                >
                  <dt className="flex min-w-0 items-start gap-1.5">
                    <Truck className="mt-0.5 size-3 shrink-0" />
                    <span className="min-w-0 truncate">
                      {shopName} · {label}
                    </span>
                  </dt>
                  <dd className="shrink-0">
                    {choice.is_free
                      ? 'Free'
                      : formatPriceAmount(choice.amount, choice.currency)}
                    {sameCurrency(choice.currency, currency) ? null : ' · not added'}
                  </dd>
                </div>
              )
            })}

            <div className="flex justify-between gap-4 border-t border-border/60 pt-3 text-base font-medium">
              <dt>Total</dt>
              <dd className="text-right">
                {hasPricedDelivery
                  ? formatPriceAmount(
                      majorToMinor(subtotal, currency) + selectedDeliveryAmount,
                      currency,
                    )
                  : money(subtotal)}
              </dd>
            </div>
          </dl>

          {otherCurrencySelections > 0 ? (
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Delivery is quoted in a different currency from this {currency.toUpperCase()}{' '}
              cart, so it cannot be added and this order cannot be placed.
            </p>
          ) : null}

          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Line prices are confirmed by the seller when the order is created, so the
            final total may differ. Payment is not captured yet — new orders stay
            awaiting payment.
          </p>
          <Button
            type="submit"
            disabled={submitting || Boolean(blocker) || awaitingDeliveryQuote}
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
