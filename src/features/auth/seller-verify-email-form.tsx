import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { Check, LoaderCircle, MailCheck, RotateCw } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

import { resendSellerEmailCode, verifySellerEmail } from '@/api/sellers'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { ApiError, getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

const CODE_LENGTH = 6
const RESEND_SECONDS = 60

function errorCode(error: unknown): string | null {
  if (!(error instanceof ApiError) || typeof error.body !== 'object' || error.body === null) {
    return null
  }
  const code = (error.body as { code?: unknown }).code
  return typeof code === 'string' ? code : null
}

const steps = [
  { label: 'Your details', state: 'done' },
  { label: 'Confirm email', state: 'current' },
  { label: 'Admin review', state: 'todo' },
] as const

/**
 * Step two of seller sign-up: the 6-digit code from the email. A right code
 * confirms the address, signs the seller in and puts them in the review queue.
 */
export function SellerVerifyEmailForm() {
  const { login } = useAuth()
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const [digits, setDigits] = useState<string[]>(() => Array(CODE_LENGTH).fill(''))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [alreadyVerified, setAlreadyVerified] = useState(false)
  const [cooldown, setCooldown] = useState(RESEND_SECONDS)
  const [isResending, setIsResending] = useState(false)
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const autoResent = useRef(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  useEffect(() => {
    inputs.current[0]?.focus()
  }, [])

  // Arriving from sign-in, the last code may be long expired: send a fresh one.
  useEffect(() => {
    if (searchParams.get('resend') !== '1' || !email || autoResent.current) return
    autoResent.current = true
    void resend(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function resend(silent = false) {
    if (!email) return
    setIsResending(true)
    setError(null)
    try {
      await resendSellerEmailCode(email)
      setNotice(silent ? 'We sent a fresh code to your inbox.' : 'New code sent. Check your inbox.')
      setDigits(Array(CODE_LENGTH).fill(''))
      setCooldown(RESEND_SECONDS)
      inputs.current[0]?.focus()
    } catch (err) {
      const code = errorCode(err)
      if (code === 'already_verified') {
        setAlreadyVerified(true)
      } else if (code === 'code_cooldown' && err instanceof ApiError) {
        // A code went out moments ago; the countdown says when another can.
        if (!silent) setError(err.message)
        setCooldown(RESEND_SECONDS)
      } else {
        setError(getErrorMessage(err, 'Could not send a new code.'))
      }
    } finally {
      setIsResending(false)
    }
  }

  async function submit(code: string) {
    if (isSubmitting) return
    setIsSubmitting(true)
    setError(null)
    setNotice(null)
    try {
      const result = await verifySellerEmail(email, code)
      login(result.token, 'seller', true)
    } catch (err) {
      const code = errorCode(err)
      if (code === 'already_verified') {
        setAlreadyVerified(true)
      } else {
        setError(getErrorMessage(err, 'That code did not work.'))
        if (code === 'code_expired' || code === 'code_locked') setCooldown(0)
        setDigits(Array(CODE_LENGTH).fill(''))
        inputs.current[0]?.focus()
      }
      setIsSubmitting(false)
    }
  }

  function fill(from: number, value: string) {
    const clean = value.replace(/\D/g, '').slice(0, CODE_LENGTH - from)
    if (!clean) return
    const next = [...digits]
    clean.split('').forEach((d, i) => {
      next[from + i] = d
    })
    setDigits(next)
    const last = Math.min(from + clean.length, CODE_LENGTH - 1)
    inputs.current[last]?.focus()
    if (next.every(Boolean)) void submit(next.join(''))
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      const next = [...digits]
      next[index - 1] = ''
      setDigits(next)
      inputs.current[index - 1]?.focus()
      event.preventDefault()
    } else if (event.key === 'ArrowLeft' && index > 0) {
      inputs.current[index - 1]?.focus()
    } else if (event.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      inputs.current[index + 1]?.focus()
    }
  }

  function handlePaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault()
    fill(index, event.clipboardData.getData('text'))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const code = digits.join('')
    if (code.length !== CODE_LENGTH) {
      setError('Enter all 6 digits.')
      return
    }
    void submit(code)
  }

  if (!email) {
    return (
      <div className="mx-auto w-full max-w-[28rem] space-y-4">
        <h2 className="font-display text-3xl tracking-tight">Confirm your email</h2>
        <p className="text-sm text-muted-foreground">
          This link is missing your email address. Sign in with your seller account and we&apos;ll
          send you a new code.
        </p>
        <Button asChild className="h-11">
          <Link to="/seller/login">Go to seller sign in</Link>
        </Button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="animate-fade-up mx-auto w-full max-w-[28rem] min-w-0 space-y-7"
      style={{ animationDelay: '120ms' }}
      noValidate
    >
      <ol className="flex items-center gap-2" aria-label="Sign-up progress">
        {steps.map((step, i) => (
          <li key={step.label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1',
                step.state === 'done' && 'bg-emerald-500 text-white ring-emerald-500',
                step.state === 'current' && 'bg-primary text-primary-foreground ring-primary',
                step.state === 'todo' && 'bg-background text-muted-foreground ring-border',
              )}
            >
              {step.state === 'done' ? <Check className="size-3.5" /> : i + 1}
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

      <div className="space-y-3">
        <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground ring-1 ring-primary/15">
          <MailCheck className="size-6" />
        </span>
        <h2 className="font-display text-3xl tracking-tight text-foreground">Check your inbox</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We sent a 6-digit code to{' '}
          <span className="font-medium break-all text-foreground">{email}</span>. Enter it below to
          confirm your email. It expires in 15 minutes.
        </p>
      </div>

      {alreadyVerified ? (
        <div className="space-y-4 rounded-2xl bg-emerald-50 p-5 text-emerald-900 ring-1 ring-emerald-200">
          <p className="text-sm font-medium">This email is already confirmed.</p>
          <p className="text-sm">Sign in to see your account status.</p>
          <Button asChild className="h-10">
            <Link to={`/seller/login?email=${encodeURIComponent(email)}`}>Sign in</Link>
          </Button>
        </div>
      ) : (
        <>
          <fieldset className="space-y-2" disabled={isSubmitting}>
            <legend className="sr-only">Verification code</legend>
            <div className="flex justify-between gap-2">
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputs.current[i] = el
                  }}
                  value={digit}
                  onChange={(e) => {
                    const value = e.target.value
                    if (!value) {
                      const next = [...digits]
                      next[i] = ''
                      setDigits(next)
                      return
                    }
                    fill(i, value.slice(-1) === digit ? value.slice(0, 1) : value.slice(-1))
                  }}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={(e) => handlePaste(i, e)}
                  onFocus={(e) => e.target.select()}
                  inputMode="numeric"
                  // The browser's default input width would stretch the row on phones.
                  size={1}
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  maxLength={CODE_LENGTH}
                  aria-label={`Digit ${i + 1}`}
                  className={cn(
                    'h-14 w-full min-w-0 rounded-xl border-2 bg-background text-center font-mono text-2xl font-semibold text-foreground shadow-sm transition-all outline-none sm:h-16',
                    digit ? 'border-primary/50 bg-accent/40' : 'border-border',
                    'focus:border-primary focus:ring-4 focus:ring-primary/15',
                  )}
                />
              ))}
            </div>
          </fieldset>

          <FormAlert error={error} notice={notice} />

          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting || digits.some((d) => !d)}
            className="h-11 w-full text-sm"
          >
            {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Confirm email
          </Button>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">Didn&apos;t get it? Check spam, or</span>
            <button
              type="button"
              onClick={() => void resend()}
              disabled={cooldown > 0 || isResending}
              className="inline-flex items-center gap-1.5 font-medium text-primary disabled:cursor-not-allowed disabled:text-muted-foreground"
            >
              <RotateCw className={cn('size-3.5', isResending && 'animate-spin')} />
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Send a new code'}
            </button>
          </div>
        </>
      )}
    </form>
  )
}
