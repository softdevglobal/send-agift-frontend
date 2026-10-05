import { useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowRight,
  Briefcase,
  Building2,
  Check,
  Eye,
  EyeOff,
  Handshake,
  LoaderCircle,
  Lock,
  Mail,
  MapPin,
  Sparkles,
  Star,
  Store,
  User,
  Video,
  type LucideIcon,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { addressFieldsFromPlace, type PlaceDetails } from '@/api/places'
import { registerSeller } from '@/api/sellers'
import { FormAlert } from '@/components/common/form-alert'
import { AddressAutocomplete } from '@/components/common/place-autocomplete'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CountrySelectField } from '@/features/auth/country-select-field'
import { PasswordStrengthMeter } from '@/features/auth/password-strength'
import { PhoneField } from '@/features/auth/phone-field'
import { sellerTypes } from '@/features/auth/seller-register-options'
import { ApiError, getErrorMessage } from '@/lib/api'
import { optionalString } from '@/lib/form'
import { cn } from '@/lib/utils'

const typeCards: Record<string, { hint: string; icon: LucideIcon }> = {
  individual: { hint: 'Sole trader', icon: User },
  company: { hint: 'Registered business', icon: Building2 },
  partnership: { hint: 'Two or more owners', icon: Handshake },
  brand: { hint: 'Marketplace brand', icon: Briefcase },
}

const typeShortLabel: Record<string, string> = {
  individual: 'Individual',
  company: 'Company',
  partnership: 'Partnership',
  brand: 'Brand',
}

const perks: { icon: LucideIcon; label: string }[] = [
  { icon: Store, label: 'Your own shop' },
  { icon: Video, label: 'Reels' },
  { icon: Star, label: 'Reviews' },
]

const steps = [
  { label: 'Your details', state: 'current' },
  { label: 'Confirm email', state: 'todo' },
  { label: 'Admin review', state: 'todo' },
] as const

/**
 * Seller sign-up, in four short sections. After it, the seller confirms their
 * email with a code, then waits for an admin to approve the account.
 */
