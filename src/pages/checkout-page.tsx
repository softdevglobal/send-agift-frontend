import { useEffect, useState, type FormEvent } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { getCustomerMe, type CustomerAddress } from '@/api/customers'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  CustomerPageHeader,
  customerPanelClass,
  formatMoney,
  saveOrder,
  useCart,
} from '@/features/customer-commerce'
import type {
  PaymentMethod,
  PaymentStatus,
} from '@/features/customer-commerce/types'
import { createOrderId } from '@/features/customer-commerce/utils'
import { optionalString } from '@/lib/form'
import { cn } from '@/lib/utils'

const paymentOptions: {
  id: PaymentMethod
  label: string
  hint: string
}[] = [
  {
    id: 'card',
    label: 'Card (demo)',
    hint: 'No card number is collected or stored.',
  },
  {
    id: 'wallet',
    label: 'Digital wallet (demo)',
    hint: 'Simulates an approved wallet charge.',
  },
  {
    id: 'cod',
    label: 'Pay on delivery',
    hint: 'Pay when the gift arrives.',
  },
]

function addressLabel(address: CustomerAddress) {
  return [address.line1, address.city, address.region, address.postal_code]
    .filter(Boolean)
    .join(', ')
}

export function CheckoutPage() {
  const navigate = useNavigate()
  const { lines, subtotal, shipping, total, clearCart } = useCart()
  const [addresses, setAddresses] = useState<CustomerAddress[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [placed, setPlaced] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [line1, setLine1] = useState('')
  const [line2, setLine2] = useState('')
  const [city, setCity] = useState('')
  const [region, setRegion] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [note, setNote] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card')

  useEffect(() => {
    let cancelled = false
    getCustomerMe()
      .then((me) => {
        if (cancelled) return
        setEmail((current) => current || me.email)
        setName((current) => current || me.display_name || '')
        setPhone((current) => current || me.phone || '')
        const list = me.addresses ?? []
        setAddresses(list)
        const preferred =
          list.find((item) => item.is_default) ?? list[0] ?? null
        if (preferred) {
          setLine1((current) => current || preferred.line1)
          setLine2((current) => current || preferred.line2 || '')
          setCity((current) => current || preferred.city)
          setRegion((current) => current || preferred.region || '')
          setPostalCode((current) => current || preferred.postal_code || '')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Could not load saved addresses. You can still enter delivery details.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (placed) {
    return (
      <div className="flex justify-center py-24">
        <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!lines.length) {
    return <Navigate to="/customer/cart" replace />
  }

  function applyAddress(address: CustomerAddress) {
    setLine1(address.line1)
    setLine2(address.line2 ?? '')
    setCity(address.city)
    setRegion(address.region ?? '')
    setPostalCode(address.postal_code ?? '')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const paymentStatus: PaymentStatus =
      paymentMethod === 'cod' ? 'pay_on_delivery' : 'demo_paid'

    const order = saveOrder({
      id: createOrderId(),
      createdAt: new Date().toISOString(),
      status: 'processing',
      paymentStatus,
      paymentMethod,
      items: lines.map((line) => ({
        productId: line.product.id,
        name: line.product.name,
        price: line.product.price,
        quantity: line.quantity,
        image: line.product.image,
      })),
      subtotal,
      shipping,
      total,
      recipient: {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        line1: line1.trim(),
        line2: optionalString(line2),
        city: city.trim(),
        region: optionalString(region),
        postalCode: optionalString(postalCode),
        note: optionalString(note),
      },
    })

    setPlaced(true)
    clearCart()
    navigate(`/customer/checkout/result?orderId=${encodeURIComponent(order.id)}`, {
      replace: true,
    })
  }

  return (
    <div>
      <CustomerPageHeader
        title="Checkout"
        description="Confirm delivery details and complete a demo payment. No payment provider is charged."
      />

      <FormAlert error={error} className="mb-5" />

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,1fr)]"
      >
        <div className="space-y-6">
          <section className={cn(customerPanelClass, 'space-y-4 p-5 sm:p-6')}>
            <h2 className="font-medium">Delivery</h2>
            {addresses.length ? (
              <div className="space-y-2">
                <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  Saved addresses
                </p>
                <div className="flex flex-wrap gap-2">
                  {addresses.map((address) => (
                    <Button
                      key={address.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-auto max-w-full rounded-full px-3 py-1.5 text-left text-xs"
                      onClick={() => applyAddress(address)}
                    >
                      {address.label || 'Address'} · {addressLabel(address)}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="checkout-name">Recipient name</Label>
                <Input
                  id="checkout-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-11 bg-surface px-3"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkout-email">Email</Label>
                <Input
                  id="checkout-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 bg-surface px-3"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkout-phone">Phone</Label>
                <Input
                  id="checkout-phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="h-11 bg-surface px-3"
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="checkout-line1">Address line 1</Label>
                <Input
                  id="checkout-line1"
                  value={line1}
                  onChange={(event) => setLine1(event.target.value)}
                  className="h-11 bg-surface px-3"
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="checkout-line2">Address line 2</Label>
                <Input
                  id="checkout-line2"
                  value={line2}
                  onChange={(event) => setLine2(event.target.value)}
                  className="h-11 bg-surface px-3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkout-city">City</Label>
                <Input
                  id="checkout-city"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  className="h-11 bg-surface px-3"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkout-region">Region</Label>
                <Input
                  id="checkout-region"
                  value={region}
                  onChange={(event) => setRegion(event.target.value)}
                  className="h-11 bg-surface px-3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkout-postal">Postal code</Label>
                <Input
                  id="checkout-postal"
                  value={postalCode}
                  onChange={(event) => setPostalCode(event.target.value)}
                  className="h-11 bg-surface px-3"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="checkout-note">Gift note (optional)</Label>
                <Input
                  id="checkout-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="h-11 bg-surface px-3"
                  placeholder="Happy birthday — thinking of you"
                />
              </div>
            </div>
          </section>

          <section className={cn(customerPanelClass, 'space-y-4 p-5 sm:p-6')}>
            <div>
              <h2 className="font-medium">Payment</h2>
              <p className="mt-1 rounded-lg bg-accent/70 px-3 py-2 text-sm text-accent-foreground">
                Demo checkout only. SendAgift does not contact a payment processor
                or save payment credentials.
              </p>
            </div>
            <fieldset className="space-y-2">
              <legend className="sr-only">Payment method</legend>
              {paymentOptions.map((option) => (
                <label
                  key={option.id}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-sm',
                    paymentMethod === option.id
                      ? 'border-primary bg-accent/60'
                      : 'border-border/60 hover:bg-muted/40',
                  )}
                >
                  <input
                    type="radio"
                    name="payment-method"
                    value={option.id}
                    checked={paymentMethod === option.id}
                    onChange={() => setPaymentMethod(option.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium">{option.label}</span>
                    <span className="mt-0.5 block text-muted-foreground">
                      {option.hint}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
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
                <span>{formatMoney(line.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-border/60 pt-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatMoney(subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd>{shipping === 0 ? 'Free' : formatMoney(shipping)}</dd>
            </div>
            <div className="flex justify-between gap-4 font-medium">
              <dt>Total</dt>
              <dd>{formatMoney(total)}</dd>
            </div>
          </dl>
          <Button
            type="submit"
            disabled={submitting}
            className="mt-5 h-11 w-full rounded-full"
          >
            {submitting ? (
              <>
                <LoaderCircle className="animate-spin" />
                Placing order…
              </>
            ) : (
              'Place demo order'
            )}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Or{' '}
            <Link to="/customer/cart" className="font-medium text-primary hover:underline">
              return to cart
            </Link>
          </p>
        </aside>
      </form>
    </div>
  )
}
