import { useState, type FormEvent } from 'react'
import { KeyRound, LoaderCircle } from 'lucide-react'

import {
  requestCustomerPasswordCode,
  resetCustomerPasswordWithCode,
} from '@/api/customers'
import {
  requestSellerPasswordCode,
  resetSellerPasswordWithCode,
} from '@/api/sellers'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

/** Fired after a password change so the temporary-password banner can go. */
export const PASSWORD_CHANGED_EVENT = 'sendagift:password-changed'

type PasswordRole = 'customer' | 'seller'

/**
 * Signed-in password change. A code is emailed first, then the new password
 * is saved only when that code matches.
 */
export function ChangePasswordCard({
  temporary = false,
  role = 'customer',
}: {
  temporary?: boolean
  role?: PasswordRole
}) {
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const passwordError = () => {
    if (next.length < 8) return 'Your new password needs at least 8 characters.'
    if (next !== confirm) return 'The new passwords don’t match.'
    return null
  }

  async function sendCode() {
    setError(null)
    setNotice(null)
    const problem = passwordError()
    if (problem) {
      setError(problem)
      return
    }
    setSending(true)
    try {
      const result =
        role === 'seller' ? await requestSellerPasswordCode() : await requestCustomerPasswordCode()
      setCodeSent(true)
      setNotice(result.message)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not send a code.'))
    } finally {
      setSending(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    const problem = passwordError()
    if (problem) {
      setError(problem)
      return
    }
    const digits = code.replace(/\D/g, '')
    if (digits.length !== 6) {
      setError('Enter the 6-digit code from your email.')
      return
    }
    setSaving(true)
    try {
      const body = { code: digits, new_password: next }
      if (role === 'seller') await resetSellerPasswordWithCode(body)
      else await resetCustomerPasswordWithCode(body)
      setNext('')
      setConfirm('')
      setCode('')
      setCodeSent(false)
      setDone(true)
      setNotice('Password changed. Use your new password next time you sign in.')
      window.dispatchEvent(new Event(PASSWORD_CHANGED_EVENT))
    } catch (err) {
      setError(getErrorMessage(err, 'Could not change your password.'))
    } finally {
      setSaving(false)
    }
  }

  const highlight = temporary && !done
  const id = (name: string) => `${role}-${name}`

  return (
    <section
      id="password"
      className={cn(
        'scroll-mt-24 rounded-2xl border border-brand-ink/20 bg-card p-6',
        highlight ? 'ring-2 ring-amber-300' : 'ring-border/60',
      )}
    >
      <div className="mb-4 flex items-start gap-3">
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-xl',
            highlight ? 'bg-amber-100 text-amber-700' : 'bg-accent text-accent-foreground',
          )}
        >
          <KeyRound className="size-5" />
        </span>
        <div>
          <h2 className="font-poster text-xl">Password</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {highlight
              ? 'You’re still using a temporary password. We’ll email a code so you can choose your own.'
              : 'We’ll email a code to confirm this change. Your current password stays until the code matches.'}
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <div className="space-y-2">
          <Label htmlFor={id('new-password')}>New password</Label>
          <Input
            id={id('new-password')}
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(event) => setNext(event.target.value)}
            className="h-10"
            disabled={saving}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={id('confirm-password')}>Confirm new password</Label>
          <Input
            id={id('confirm-password')}
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className="h-10"
            disabled={saving}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={id('password-code')}>Email code</Label>
          <Input
            id={id('password-code')}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="6-digit code"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            className="h-10 tracking-[0.3em]"
            disabled={saving}
          />
        </div>
        <div className="space-y-3 sm:col-span-2">
          <FormAlert error={error} notice={error ? null : notice} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="h-10" disabled={sending || saving} onClick={() => void sendCode()}>
              {sending ? <LoaderCircle className="animate-spin" /> : null}
              {codeSent ? 'Send a new code' : 'Email me a code'}
            </Button>
            <Button type="submit" className="h-10" disabled={saving || sending || !next || !confirm || code.length !== 6}>
              {saving ? <LoaderCircle className="animate-spin" /> : null}
              Change password
            </Button>
          </div>
        </div>
      </form>
    </section>
  )
}
