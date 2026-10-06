import { LoaderCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { resendSellerEmailCode, verifySellerEmail } from '@/api/sellers'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/auth-context'
import { ApiError, getErrorMessage } from '@/lib/api'

export function SellerVerifyEmailForm() {
  const { login } = useAuth()
  const [params] = useSearchParams()
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [code, setCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(
    'We emailed a 6-digit code. It expires in 15 minutes.',
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const trimmed = email.trim()
    const digits = code.replace(/\D/g, '')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter the email you registered with.')
      return
    }
    if (digits.length !== 6) {
      setError('Enter the 6-digit code from the email.')
      return
    }
    setIsSubmitting(true)
    try {
      const session = await verifySellerEmail(trimmed, digits)
      login(session.token, 'seller', true)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setNotice(null)
        setError('This email is already confirmed. Sign in with your password.')
      } else {
        setError(getErrorMessage(err, 'Could not confirm that code.'))
      }
      setIsSubmitting(false)
    }
  }

  async function resend() {
    setError(null)
    const trimmed = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter the email you registered with.')
      return
    }
    setIsResending(true)
    try {
      const result = await resendSellerEmailCode(trimmed)
      setNotice(result.message)
    } catch (err) {
      setNotice(null)
      setError(getErrorMessage(err, 'Could not send a new code.'))
    } finally {
      setIsResending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-[26rem] space-y-6" noValidate>
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
          Confirm your email
        </p>
        <h2 className="font-display text-3xl tracking-tight text-foreground">Enter your code</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Your seller account is created. Sign-in stays closed until this code matches the one we
          sent.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="seller-verify-email">Business email</Label>
          <Input
            id="seller-verify-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-11 bg-surface px-3"
            disabled={isSubmitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="seller-verify-code">6-digit code</Label>
          <Input
            id="seller-verify-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            className="h-14 bg-surface text-center font-display text-2xl tracking-[0.4em]"
            disabled={isSubmitting}
          />
        </div>
      </div>

      <FormAlert error={error} notice={error ? null : notice} />

      <Button type="submit" className="h-11 w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <LoaderCircle className="animate-spin" />
            Confirming…
          </>
        ) : (
          'Confirm and sign in'
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Didn’t get it?{' '}
        <button
          type="button"
          onClick={() => void resend()}
          disabled={isResending || isSubmitting}
          className="font-medium text-primary hover:text-primary/80 disabled:opacity-50"
        >
          {isResending ? 'Sending…' : 'Send a new code'}
        </button>
      </p>

      <p className="text-center text-sm text-muted-foreground">
        Already confirmed?{' '}
        <Link to="/seller/login" className="font-medium text-primary hover:text-primary/80">
          Seller sign in
        </Link>
      </p>
    </form>
  )
}
