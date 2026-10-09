import { useState, type FormEvent } from 'react'
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  Lock,
  Mail,
  Sparkles,
  Star,
  Truck,
  type LucideIcon,
} from 'lucide-react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { loginAdmin, type CodeLoginResult } from '@/api/auth'
import { loginCustomer } from '@/api/customers'
import { loginSeller } from '@/api/sellers'
import { FormAlert } from '@/components/common/form-alert'
import { Marker } from '@/components/common/storefront-decor'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/features/auth/auth-context'
import { CodeLoginPanel } from '@/features/auth/code-login-panel'
import { loginCopy } from '@/features/auth/copy'
import { SocialDivider, SocialSignInButtons } from '@/features/auth/social-sign-in'
import type { AuthRole } from '@/features/auth/types'
import { ApiError, getErrorMessage } from '@/lib/api'
import { isAdminRole, isUserRole, type UserRole } from '@/lib/auth'

const perks: { icon: LucideIcon; label: string }[] = [
  { icon: Truck, label: 'Live tracking' },
  { icon: Star, label: 'Earn points' },
  { icon: Sparkles, label: 'Win prizes' },
]

type LoginFormProps = {
  role: AuthRole
}

const LOGIN_ROLES: AuthRole[] = ['customer', 'seller', 'admin']

async function loginByRole(role: AuthRole, email: string, password: string) {
  if (role === 'seller') return loginSeller({ email, password })
  if (role === 'admin') return loginAdmin({ email, password })
  return loginCustomer({ email, password })
}

function loginOrder(preferred: AuthRole): AuthRole[] {
  // `/auth/login` returns the account's real role, so it runs first from every
  // sign-in page. Role-specific customer/seller endpoints follow as fallback.
  const rest = LOGIN_ROLES.filter((item) => item !== 'admin' && item !== preferred)
  if (preferred === 'admin') return ['admin', ...rest]
  return ['admin', preferred, ...rest]
}

function isRetryableLoginError(error: unknown): boolean {
  return error instanceof ApiError && [400, 401, 403, 404].includes(error.status)
}

function sessionRoleFromResult(endpoint: AuthRole, apiRole: unknown): UserRole {
  if (typeof apiRole === 'string' && isUserRole(apiRole)) return apiRole
  return endpoint === 'admin' ? 'admin' : endpoint
}

async function loginWithCredentials(
  preferred: AuthRole,
  email: string,
  password: string,
): Promise<{ token: string; role: UserRole }> {
  let lastError: unknown

  for (const endpoint of loginOrder(preferred)) {
    try {
      const result = await loginByRole(endpoint, email, password)
      if (typeof result?.token === 'string' && result.token) {
        return {
          token: result.token,
          role: sessionRoleFromResult(endpoint, result.role),
        }
      }
    } catch (error) {
      lastError = error
      if (!isRetryableLoginError(error)) throw error
    }
  }

  throw lastError ?? new Error('Sign in failed.')
}

