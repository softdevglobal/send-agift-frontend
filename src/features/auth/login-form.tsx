import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { loginCopy } from '@/features/auth/copy'
import type { AuthRole } from '@/features/auth/types'

type LoginFormProps = {
  role: AuthRole
}

export function LoginForm({ role }: LoginFormProps) {
  const copy = loginCopy[role]
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice(null)
    setIsSubmitting(true)

    // UI-only for now — backend auth will plug in later
    await new Promise((resolve) => setTimeout(resolve, 900))
    setIsSubmitting(false)
    setNotice(
      `${copy.roleLabel} sign-in is ready for wiring. No backend call was made.`
    )
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
          {copy.registerHint}{' '}
          {role === 'seller' ? (
            <Link
              to="/seller/register"
              className="font-medium text-primary transition-colors hover:text-primary/80"
            >
              {copy.registerLabel}
            </Link>
          ) : (
            <button
              type="button"
              className="font-medium text-primary transition-colors hover:text-primary/80"
            >
              {copy.registerLabel}
            </button>
          )}
        </p>

        <p className="text-center text-sm text-muted-foreground">
          {copy.switchPrompt}{' '}
          <Link
            to={copy.switchTo}
            className="font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
          >
            {copy.switchLabel}
          </Link>
        </p>
      </div>
    </form>
  )
}