export function SellerRegisterForm() {
  const navigate = useNavigate()
  const [countryId, setCountryId] = useState('')
  const [sellerType, setSellerType] = useState('individual')
  const [legalName, setLegalName] = useState('')
  const [tradingName, setTradingName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [countryCode, setCountryCode] = useState<string | undefined>(undefined)
  const [line1, setLine1] = useState('')
  const [line2, setLine2] = useState('')
  const [city, setCity] = useState('')
  const [region, setRegion] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailTaken, setEmailTaken] = useState(false)
  const [blockedByCountry, setBlockedByCountry] = useState<Record<string, string>>({})

  const registrationBlocked = Boolean(countryId && blockedByCountry[countryId])
  const matches = confirmPassword.length > 0 && confirmPassword === password

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
    setEmailTaken(false)

    const trimmedEmail = email.trim()
    if (!legalName.trim()) return setError('Enter your registered legal name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) return setError('Enter a valid email.')
    if (!countryId) return setError('Please select a country.')
    if (registrationBlocked) return setError(blockedByCountry[countryId])
    if (password.length < 8) return setError('Your password needs at least 8 characters.')
    if (password !== confirmPassword) return setError('The passwords don’t match.')

    const hasAddress = Boolean(line1.trim() || city.trim())
    if (hasAddress && (!line1.trim() || !city.trim())) {
      return setError('Address needs both a street line and a city.')
    }

    setIsSubmitting(true)
    try {
      const created = await registerSeller({
        country_id: countryId,
        seller_type: sellerType || 'individual',
        legal_name: legalName.trim(),
        email: trimmedEmail,
        password,
        trading_name: optionalString(tradingName),
        phone: optionalString(phone),
        addresses: hasAddress
          ? [
              {
                country_id: countryId,
                // One address serves as both the pickup and the return address.
                address_type: 'both',
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
          : undefined,
      })
      navigate(`/seller/verify-email?email=${encodeURIComponent(created.email)}`, { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setEmailTaken(true)
        setIsSubmitting(false)
        return
      }
      const message = getErrorMessage(err, 'Registration failed.')
      setError(message)
      if (err instanceof ApiError && err.status === 403 && countryId) {
        setBlockedByCountry((current) => ({ ...current, [countryId]: message }))
      }
      setIsSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="animate-fade-up mx-auto w-full max-w-[32rem] min-w-0 space-y-8"
      style={{ animationDelay: '120ms' }}
      noValidate
    >
      <div className="space-y-4">
        <h2 className="font-display text-3xl leading-[1.05] tracking-tight text-foreground sm:text-4xl">
          Open your{' '}
          <span className="bg-gradient-to-r from-primary via-fuchsia-600 to-pink-500 bg-clip-text text-transparent">
            shop
          </span>
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Tell us about your business and we&apos;ll get you set up. It takes a few minutes, then
          our team reviews your account.
        </p>
        <ul className="grid grid-cols-3 gap-2">
          {perks.map((perk) => (
            <li
              key={perk.label}
              className="flex min-w-0 items-center justify-center gap-1.5 rounded-full bg-card px-2 py-1.5 text-xs whitespace-nowrap text-muted-foreground ring-1 ring-border/60"
            >
              <perk.icon className="size-3.5 shrink-0 text-primary" />
              {perk.label}
            </li>
          ))}
        </ul>
        <ol className="flex items-center gap-2 pt-1" aria-label="Sign-up progress">
          {steps.map((step, i) => (
            <li key={step.label} className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ring-1',
                  step.state === 'current'
                    ? 'bg-primary text-primary-foreground ring-primary'
                    : 'bg-background text-muted-foreground ring-border',
                )}
              >
                {i + 1}
              </span>
              <span
                className={cn(
                  'hidden text-xs font-medium sm:inline',
                  step.state === 'todo' ? 'text-muted-foreground' : 'text-foreground',
                )}
              >
                {step.label}
              </span>
              {i < steps.length - 1 ? <span className="h-px flex-1 bg-border" /> : null}
            </li>
          ))}
        </ol>
      </div>

      <Section n={1} title="About your business">
        <fieldset className="space-y-2.5" disabled={isSubmitting}>
          <legend className="mb-2.5 text-sm font-medium">I sell as</legend>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {sellerTypes.map((option) => {
              const card = typeCards[option.value]
              const Icon = card?.icon ?? Store
              const active = sellerType === option.value
              return (
                <label
                  key={option.value}
                  className={cn(
                    'flex cursor-pointer flex-col items-start gap-2 rounded-2xl p-3 ring-1 transition-all',
                    active
                      ? 'bg-primary/[0.06] shadow-[0_8px_24px_-12px] shadow-primary/50 ring-2 ring-primary'
                      : 'bg-card ring-border/70 hover:-translate-y-0.5 hover:ring-primary/40',
                  )}
                >
                  <input
                    type="radio"
                    name="seller-type"
                    value={option.value}
                    checked={active}
                    onChange={() => setSellerType(option.value)}
                    className="sr-only"
                  />
                  <span
                    className={cn(
                      'flex size-9 items-center justify-center rounded-xl transition-colors',
                      active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    <Icon className="size-4.5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">
                      {typeShortLabel[option.value] ?? option.label}
                    </span>
                    <span className="block text-[11px] leading-tight text-muted-foreground">
                      {card?.hint}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <Field id="seller-legal-name" label="Legal name">
          <IconInput icon={Building2}>
            <Input
              id="seller-legal-name"
              autoComplete="organization"
              placeholder="Registered legal name"
              value={legalName}
              onChange={(event) => setLegalName(event.target.value)}
              className="h-12 bg-surface pl-10"
              disabled={isSubmitting}
            />
          </IconInput>
        </Field>

        <Field id="seller-trading-name" label="Shop name" optional hint="What customers see">
          <IconInput icon={Store}>
            <Input
              id="seller-trading-name"
              autoComplete="organization"
              placeholder="Your public shop or trading name"
              value={tradingName}
              onChange={(event) => setTradingName(event.target.value)}
              className="h-12 bg-surface pl-10"
              disabled={isSubmitting}
            />
          </IconInput>
        </Field>
      </Section>

      <Section n={2} title="How we reach you">
        <Field id="seller-register-email" label="Email">
          <IconInput icon={Mail}>
            <Input
              id="seller-register-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setEmailTaken(false)
              }}
              className={cn('h-12 bg-surface pl-10', emailTaken && 'ring-2 ring-amber-400')}
              disabled={isSubmitting}
            />
          </IconInput>
        </Field>

        <CountrySelectField
          id="seller-country"
          value={countryId}
          onChange={handleCountryChange}
          onCountrySelected={(country) => setCountryCode(country?.iso_code)}
          disabled={isSubmitting}
        />

        <Field id="seller-phone" label="Phone number" optional>
          <PhoneField id="seller-phone" value={phone} onChange={setPhone} disabled={isSubmitting} />
        </Field>
      </Section>

      <Section n={3} title="Your address" note="Optional — you can add it later">
        <AddressAutocomplete
          id="seller-address-search"
          countryCode={countryCode}
          disabled={isSubmitting}
          helperText="Pick a result to fill the address below."
          onSelect={applyPlace}
        />

        <Field id="seller-address" label="Street address">
          <IconInput icon={MapPin}>
            <Input
              id="seller-address"
              autoComplete="address-line1"
              placeholder="Street address"
              value={line1}
              onChange={(event) => setLine1(event.target.value)}
              className="h-12 bg-surface pl-10"
              disabled={isSubmitting}
            />
          </IconInput>
        </Field>

        <Field id="seller-address-2" label="Address line 2" optional>
          <Input
            id="seller-address-2"
            autoComplete="address-line2"
            placeholder="Apartment, suite"
            value={line2}
            onChange={(event) => setLine2(event.target.value)}
            className="h-12 bg-surface px-3"
            disabled={isSubmitting}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="seller-city" label="City">
            <Input
              id="seller-city"
              autoComplete="address-level2"
              placeholder="City"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="h-12 bg-surface px-3"
              disabled={isSubmitting}
            />
          </Field>
          <Field id="seller-region" label="Region">
            <Input
              id="seller-region"
              autoComplete="address-level1"
              placeholder="State / province"
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              className="h-12 bg-surface px-3"
              disabled={isSubmitting}
            />
          </Field>
        </div>

        <Field id="seller-postal-code" label="Postal code">
          <Input
            id="seller-postal-code"
            autoComplete="postal-code"
            placeholder="Postal / ZIP code"
            value={postalCode}
            onChange={(event) => setPostalCode(event.target.value)}
            className="h-12 bg-surface px-3"
            disabled={isSubmitting}
          />
        </Field>
      </Section>

      <Section n={4} title="Secure your account">
        <Field id="seller-create-password" label="Create a password">
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="seller-create-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 bg-surface pr-11 pl-10"
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute top-1/2 right-2.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <PasswordStrengthMeter password={password} />
        </Field>

        <Field id="seller-confirm-password" label="Confirm password">
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="seller-confirm-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Type it once more"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={cn(
                'h-12 bg-surface pr-11 pl-10',
                confirmPassword && !matches && 'ring-1 ring-destructive/40',
              )}
              disabled={isSubmitting}
            />
            {matches ? (
              <span className="absolute top-1/2 right-3 flex size-6 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Check className="size-3.5" />
              </span>
            ) : null}
          </div>
        </Field>
      </Section>

      {emailTaken ? (
        <div
          role="status"
          className="animate-fade-up overflow-hidden rounded-2xl bg-gradient-to-br from-accent to-pink-50 p-5 ring-1 ring-primary/20"
        >
          <div className="flex items-start gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-xl text-primary-foreground shadow-sm">
              👋
            </span>
            <div className="min-w-0">
              <p className="font-display text-xl leading-tight text-foreground">
                This email already has an account
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium break-all text-foreground">{email.trim()}</span> is
                already registered with SendAGift. Sign in to continue, or use a different email.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Button asChild className="h-10 rounded-full px-5">
              <Link to={`/seller/login?email=${encodeURIComponent(email.trim())}`}>
                Seller sign in
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full bg-background/70 px-5"
              onClick={() => {
                setEmailTaken(false)
                setEmail('')
              }}
            >
              Use a different email
            </Button>
          </div>
        </div>
      ) : null}

      <FormAlert error={error} />

      <div className="space-y-4">
        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting || registrationBlocked}
          className="group h-12 w-full rounded-full text-sm font-semibold"
        >
          {isSubmitting ? (
            <>
              <LoaderCircle className="animate-spin" />
              Creating your account…
            </>
          ) : (
            <>
              Create seller account
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" />
          Next: a 6-digit code to confirm your email, then our team reviews your account.
        </p>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Already registered?{' '}
        <Link to="/seller/login" className="font-medium text-primary hover:text-primary/80">
          Seller sign in
        </Link>
      </p>
    </form>
  )
}

/** A numbered group of fields. */
function Section({
  n,
  title,
  note,
  children,
}: {
  n: number
  title: string
  note?: string
  children: ReactNode
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary ring-1 ring-primary/20">
          {n}
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-xl leading-tight text-foreground">{title}</h3>
          {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
        </div>
        <span className="h-px flex-1 bg-border/70" />
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Field({
  id,
  label,
  optional,
  hint,
  children,
}: {
  id: string
  label: string
  optional?: boolean
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>
          {label}
          {optional ? <span className="ml-1 font-normal text-muted-foreground">(optional)</span> : null}
        </Label>
        {hint ? <span className="truncate text-[11px] text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
    </div>
  )
}

function IconInput({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
      {children}
    </div>
  )
}