export function LoginForm({ role }: LoginFormProps) {
  const copy = loginCopy[role]
  const { login, isAuthenticated, role: sessionRole } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // Emails link here with the address filled in (e.g. a gift recipient's).
  const [email, setEmail] = useState(() => searchParams.get('email') ?? '')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [mode, setMode] = useState<'password' | 'code'>(() =>
    searchParams.get('review') ? 'code' : 'password',
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)

  const registered = searchParams.get('registered') === '1'
  const switchingFrom =
    isAuthenticated &&
    sessionRole &&
    sessionRole !== role &&
    !(role === 'admin' && isAdminRole(sessionRole))
      ? sessionRole
      : null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mode === 'code') return
    setError(null)
    setHint(null)

    const trimmedEmail = email.trim()
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
    const isPhone = trimmedEmail.replace(/\D/g, '').length >= 7
    if (!trimmedEmail) {
      setError(role === 'customer' ? 'Enter your email or phone number.' : 'Enter your email.')
      return
    }
    if (role === 'customer' ? !isEmail && !isPhone : !isEmail) {
      setError(role === 'customer' ? 'Enter a valid email or phone number.' : 'Enter a valid email.')
      return
    }
    if (!password) {
      setError('Enter your password.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await loginWithCredentials(role, trimmedEmail, password)
      login(result.token, result.role, remember)
    } catch (err) {
      if (
        role === 'seller' &&
        err instanceof ApiError &&
        err.status === 403 &&
        err.message.toLowerCase().includes('confirm your email')
      ) {
        navigate(`/seller/verify-email?email=${encodeURIComponent(trimmedEmail)}`)
        return
      }
      setError(getErrorMessage(err, 'Sign in failed.'))
      setIsSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="animate-fade-up mx-auto w-full max-w-[26rem] min-w-0 space-y-6"
      style={{ animationDelay: '120ms' }}
      noValidate
    >
      <div className="space-y-3">
        <h2 className="font-poster text-4xl text-brand-ink sm:text-5xl dark:text-foreground">
          Welcome <Marker tone="violet">back</Marker>
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {copy.supporting}
        </p>
        {role === 'customer' ? (
          <ul className="grid grid-cols-3 gap-2 pt-1">
            {perks.map((perk) => (
              <li
                key={perk.label}
                className="flex min-w-0 items-center justify-center gap-1.5 rounded-md bg-accent px-2 py-1.5 text-xs font-semibold whitespace-nowrap text-brand-ink"
              >
                <perk.icon className="size-3.5 shrink-0 text-primary" />
                {perk.label}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {role === 'customer' ? (
        <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1 text-sm font-medium">
          {(['password', 'code'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setMode(item)
                setError(null)
              }}
              className={`rounded-full py-2 transition-colors ${
                mode === item ? 'bg-background shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {item === 'password' ? 'Password' : 'One-time code'}
            </button>
          ))}
        </div>
      ) : null}

      {mode === 'code' && role === 'customer' ? (
        <CodeLoginPanel
          reviewToken={searchParams.get('review') ?? undefined}
          onResult={(result: CodeLoginResult) => {
            if (result.status === 'signed_in') login(result.token, 'customer', remember)
            else navigate('/register', { state: { codeSignup: result } })
          }}
        />
      ) : (
        <>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`${role}-email`}>{role === 'customer' ? 'Email or phone' : 'Email'}</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={`${role}-email`}
              type={role === 'customer' ? 'text' : 'email'}
              autoComplete={role === 'customer' ? 'username' : 'email'}
              placeholder={role === 'customer' ? 'you@example.com or 77 123 4567' : 'you@example.com'}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 bg-surface pl-10"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor={`${role}-password`}>Password</Label>
            {role === 'admin' ? (
              <button
                type="button"
                className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
                onClick={() => {
                  setError(null)
                  setHint('Password reset isn’t available for admin accounts. Contact another admin.')
                }}
              >
                Forgot password?
              </button>
            ) : (
              <Link
                to={`${role === 'seller' ? '/seller/forgot-password' : '/forgot-password'}${
                  email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ''
                }`}
                className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
              >
                Forgot password?
              </Link>
            )}
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={`${role}-password`}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 bg-surface pr-11 pl-10"
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

        <div className="flex items-center gap-2.5 pt-1">
          <Checkbox
            id={`${role}-remember`}
            checked={remember}
            onCheckedChange={(value) => setRemember(value === true)}
          />
          <Label
            htmlFor={`${role}-remember`}
            className="cursor-pointer font-normal text-muted-foreground"
          >
            Keep me signed in on this device
          </Label>
        </div>
      </div>

      <FormAlert
        error={error}
        notice={
          hint ??
          (registered
            ? 'Account created. Sign in with your new credentials.'
            : switchingFrom
              ? `You're signed in as a ${switchingFrom}. Signing in here will switch to your ${copy.roleLabel.toLowerCase()} account.`
              : null)
        }
      />

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="group h-12 w-full rounded-full text-sm font-semibold"
      >
        {isSubmitting ? (
          <>
            <LoaderCircle className="animate-spin" />
            Signing in…
          </>
        ) : (
          <>
            {copy.submitLabel}
            <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
          </>
        )}
        </Button>
        </>
      )}

      {role === 'customer' ? (
        <div className="space-y-5">
          <SocialDivider label="or continue with" />
          <SocialSignInButtons
            verb=""
            onResult={(result) => {
              if (result.status === 'signed_in') login(result.token, 'customer', remember)
              // A new customer finishes signing up (country and phone) first.
              else navigate('/register', { state: { social: result } })
            }}
          />
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>

        {role === 'customer' ? (
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 w-full rounded-full text-sm"
          >
            <Link to="/become-a-seller">Become a seller</Link>
          </Button>
        ) : null}

        <p className="text-center text-sm text-muted-foreground">
          {copy.registerHint}{' '}
          <Link
            to={copy.registerTo}
            className="font-medium text-primary transition-colors hover:text-primary/80"
          >
            {copy.registerLabel}
          </Link>
        </p>

        <p className="text-center text-sm text-muted-foreground">
          {copy.switchPrompt}{' '}
          <Link
            to={copy.switchTo}
            state={location.state}
            className="font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
          >
            {copy.switchLabel}
          </Link>
        </p>
      </div>
    </form>
  )
}
