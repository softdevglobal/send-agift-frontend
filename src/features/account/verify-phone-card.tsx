import { useState } from 'react'
import { BadgeCheck, LoaderCircle } from 'lucide-react'

import { requestPhoneCode, verifyPhoneCode } from '@/api/auth'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getErrorMessage } from '@/lib/api'

type VerifyPhoneCardProps = {
  phone: string
  verified: boolean
  onVerified: () => void
}

export function VerifyPhoneCard({ phone, verified, onVerified }: VerifyPhoneCardProps) {
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (verified) {
    return (
      <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
        <BadgeCheck className="size-4" /> Phone verified. You can sign in with it.
      </p>
    )
  }
  if (!phone.trim()) return null

  async function send() {
    setError(null)
    setBusy(true)
    try {
      await requestPhoneCode(phone)
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
      await verifyPhoneCode(phone, code)
      onVerified()
    } catch (err) {
      setError(getErrorMessage(err, 'That code did not work.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <p className="text-sm text-muted-foreground">
        Verify this number to sign in with a text code.
      </p>
      {sent ? (
        <div className="flex gap-2">
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="6-digit code"
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
