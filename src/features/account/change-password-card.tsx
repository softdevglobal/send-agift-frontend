import { useState, type FormEvent } from 'react'
import { KeyRound, LoaderCircle } from 'lucide-react'

import { changeCustomerPassword } from '@/api/customers'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

/** Fired after a password change so the temporary-password banner can go. */
export const PASSWORD_CHANGED_EVENT = 'sendagift:password-changed'

/** The customer's own password change. Highlighted while it's still temporary. */
export function ChangePasswordCard({ temporary = false }: { temporary?: boolean }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    if (next.length < 8) return setError('Your new password needs at least 8 characters.')
    if (next !== confirm) return setError('The new passwords don’t match.')
    if (next === current) return setError('Choose a password different from the current one.')
    setSaving(true)
    try {
      await changeCustomerPassword({ current_password: current, new_password: next })
      setCurrent('')
      setNext('')
      setConfirm('')
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

  return (
    <section
      id="password"
      className={cn(
        'scroll-mt-24 rounded-2xl bg-card p-6 ring-1',
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
          <h2 className="font-display text-xl">Password</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {highlight
              ? 'You’re still using the temporary password from your gift email. Choose your own to keep your account safe.'
              : 'Change the password you sign in with.'}
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3" noValidate>
        <div className="space-y-2">
          <Label htmlFor="current-password">{highlight ? 'Temporary password' : 'Current password'}</Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="h-10"
          />
        </div>
        <div className="space-y-3 sm:col-span-3">
          <FormAlert error={error} notice={notice} />
          <Button type="submit" disabled={saving || !current || !next || !confirm} className="h-10">
            {saving ? <LoaderCircle className="animate-spin" /> : null}
            Change password
          </Button>
        </div>
      </form>
    </section>
  )
}
