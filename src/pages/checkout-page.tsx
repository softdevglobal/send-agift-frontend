import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { listCountries, type Country } from '@/api/countries'
import { getCustomerMe, listRecipients, type Recipient } from '@/api/customers'
import { createOrder } from '@/api/orders'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CustomerPageHeader, customerPanelClass, useCart } from '@/features/customer-commerce'
import { toDateInputValue } from '@/features/customer-commerce/order-display'
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

function recipientLabel(recipient: Recipient) {
  return recipient.relationship
    ? `${recipient.name} · ${recipient.relationship}`
    : recipient.name
}

export function CheckoutPage() {
  const navigate = useNavigate()
  const { lines, subtotal, shipping, clearCart } = useCart()

  const [countries, setCountries] = useState<Country[]>([])
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [placed, setPlaced] = useState(false)

  const [recipientId, setRecipientId] = useState('')
  const [countryId, setCountryId] = useState('')
  const [customerType, setCustomerType] = useState('personal')
  const [deliveryDate, setDeliveryDate] = useState(tomorrow)
  const [giftMessage, setGiftMessage] = useState('')

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
        if (me.customer_type === 'personal' || me.customer_type === 'corporate') {
          setCustomerType(me.customer_type)
        }
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
  }, [])

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

  const money = (major: number) => formatPriceAmount(majorToMinor(major, currency), currency)

  const blocker = unorderable.length
    ? 'Your cart holds sample products that are not published by a seller. Remove them to check out.'
    : mixedCurrency
      ? 'All items in one order must share the same currency. Split your cart and order separately.'
      : null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (blocker) return
    setError(null)
    setSubmitting(true)
    try {
      const order = await createOrder({
        recipient_id: recipientId || null,
        country_id: countryId,
        customer_type: customerType,
        delivery_date: deliveryDate,
        gift_message: giftMessage.trim() || null,
        delivery_amount: majorToMinor(shipping, currency),
        items: lines.map((line) => ({
          product_id: line.product.id,
          quantity: line.quantity,
        })),
      })
      setPlaced(true)
      clearCart()
      navigate(`/checkout/result?orderId=${encodeURIComponent(order.id)}`, {
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
        description="Confirm who this gift is for and when it should arrive. The order is created awaiting payment."
      />

      <FormAlert error={error ?? blocker} className="mb-5" />

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,1fr)]"
      >
        <div className="space-y-6">
          <section className={cn(customerPanelClass, 'space-y-4 p-5 sm:p-6')}>
            <div>
              <h2 className="font-medium">Recipient</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick someone from your saved recipients, or send the gift to yourself.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkout-recipient">Send to</Label>
              <select
                id="checkout-recipient"
                value={recipientId}
                onChange={(event) => setRecipientId(event.target.value)}
                className={selectClassName}
              >
                <option value="">Myself</option>
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
            </div>
          </section>

          <section className={cn(customerPanelClass, 'space-y-4 p-5 sm:p-6')}>
            <h2 className="font-medium">Delivery</h2>

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
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="checkout-customer-type">Order type</Label>
                <select
                  id="checkout-customer-type"
                  value={customerType}
                  onChange={(event) => setCustomerType(event.target.value)}
                  className={selectClassName}
                >
                  <option value="personal">Personal</option>
                  <option value="corporate">Corporate</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Some products are only sold to personal or corporate buyers.
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

        <aside className={cn(customerPanelClass, 'h-fit p-5')}>
          <h2 className="font-medium">Review</h2>
          <ul className="mt-4 space-y-3">
            {lines.map((line) => (
              <li key={line.product.id} className="flex justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{line.product.name}</span>
                  <span className="text-muted-foreground">Qty {line.quantity}</span>
                </span>
                <span>{money(line.lineTotal)}</span>
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
              <dd>{shipping === 0 ? 'Free' : money(shipping)}</dd>
            </div>
            <div className="flex justify-between gap-4 font-medium">
              <dt>Total</dt>
              <dd>{money(subtotal + shipping)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Line prices are confirmed by the seller when the order is created, so the
            final total may differ slightly.
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
