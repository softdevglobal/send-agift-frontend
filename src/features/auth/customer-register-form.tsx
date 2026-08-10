import { useState, type FormEvent } from 'react'
import { LoaderCircle, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  customerCountries,
  customerStatusLabel,
  customerTypes,
  type CustomerStatus,
} from '@/features/auth/customer-register-options'
import { cn } from '@/lib/utils'

const selectClassName =
  'h-11 w-full min-w-0 rounded-lg border border-input bg-surface px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

const statusTone: Record<CustomerStatus, string> = {
  pending: 'bg-accent text-accent-foreground ring-primary/20',
  active: 'bg-primary/10 text-primary ring-primary/25',
  inactive: 'bg-muted text-muted-foreground ring-border/60',
  suspended: 'bg-destructive/10 text-destructive ring-destructive/25',
}

export function CustomerRegisterForm() {
  const [country, setCountry] = useState('')
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [customerType, setCustomerType] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [region, setRegion] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [status, setStatus] = useState<CustomerStatus>('pending')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)

    if (!country || !customerType) {
      setError('Please select a country and customer type.')
      return
    }

    setIsSubmitting(true)

    // UI-only for now — backend registration will plug in later
    await new Promise((resolve) => setTimeout(resolve, 900))

    setIsSubmitting(false)
    setStatus('active')
    setNotice(
      'Customer account created. Your profile is active — no backend call was made.'
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="animate-fade-up mx-auto w-full max-w-[28rem] space-y-6"
      style={{ animationDelay: '120ms' }}
      noValidate
    >
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
          Customer registration
        </p>
        <h2 className="font-display text-3xl tracking-tight text-foreground">
          Create your customer account
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Add your country, contact details, and delivery address so gift
          checkout stays ready from day one.
        </p>
      </div>

      <div
        className={cn(
          'flex items-center justify-between gap-3 rounded-xl px-3.5 py-3 ring-1',
          statusTone[status]
        )}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2.5">
          <UserRound className="size-4 shrink-0" />
          <div>
            <p className="text-xs font-medium tracking-wide uppercase opacity-80">
              Status
            </p>
            <p className="text-sm font-medium">{customerStatusLabel[status]}</p>
          </div>
        </div>
        <span className="rounded-md bg-background/50 px-2 py-1 text-[11px] font-medium tracking-wide uppercase">
          {status}
        </span>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="customer-country">Country</Label>
            <select
              id="customer-country"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              className={selectClassName}
              required
            >
              <option value="" disabled>
                Select country
              </option>
              {customerCountries.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-type">Customer type</Label>
            <select
              id="customer-type"
              value={customerType}
              onChange={(event) => setCustomerType(event.target.value)}
              className={selectClassName}
              required
            >
              <option value="" disabled>
                Select customer type
              </option>
              {customerTypes.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer-display-name">Display name</Label>
          <Input
            id="customer-display-name"
            type="text"
            autoComplete="nickname"
            placeholder="How you appear on SendAgift"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="h-11 bg-surface px-3"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer-register-email">Email</Label>
          <Input
            id="customer-register-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-11 bg-surface px-3"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer-address">Address</Label>
          <Input
            id="customer-address"
            type="text"
            autoComplete="street-address"
            placeholder="Street address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            className="h-11 bg-surface px-3"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="customer-city">City</Label>
            <Input
              id="customer-city"
              type="text"
              autoComplete="address-level2"
              placeholder="City"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="h-11 bg-surface px-3"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-region">Region</Label>
            <Input
              id="customer-region"
              type="text"
              autoComplete="address-level1"
              placeholder="State / province"
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              className="h-11 bg-surface px-3"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer-postal-code">Postal code</Label>
          <Input
            id="customer-postal-code"
            type="text"
            autoComplete="postal-code"
            placeholder="Postal / ZIP code"
            value={postalCode}
            onChange={(event) => setPostalCode(event.target.value)}
            className="h-11 bg-surface px-3"
            required
          />
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="h-11 w-full text-sm"
      >
        {isSubmitting ? (
          <>
            <LoaderCircle className="animate-spin" />
            Creating account…
          </>
        ) : (
          'Create customer account'
        )}
      </Button>

      {error ? (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      {notice ? (
        <p
          role="status"
          className="rounded-lg bg-accent/70 px-3 py-2 text-sm text-accent-foreground"
        >
          {notice}
        </p>
      ) : null}

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Already registered?{' '}
          <Link
            to="/login"
            className="font-medium text-primary transition-colors hover:text-primary/80"
          >
            Customer sign in
          </Link>
        </p>
      </div>
    </form>
  )
}
