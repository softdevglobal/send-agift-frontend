import { useEffect, useState } from 'react'
import { BadgeCheck, LoaderCircle } from 'lucide-react'

import { requestPhoneCode, verifyPhoneCode } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { describeCodeProblem, type CodeProblem } from '@/features/auth/code-problem'
import { CodeProblemAlert } from '@/features/auth/code-problem-alert'

type VerifyPhoneCardProps = {
  phone: string
  verified: boolean
  onVerified: () => void
}

export function VerifyPhoneCard({ phone, verified, onVerified }: VerifyPhoneCardProps) {
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<CodeProblem | null>(null)
  const [wait, setWait] = useState(0)

  useEffect(() => {
    if (wait <= 0) return
    const id = window.setTimeout(() => setWait((s) => s - 1), 1000)
    return () => window.clearTimeout(id)
  }, [wait])

  if (verified) {
    return (
      <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
        <BadgeCheck className="size-4" /> Phone verified. You can sign in with it.
      </p>
    )
  }
  if (!phone.trim()) return null

  async function send() {
    setProblem(null)
    setBusy(true)
    try {
      await requestPhoneCode(phone)
      setSent(true)
      setWait(60)
    } catch (err) {
      const p = describeCodeProblem(err, 'Could not send a code.')
      setProblem(p)
      if (p.kind === 'wait') {
        setSent(true)
        setWait(p.seconds ?? 60)
      }
    } finally {
      setBusy(false)
    }
  }

  async function confirm() {
    setProblem(null)
    setBusy(true)
    try {
      await verifyPhoneCode(phone, code)
      onVerified()
    } catch (err) {
      setProblem(describeCodeProblem(err, 'That code did not work.'))
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
      {problem ? <CodeProblemAlert problem={problem} secondsLeft={wait} /> : null}
    </div>
  )
}
