import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'

import { loginAdmin } from '@/api/auth'
import { loginCustomer } from '@/api/customers'
import { loginSeller } from '@/api/sellers'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/features/auth/auth-context'
import { loginCopy } from '@/features/auth/copy'
import type { AuthRole } from '@/features/auth/types'
import { ApiError, getErrorMessage } from '@/lib/api'
import { isUserRole, type UserRole } from '@/lib/auth'

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
  const { login } = useAuth()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)

  const registered = searchParams.get('registered') === '1'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setHint(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('Enter your email.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Enter a valid email.')
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
      setError(getErrorMessage(err, 'Sign in failed.'))
      setIsSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="animate-fade-up mx-auto w-full max-w-[24rem] space-y-6"
      style={{ animationDelay: '120ms' }}
      noValidate
    >
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
          {copy.roleLabel} access
        </p>
        <h2 className="font-display text-3xl tracking-tight text-foreground">
          Welcome back
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {copy.supporting}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`${role}-email`}>Email</Label>
          <Input
            id={`${role}-email`}
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
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor={`${role}-password`}>Password</Label>
            <button
              type="button"
              className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
              onClick={() => {
                setError(null)
                setHint(
                  'Password reset isn’t available yet. Use the email you registered with, or contact support.',
                )
              }}
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Input
              id={`${role}-password`}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
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
            : null)
        }
      />

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="h-11 w-full text-sm"
      >
        {isSubmitting ? (
          <>
            <LoaderCircle className="animate-spin" />
            Signing in…
          </>
        ) : (
          copy.submitLabel
        )}
      </Button>

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
            className="h-11 w-full text-sm"
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
