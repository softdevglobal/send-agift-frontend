import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, LoaderCircle, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { registerCustomer, type AddressInput } from '@/api/customers'
import { addressFieldsFromPlace, type PlaceDetails } from '@/api/places'
import { FormAlert } from '@/components/common/form-alert'
import { AddressAutocomplete } from '@/components/common/place-autocomplete'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { CountrySelectField } from '@/features/auth/country-select-field'
import { PhoneField } from '@/features/auth/phone-field'
import {
  customerStatusLabel,
  customerTypes,
  type CustomerStatus,
} from '@/features/auth/customer-register-options'
import { getErrorMessage, ApiError } from '@/lib/api'
import { optionalString } from '@/lib/form'
import { selectClassName } from '@/lib/form-styles'
import { cn } from '@/lib/utils'

const statusTone: Record<CustomerStatus, string> = {
  pending: 'bg-accent text-accent-foreground ring-primary/20',
  active: 'bg-primary/10 text-primary ring-primary/25',
  inactive: 'bg-muted text-muted-foreground ring-border/60',
  suspended: 'bg-destructive/10 text-destructive ring-destructive/25',
}

function asCustomerStatus(value: string): CustomerStatus {
  if (value in statusTone) return value as CustomerStatus
  return 'pending'
}

export function CustomerRegisterForm() {
  const navigate = useNavigate()
  const [countryId, setCountryId] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [customerType, setCustomerType] = useState('individual')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [line1, setLine1] = useState('')
  const [line2, setLine2] = useState('')
  const [city, setCity] = useState('')
  const [region, setRegion] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [countryCode, setCountryCode] = useState<string | undefined>(undefined)
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blockedByCountry, setBlockedByCountry] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<CustomerStatus>('pending')

  const registrationBlocked = Boolean(countryId && blockedByCountry[countryId])

  /** Fills the address fields from a Google place, including its coordinates. */
  function applyPlace(place: PlaceDetails) {
    const fields = addressFieldsFromPlace(place)
    setLine1(fields.line1)
    setLine2(fields.line2)
    setCity(fields.city)
    setRegion(fields.region)
    setPostalCode(fields.postal_code)
    setLatitude(fields.latitude)
    setLongitude(fields.longitude)
  }

  function handleCountryChange(id: string) {
    setCountryId(id)
    setError(blockedByCountry[id] ?? null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!countryId) {
      setError('Please select a country.')
      return
    }

    if (registrationBlocked) {
      setError(blockedByCountry[countryId])
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Create password and confirm password must match.')
      return
    }

    const hasAddress = Boolean(line1.trim() || city.trim())
    if (hasAddress && (!line1.trim() || !city.trim())) {
      setError('Address needs both street line and city.')
      return
    }

    const addresses: AddressInput[] | undefined = hasAddress
      ? [
          {
            country_id: countryId,
            line1: line1.trim(),
            city: city.trim(),
            line2: optionalString(line2),
            region: optionalString(region),
            postal_code: optionalString(postalCode),
            latitude,
            longitude,
            is_default: true,
          },
        ]
      : undefined

    setIsSubmitting(true)

    try {
      const created = await registerCustomer({
        country_id: countryId,
        email: email.trim(),
        password,
        customer_type: customerType || 'individual',
        date_of_birth: optionalString(dateOfBirth),
        phone: optionalString(phone),
        display_name: optionalString(displayName),
        image_url: optionalString(imageUrl),
        addresses,
      })
      setStatus(asCustomerStatus(created.status))
      navigate('/login?registered=1', { replace: true })
    } catch (err) {
      const message = getErrorMessage(err, 'Registration failed.')
      setError(message)
      if (err instanceof ApiError && err.status === 403 && countryId) {
        setBlockedByCountry((current) => ({ ...current, [countryId]: message }))
      }
    } finally {
      setIsSubmitting(false)
    }
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
          statusTone[status],
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
        <CountrySelectField
          id="customer-country"
          value={countryId}
          onChange={handleCountryChange}
          onCountrySelected={(country) => setCountryCode(country?.iso_code)}
          disabled={isSubmitting}
        />

        <div className="space-y-2">
          <Label htmlFor="customer-type">Customer type</Label>
          <select
            id="customer-type"
            value={customerType}
            onChange={(event) => setCustomerType(event.target.value)}
            className={selectClassName}
            required
            disabled={isSubmitting}
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
            disabled={isSubmitting}
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
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer-phone">Phone</Label>
          <PhoneField
            id="customer-phone"
            value={phone}
            onChange={setPhone}
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer-dob">Date of birth</Label>
          <Input
            id="customer-dob"
            type="date"
            autoComplete="bday"
            value={dateOfBirth}
            onChange={(event) => setDateOfBirth(event.target.value)}
            className="h-11 bg-surface px-3"
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer-image">Image URL</Label>
          <Input
            id="customer-image"
            type="url"
            placeholder="https://"
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            className="h-11 bg-surface px-3"
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer-create-password">Create password</Label>
          <div className="relative">
            <Input
              id="customer-create-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 bg-surface px-3 pr-11"
              required
              minLength={8}
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute top-1/2 right-2.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer-confirm-password">Confirm password</Label>
          <Input
            id="customer-confirm-password"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="h-11 bg-surface px-3"
            required
            minLength={8}
            disabled={isSubmitting}
          />
        </div>

        <AddressAutocomplete
          id="customer-address-search"
          countryCode={countryCode}
          disabled={isSubmitting}
          helperText="Optional — pick a result to fill the address fields below."
          onSelect={applyPlace}
        />

        <div className="space-y-2">
          <Label htmlFor="customer-address">Address</Label>
          <Input
            id="customer-address"
            type="text"
            autoComplete="address-line1"
            placeholder="Street address (optional)"
            value={line1}
            onChange={(event) => setLine1(event.target.value)}
            className="h-11 bg-surface px-3"
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer-address-2">Address line 2</Label>
          <Input
            id="customer-address-2"
            type="text"
            autoComplete="address-line2"
            placeholder="Apartment, suite (optional)"
            value={line2}
            onChange={(event) => setLine2(event.target.value)}
            className="h-11 bg-surface px-3"
            disabled={isSubmitting}
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
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
            disabled={isSubmitting}
          />
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting || registrationBlocked}
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

      <FormAlert error={error} />

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>

        <Button
          asChild
          variant="outline"
          size="lg"
          className="h-11 w-full text-sm"
        >
          <Link to="/seller/register">Create a seller account</Link>
        </Button>

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
