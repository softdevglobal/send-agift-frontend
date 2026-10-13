import { useState, type FormEvent } from 'react'
import { BadgeCheck, LoaderCircle, Mail } from 'lucide-react'

import {
  confirmEmailChange,
  requestEmailChange,
  type EmailChangeRole,
} from '@/api/email-change'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/auth-context'
import { getErrorMessage } from '@/lib/api'
import { OtpInput } from '@/components/common/otp-input'

type ChangeEmailCardProps = {
  role: EmailChangeRole
  /** The address the account signs in with now. */
  email: string
  /** Called with the new address once the change is confirmed. */
  onChanged: (email: string) => void
}

type Step = 'form' | 'code' | 'done'

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function formatHoldDate(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })
}

/**
 * Signed-in email change. The password is checked first and a code goes to
 * the NEW address, so the change only happens once its owner has proved it.
 * The old address gets an alert with a link that undoes it for a week.
 */
export function ChangeEmailCard({ role, email, onChanged }: ChangeEmailCardProps) {
  const { replaceToken } = useAuth()
  const [step, setStep] = useState<Step>('form')
  const [newEmail, setNewEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [sending, setSending] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [holdUntil, setHoldUntil] = useState<string | null>(null)
  const [changedTo, setChangedTo] = useState('')

  const id = (name: string) => `${role}-${name}`
  const holdAction =
    role === 'seller' ? 'Buying points and raising rewards' : 'Prizes and gift points'

  function formProblem() {
    const trimmed = newEmail.trim()
    if (!validEmail(trimmed)) return 'Enter a valid new email address.'
    if (trimmed.toLowerCase() === email.trim().toLowerCase()) {
      return 'That is already your email.'
    }
    if (!password) return 'Enter your current password to continue.'
    return null
  }

  async function sendCode(event?: FormEvent) {
    event?.preventDefault()
    setError(null)
    setNotice(null)
    const problem = formProblem()
    if (problem) {
      setError(problem)
      return
    }
    setSending(true)
    try {
      await requestEmailChange(role, {
        new_email: newEmail.trim(),
        current_password: password,
      })
      setStep('code')
      setCode('')
      // The server answers the same whether or not the address can be used,
      // so this cannot promise a code is coming.
      setNotice(
        `If ${newEmail.trim()} can be used, a 6-digit code is on its way. If nothing arrives in a few minutes it may already belong to another account.`,
      )
    } catch (err) {
      setError(getErrorMessage(err, 'Could not send a code.'))
    } finally {
      setSending(false)
    }
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    const digits = code.replace(/\D/g, '')
    if (digits.length !== 6) {
      setError('Enter the 6-digit code from the email.')
      return
    }
    setSaving(true)
    try {
      const result = await confirmEmailChange(role, digits)
      // Every older token has stopped working, this one keeps this device in.
      replaceToken(result.token)
      setChangedTo(result.email)
      setHoldUntil(result.redemption_locked_until)
      setPassword('')
      setCode('')
      setNewEmail('')
      setStep('done')
      onChanged(result.email)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not change your email.'))
    } finally {
      setSaving(false)
    }
  }

  function startOver() {
    setStep('form')
    setCode('')
    setError(null)
    setNotice(null)
  }

  const holdDate = holdUntil ? formatHoldDate(holdUntil) : null

  return (
    <section
      id="email"
      className="scroll-mt-24 rounded-2xl border border-brand-ink/20 bg-card p-6 ring-border/60"
    >
      <div className="mb-4 flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Mail className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="font-poster text-xl">Sign-in email</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            You sign in with <span className="font-medium text-foreground">{email || '-'}</span>.
            To change it we confirm your password, then email a code to the new address.
          </p>
        </div>
      </div>

      {step === 'done' ? (
        <div className="space-y-3">
          <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
            <BadgeCheck className="size-4 shrink-0" />
            Email changed to {changedTo}.
          </p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>You are still signed in here. Every other device was signed out.</li>
            <li>
              We emailed your old address a link that undoes this for 7 days, in case it
              wasn’t you.
            </li>
            <li>
              {holdAction} are on hold{holdDate ? ` until ${holdDate}` : ' for a few days'} as
              a precaution.
            </li>
          </ul>
          <Button type="button" variant="outline" className="h-10" onClick={startOver}>
            Done
          </Button>
        </div>
      ) : step === 'code' ? (
        <form onSubmit={confirm} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor={id('email-code')}>6-digit code</Label>
            <OtpInput
              id={id('email-code')}
              value={code}
              onChange={setCode}
              disabled={saving}
            />
          </div>
          <FormAlert error={error} notice={error ? null : notice} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="h-10" disabled={saving || sending || code.length !== 6}>
              {saving ? <LoaderCircle className="animate-spin" /> : null}
              Confirm new email
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10"
              disabled={sending || saving}
              onClick={() => void sendCode()}
            >
              {sending ? <LoaderCircle className="animate-spin" /> : null}
              Send a new code
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-10 text-muted-foreground"
              disabled={sending || saving}
              onClick={startOver}
            >
              Use a different email
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={sendCode} className="grid gap-4 sm:grid-cols-2" noValidate>
          <div className="space-y-2">
            <Label htmlFor={id('new-email')}>New email</Label>
            <Input
              id={id('new-email')}
              type="email"
              autoComplete="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              className="h-10"
              disabled={sending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id('email-password')}>Current password</Label>
            <Input
              id={id('email-password')}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-10"
              disabled={sending}
            />
          </div>
          <div className="space-y-3 sm:col-span-2">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Changing your email signs you out of every other device and puts{' '}
              {holdAction.toLowerCase()} on hold for a few days. You can change it twice
              every 30 days.
            </p>
            <FormAlert error={error} notice={error ? null : notice} />
            <Button type="submit" className="h-10" disabled={sending || !newEmail || !password}>
              {sending ? <LoaderCircle className="animate-spin" /> : null}
              Email me a code
            </Button>
          </div>
        </form>
      )}
    </section>
  )
}
