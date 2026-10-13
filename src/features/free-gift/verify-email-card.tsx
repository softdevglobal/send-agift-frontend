import { useState } from 'react'
import { LoaderCircle } from 'lucide-react'

import { requestLoginCode, verifyLoginCode } from '@/api/auth'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getErrorMessage } from '@/lib/api'

type VerifyEmailCardProps = {
  email: string
  /** The code also signs the customer in again, so it hands back a new token. */
  onVerified: (token: string) => void
}

/**
 * Proves the signed-in customer reads their own inbox, with the same emailed
 * code they would sign in with. Entering it marks the email verified.
 */
export function VerifyEmailCard({ email, onVerified }: VerifyEmailCardProps) {
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    setError(null)
    setBusy(true)
    try {
      await requestLoginCode({ channel: 'email', destination: email })
      setSent(true)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not send a code.'))
    } finally {
      setBusy(false)
    }
  }

  async function confirm() {
    setError(null)
    setBusy(true)
    try {
      const result = await verifyLoginCode({ channel: 'email', destination: email, code })
      if (result.status !== 'signed_in') {
        setError('That code did not work.')
        return
      }
      onVerified(result.token)
    } catch (err) {
      setError(getErrorMessage(err, 'That code did not work.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <p className="text-sm text-muted-foreground">
        We will email a 6-digit code to <span className="font-medium text-foreground">{email}</span>.
      </p>
      {sent ? (
        <div className="flex gap-2">
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="6-digit code"
            aria-label="Email code"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
          />
          <Button type="button" onClick={() => void confirm()} disabled={busy || code.length !== 6}>
            {busy ? <LoaderCircle className="animate-spin" /> : 'Verify'}
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => void send()} disabled={busy}>
          {busy ? <LoaderCircle className="animate-spin" /> : 'Send code'}
        </Button>
      )}
      <FormAlert error={error} notice={null} />
    </div>
  )
}
