import { useState } from 'react'
import { BadgeCheck, LoaderCircle, ShieldAlert } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

import { undoEmailChange, type EmailChangeRole } from '@/api/email-change'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/lib/api'

/**
 * The page behind the "This wasn't me" link in the alert sent to the old
 * address. It never acts on its own: a mail scanner opening the link must not
 * undo anything, so the person has to press the button.
 */
export function EmailUndoForm({ role }: { role: EmailChangeRole }) {
  const [params] = useSearchParams()
  const token = params.get('token')?.trim() ?? ''
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetTo = role === 'seller' ? '/seller/forgot-password' : '/forgot-password'
  const loginTo = role === 'seller' ? '/seller/login' : '/login'

  async function undo() {
    setError(null)
    setBusy(true)
    try {
      await undoEmailChange(role, token)
      setDone(true)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not undo the change.'))
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="mx-auto w-full max-w-[26rem] space-y-6">
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-medium tracking-[0.16em] text-emerald-600 uppercase">
            <BadgeCheck className="size-4" />
            Email restored
          </p>
          <h2 className="font-poster text-3xl text-brand-ink sm:text-4xl dark:text-foreground">
            Your old email is back
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Every device was signed out and your password was cleared, so nobody who changed
            it can get back in. Set a new password to sign in again. Some actions stay on hold
            for a few days as a precaution.
          </p>
        </div>
        <Button asChild className="h-11 w-full">
          <Link to={resetTo}>Set a new password</Link>
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          <Link to={loginTo} className="font-medium text-primary hover:text-primary/80">
            Back to sign in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[26rem] space-y-6">
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
          <ShieldAlert className="size-4" />
          {role === 'seller' ? 'Seller account' : 'Your account'}
        </p>
        <h2 className="font-poster text-3xl text-brand-ink sm:text-4xl dark:text-foreground">
          Undo your email change
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          If you didn’t change the email on your account, undo it here. We’ll put this address
          back, sign out every device and clear the password, so you can set a new one.
        </p>
      </div>

      {token ? (
        <>
          <FormAlert error={error} />
          <Button type="button" className="h-11 w-full" disabled={busy} onClick={() => void undo()}>
            {busy ? <LoaderCircle className="animate-spin" /> : null}
            This wasn’t me. Undo it
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            It was me?{' '}
            <Link to={loginTo} className="font-medium text-primary hover:text-primary/80">
              Nothing to do. Go to sign in
            </Link>
          </p>
        </>
      ) : (
        <FormAlert error="This link is missing its code. Open it again from the email we sent you." />
      )}
    </div>
  )
}
