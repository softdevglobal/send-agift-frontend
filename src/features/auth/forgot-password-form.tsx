import { LoaderCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import {
  forgotCustomerPassword,
  resetForgottenCustomerPassword,
} from '@/api/customers'
import {
  forgotSellerPassword,
  resetForgottenSellerPassword,
} from '@/api/sellers'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/lib/api'

type ForgotRole = 'customer' | 'seller'

export function ForgotPasswordForm({ role }: { role: ForgotRole }) {
  const [params] = useSearchParams()
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [sent, setSent] = useState(false)
  const [done, setDone] = useState(false)
  const [sending, setSending] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const loginTo = role === 'seller' ? '/seller/login' : '/login'

  function validEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }

  async function sendCode(event?: FormEvent) {
    event?.preventDefault()
    setError(null)
    const trimmed = email.trim()
    if (!validEmail(trimmed)) {
      setError('Enter the email on your account.')
      return
    }
    setSending(true)
    try {
      const result =
        role === 'seller'
          ? await forgotSellerPassword(trimmed)
          : await forgotCustomerPassword(trimmed)
      setSent(true)
      setNotice(result.message)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not send a code.'))
    } finally {
      setSending(false)
    }
  }

  async function reset(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const trimmed = email.trim()
    const digits = code.replace(/\D/g, '')
    if (!validEmail(trimmed)) {
      setError('Enter the email on your account.')
      return
    }
    if (digits.length !== 6) {
      setError('Enter the 6-digit code from the email.')
      return
    }
    if (password.length < 8) {
      setError('Your new password needs at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('The new passwords don’t match.')
      return
    }
    setSaving(true)
    try {
      const body = { email: trimmed, code: digits, password }
      if (role === 'seller') await resetForgottenSellerPassword(body)
      else await resetForgottenCustomerPassword(body)
      setDone(true)
      setNotice('Password changed. Sign in with your new password.')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not reset your password.'))
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="mx-auto w-full max-w-[26rem] space-y-6">
        <h2 className="font-poster text-3xl text-brand-ink sm:text-4xl dark:text-foreground">Password updated</h2>
        <FormAlert notice={notice} />
        <Button asChild className="h-11 w-full">
          <Link to={loginTo}>Sign in</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[26rem] space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
          {role === 'seller' ? 'Seller account' : 'Your account'}
        </p>
        <h2 className="font-poster text-3xl text-brand-ink sm:text-4xl dark:text-foreground">Reset your password</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We’ll email a 6-digit code. It expires in 15 minutes. The code is the only way to set a
          new password from here.
        </p>
      </div>

      <form onSubmit={sent ? reset : sendCode} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="forgot-email">Email</Label>
          <Input
            id="forgot-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-11 bg-surface px-3"
            disabled={sending || saving}
          />
        </div>
        {sent ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="forgot-code">6-digit code</Label>
              <Input
                id="forgot-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                className="h-14 bg-surface text-center font-display text-2xl tracking-[0.4em]"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="forgot-password">New password</Label>
              <Input
                id="forgot-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 bg-surface px-3"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="forgot-confirm">Confirm new password</Label>
              <Input
                id="forgot-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className="h-11 bg-surface px-3"
                disabled={saving}
              />
            </div>
          </>
        ) : null}
        <FormAlert error={error} notice={error ? null : notice} />
        <Button type="submit" className="h-11 w-full" disabled={sending || saving}>
          {sending || saving ? <LoaderCircle className="animate-spin" /> : null}
          {sent ? 'Set new password' : 'Email me a code'}
        </Button>
      </form>

      {sent ? (
        <p className="text-center text-sm text-muted-foreground">
          Didn’t get it?{' '}
          <button
            type="button"
            onClick={() => void sendCode()}
            disabled={sending || saving}
            className="font-medium text-primary hover:text-primary/80 disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Send a new code'}
          </button>
        </p>
      ) : null}

      <p className="text-center text-sm text-muted-foreground">
        <Link to={loginTo} className="font-medium text-primary hover:text-primary/80">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
