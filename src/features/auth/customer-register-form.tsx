import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowRight,
  Briefcase,
  Check,
  Eye,
  EyeOff,
  Heart,
  LoaderCircle,
  Mail,
  Sparkles,
  Star,
  Truck,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import { completeSocialSignup, type SocialSignInResult } from '@/api/auth'
import { loginCustomer, registerCustomer } from '@/api/customers'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/auth-context'
import { CountrySelectField } from '@/features/auth/country-select-field'
import { PasswordStrengthMeter } from '@/features/auth/password-strength'
import { PhoneField } from '@/features/auth/phone-field'
import { SocialDivider, SocialSignInButtons } from '@/features/auth/social-sign-in'
import type { CustomerTypeValue } from '@/features/auth/customer-register-options'
import { getErrorMessage, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

const giftingAs: {
  value: CustomerTypeValue
  label: string
  hint: string
  icon: LucideIcon
}[] = [
  { value: 'individual', label: 'Just me', hint: 'Gifts for friends', icon: Heart },
  { value: 'family', label: 'Family', hint: 'One home', icon: Users },
  { value: 'business', label: 'Business', hint: 'Teams & clients', icon: Briefcase },
]

const perks: { icon: LucideIcon; label: string }[] = [
  { icon: Truck, label: 'Live tracking' },
  { icon: Star, label: 'Earn points' },
  { icon: Sparkles, label: 'Win prizes' },
]

/**
 * Customer sign-up: just enough to start gifting. A photo and delivery
 * addresses are added later from the account pages. On success the customer
 * is signed straight in. Their welcome email is already on its way.
 */
type SocialSignup = Extract<SocialSignInResult, { status: 'needs_profile' }>

/** A social sign-up handed over from the sign-in page, if any. */
function socialFromState(state: unknown): SocialSignup | null {
  const social = (state as { social?: SocialSignInResult } | null)?.social
  return social?.status === 'needs_profile' ? social : null
}

export function CustomerRegisterForm() {
  const { login } = useAuth()
  const location = useLocation()
  // Someone who chose Google or Facebook: the provider vouched for their
  // email, so only a country and phone are still needed.
  const [social, setSocial] = useState<SocialSignup | null>(() => socialFromState(location.state))
  const [customerType, setCustomerType] = useState<CustomerTypeValue>('individual')
  const [displayName, setDisplayName] = useState(() => socialFromState(location.state)?.name ?? '')
  const [email, setEmail] = useState('')
  const [countryId, setCountryId] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailTaken, setEmailTaken] = useState(false)
  const emailInput = useRef<HTMLInputElement>(null)
  const [blockedByCountry, setBlockedByCountry] = useState<Record<string, string>>({})

  const registrationBlocked = Boolean(countryId && blockedByCountry[countryId])
  const matches = confirmPassword.length > 0 && confirmPassword === password

  function handleCountryChange(id: string) {
    setCountryId(id)
    setError(blockedByCountry[id] ?? null)
  }

  function handleSocialResult(result: SocialSignInResult) {
    setError(null)
    if (result.status === 'signed_in') {
      login(result.token, 'customer', true)
      return
    }
    setSocial(result)
    if (!displayName.trim() && result.name) setDisplayName(result.name)
    // The buttons sit under the form; bring the "Almost there" card into view.
    window.setTimeout(() => {
      document.getElementById('social-signup-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
  }

  async function finishSocialSignup(signup: SocialSignup) {
    if (!displayName.trim()) return setError('Tell us your name.')
    if (phone.replace(/\D/g, '').length < 7) return setError('Enter your phone number.')
    if (!countryId) return setError('Choose the country you’re gifting from.')
    if (registrationBlocked) return setError(blockedByCountry[countryId])

    setIsSubmitting(true)
    try {
      const result = await completeSocialSignup({
        signup_token: signup.signup_token,
        country_id: countryId,
        phone: phone.trim(),
        customer_type: customerType,
        display_name: displayName.trim(),
      })
      login(result.token, 'customer', true)
    } catch (err) {
      const message = getErrorMessage(err, 'Registration failed.')
      if (err instanceof ApiError && err.status === 401) setSocial(null) // the session expired
      if (err instanceof ApiError && err.status === 403 && countryId) {
        setBlockedByCountry((current) => ({ ...current, [countryId]: message }))
      }
      setError(message)
      setIsSubmitting(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setEmailTaken(false)
    if (social) return finishSocialSignup(social)

    const trimmedEmail = email.trim()
    if (!displayName.trim()) return setError('Tell us your name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) return setError('Enter a valid email.')
    if (phone.replace(/\D/g, '').length < 7) return setError('Enter your phone number.')
    if (!countryId) return setError('Choose the country you’re gifting from.')
    if (registrationBlocked) return setError(blockedByCountry[countryId])
    if (password.length < 8) return setError('Your password needs at least 8 characters.')
    if (password !== confirmPassword) return setError('The passwords don’t match.')

    setIsSubmitting(true)
    try {
      await registerCustomer({
        country_id: countryId,
        email: trimmedEmail,
        password,
        customer_type: customerType,
        display_name: displayName.trim(),
        phone: phone.trim(),
      })
      const session = await loginCustomer({ email: trimmedEmail, password })
      login(session.token, 'customer', true)
    } catch (err) {
      // 409: this email already has an account. Offer sign-in, not an error.
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
      className="animate-fade-up mx-auto w-full max-w-[30rem] min-w-0 space-y-6 sm:space-y-7"
      style={{ animationDelay: '120ms' }}
      noValidate
    >
      <div className="space-y-3">
        <h2 className="font-display text-3xl leading-[1.05] sm:text-4xl tracking-tight text-foreground">
          Start sending{' '}
          <span className="bg-gradient-to-r from-primary via-fuchsia-600 to-pink-500 bg-clip-text text-transparent">
            smiles
          </span>
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Create your account, then add a photo and delivery addresses whenever you like.
        </p>
        <ul className="grid grid-cols-3 gap-2 pt-1">
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
      </div>

      {social ? (
        <div
          id="social-signup-card"
          className="animate-fade-up flex items-center gap-3.5 rounded-2xl bg-gradient-to-br from-accent to-pink-50 p-4 ring-1 ring-primary/20"
        >
          {social.image_url ? (
            <img src={social.image_url} alt="" className="size-12 shrink-0 rounded-full object-cover ring-2 ring-background" />
          ) : (
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
              {(social.name || social.email).charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">Almost there{social.name ? `, ${social.name.split(' ')[0]}` : ''}!</p>
            <p className="truncate text-sm text-muted-foreground">
              Signing up as <span className="font-medium text-foreground">{social.email}</span>. Just add your
              country and phone.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSocial(null)}
            className="shrink-0 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Use email instead
          </button>
        </div>
      ) : null}

      <fieldset className="space-y-2.5" disabled={isSubmitting}>
        <legend className="mb-2.5 text-sm font-medium">I’m gifting as</legend>
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          {giftingAs.map((option) => {
            const active = customerType === option.value
            return (
              <label
                key={option.value}
                className={cn(
                  'group relative flex cursor-pointer flex-col items-start gap-2 rounded-2xl p-2.5 ring-1 sm:p-3 transition-all',
                  active
                    ? 'bg-primary/[0.06] shadow-[0_8px_24px_-12px] shadow-primary/50 ring-2 ring-primary'
                    : 'bg-card ring-border/70 hover:-translate-y-0.5 hover:ring-primary/40',
                )}
              >
                <input
                  type="radio"
                  name="customer-type"
                  value={option.value}
                  checked={active}
                  onChange={() => setCustomerType(option.value)}
                  className="sr-only"
                />
                <span
                  className={cn(
                    'flex size-9 items-center justify-center rounded-xl transition-colors',
                    active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}
                >
                  <option.icon className="size-4.5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className="block text-[11px] leading-tight text-muted-foreground">
                    {option.hint}
                  </span>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <div className="space-y-4">
        <Field id="customer-display-name" label="Your name">
          <IconInput icon={UserRound}>
            <Input
              id="customer-display-name"
              autoComplete="name"
              placeholder="How should we greet you?"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="h-12 bg-surface pl-10"
              disabled={isSubmitting}
            />
          </IconInput>
        </Field>

        {social ? null : (
          <Field id="customer-register-email" label="Email">
            <IconInput icon={Mail}>
              <Input
                id="customer-register-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                ref={emailInput}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setEmailTaken(false)
                }}
                className={cn('h-12 bg-surface pl-10', emailTaken && 'ring-2 ring-amber-400')}
                disabled={isSubmitting}
              />
            </IconInput>
          </Field>
        )}

        <CountrySelectField
          id="customer-country"
          value={countryId}
          onChange={handleCountryChange}
          disabled={isSubmitting}
        />

        <div>
          <Field id="customer-phone" label="Phone number">
            <PhoneField
              id="customer-phone"
              value={phone}
              onChange={setPhone}
              disabled={isSubmitting}
              required
            />
          </Field>
        </div>

        {social ? null : (
          <>
            <Field id="customer-create-password" label="Create a password">
              <div className="relative">
                <Input
                  id="customer-create-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 bg-surface px-3 pr-11"
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

            <Field id="customer-confirm-password" label="Confirm password">
              <div className="relative">
                <Input
                  id="customer-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Type it once more"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className={cn(
                    'h-12 bg-surface px-3 pr-11',
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
          </>
        )}
      </div>

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
                Welcome back, you’re already in!
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium break-all text-foreground">{email.trim()}</span> already
                has a SendAGift account. Sign in to pick up where you left off.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Button asChild className="h-10 rounded-full px-5">
              <Link to={`/login?email=${encodeURIComponent(email.trim())}`}>
                Sign in instead
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
                emailInput.current?.focus()
              }}
            >
              Use a different email
            </Button>
          </div>
        </div>
      ) : null}

      <FormAlert error={error} />

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
            Create my account
            <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </Button>

      {social ? null : (
        <div className="space-y-5">
          <SocialDivider label="or sign up with" />
          <SocialSignInButtons verb="Sign up" onResult={handleSocialResult} />
        </div>
      )}

      <div className="space-y-3 text-center text-sm text-muted-foreground">
        <p>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:text-primary/80">
            Sign in
          </Link>
        </p>
        <p className="text-xs">
          Selling gifts?{' '}
          <Link to="/seller/register" className="font-medium text-foreground hover:text-primary">
            Open a seller account
          </Link>
        </p>
      </div>
    </form>
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
