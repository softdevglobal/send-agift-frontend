import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, LoaderCircle, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  sellerCountries,
  sellerTypes,
  verificationStatusLabel,
  type VerificationStatus,
} from '@/features/auth/seller-register-options'
import { cn } from '@/lib/utils'

const selectClassName =
  'h-11 w-full min-w-0 rounded-lg border border-input bg-surface px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

const verificationTone: Record<VerificationStatus, string> = {
  unverified: 'bg-muted text-muted-foreground ring-border/60',
  pending: 'bg-accent text-accent-foreground ring-primary/20',
  verified: 'bg-primary/10 text-primary ring-primary/25',
  rejected: 'bg-destructive/10 text-destructive ring-destructive/25',
}

export function SellerRegisterForm() {
  const [country, setCountry] = useState('')
  const [sellerType, setSellerType] = useState('')
  const [legalName, setLegalName] = useState('')
  const [tradingName, setTradingName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus>('unverified')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)

    if (!country || !sellerType) {
      setError('Please select a country and seller type.')
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

    setIsSubmitting(true)

    // UI-only for now — backend registration will plug in later
    await new Promise((resolve) => setTimeout(resolve, 900))

    setIsSubmitting(false)
    setVerificationStatus('pending')
    setNotice(
      'Seller registration submitted. Your account is pending verification — no backend call was made.'
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
          Seller registration
        </p>
        <h2 className="font-display text-3xl tracking-tight text-foreground">
          Create your seller account
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Tell us who you are, set your login credentials, and we&apos;ll start
          verification for your active country.
        </p>
      </div>

      <div
        className={cn(
          'flex items-center justify-between gap-3 rounded-xl px-3.5 py-3 ring-1',
          verificationTone[verificationStatus]
        )}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="size-4 shrink-0" />
          <div>
            <p className="text-xs font-medium tracking-wide uppercase opacity-80">
              Verification status
            </p>
            <p className="text-sm font-medium">
              {verificationStatusLabel[verificationStatus]}
            </p>
          </div>
        </div>
        <span className="rounded-md bg-background/50 px-2 py-1 text-[11px] font-medium tracking-wide uppercase">
          {verificationStatus}
        </span>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="seller-country">Country</Label>
            <select
              id="seller-country"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              className={selectClassName}
              required
            >
              <option value="" disabled>
                Select country
              </option>
              {sellerCountries.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="seller-type">Seller type</Label>
            <select
              id="seller-type"
              value={sellerType}
              onChange={(event) => setSellerType(event.target.value)}
              className={selectClassName}
              required
            >
              <option value="" disabled>
                Select seller type
              </option>
              {sellerTypes.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="seller-legal-name">Legal name</Label>
          <Input
            id="seller-legal-name"
            type="text"
            autoComplete="organization"
            placeholder="Registered legal name"
            value={legalName}
            onChange={(event) => setLegalName(event.target.value)}
            className="h-11 bg-surface px-3"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="seller-trading-name">Trading name</Label>
          <Input
            id="seller-trading-name"
            type="text"
            autoComplete="organization"
            placeholder="Public shop / trading name"
            value={tradingName}
            onChange={(event) => setTradingName(event.target.value)}
            className="h-11 bg-surface px-3"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="seller-register-email">Email</Label>
          <Input
            id="seller-register-email"
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
          <Label htmlFor="seller-phone">Phone</Label>
          <Input
            id="seller-phone"
            type="tel"
            autoComplete="tel"
            placeholder="+94 77 123 4567"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="h-11 bg-surface px-3"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="seller-create-password">Create password</Label>
          <div className="relative">
            <Input
              id="seller-create-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 bg-surface px-3 pr-11"
              required
              minLength={8}
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
          <Label htmlFor="seller-confirm-password">Confirm password</Label>
          <div className="relative">
            <Input
              id="seller-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="h-11 bg-surface px-3 pr-11"
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((value) => !value)}
              className="absolute top-1/2 right-2.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={
                showConfirmPassword ? 'Hide password' : 'Show password'
              }
            >
              {showConfirmPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
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
          'Create seller account'
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
            to="/seller/login"
            className="font-medium text-primary transition-colors hover:text-primary/80"
          >
            Seller sign in
          </Link>
        </p>
      </div>
    </form>
  )
}
