import { useEffect, useState, type KeyboardEvent } from 'react'
import { LoaderCircle, Mail, Smartphone } from 'lucide-react'

import {
  requestLoginCode,
  verifyLoginCode,
  type CodeChannel,
  type CodeLoginResult,
} from '@/api/auth'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhoneField } from '@/features/auth/phone-field'
import { api, getErrorMessage } from '@/lib/api'

const RESEND_SECONDS = 60

type CodeLoginPanelProps = {
  onResult: (result: CodeLoginResult) => void
  /**
   * From the review link in a gift email or text. The code goes to the address
   * that link was sent to, and signs in (making an account if there is none).
   */
  reviewToken?: string
}

type ReviewTarget = { channel: CodeChannel; destination: string }

export function CodeLoginPanel({ onResult, reviewToken }: CodeLoginPanelProps) {
  const [target, setTarget] = useState<ReviewTarget | null>(null)
  const [channel, setChannel] = useState<CodeChannel>('sms')
  const [destination, setDestination] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [wait, setWait] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!reviewToken) return
    api<ReviewTarget>(`/gift-reviews/${reviewToken}`, { auth: false })
      .then((p) => {
        setTarget(p)
        setChannel(p.channel)
      })
      .catch((err) => setError(getErrorMessage(err, 'This review link is not valid any more.')))
  }, [reviewToken])

  useEffect(() => {
    if (wait <= 0) return
    const id = window.setTimeout(() => setWait((s) => s - 1), 1000)
    return () => window.clearTimeout(id)
  }, [wait])

  function switchChannel(next: CodeChannel) {
    setChannel(next)
    setDestination('')
    setCode('')
    setSent(false)
    setError(null)
    setNotice(null)
  }

  async function sendCode() {
    setError(null)
    if (reviewToken) {
      setBusy(true)
      try {
        await api(`/gift-reviews/${reviewToken}/code`, { method: 'POST', auth: false })
        setSent(true)
        setNotice('A code is on its way.')
        setWait(RESEND_SECONDS)
      } catch (err) {
        setError(getErrorMessage(err, 'Could not send a code.'))
      } finally {
        setBusy(false)
      }
      return
    }
    const value = destination.trim()
    if (channel === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError('Enter a valid email.')
      return
    }
    if (channel === 'sms' && value.replace(/\D/g, '').length < 7) {
      setError('Enter your phone number.')
      return
    }
    setBusy(true)
    try {
      const res = await requestLoginCode({ channel, destination: value })
      setSent(true)
      setNotice(res.message)
      setWait(RESEND_SECONDS)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not send a code.'))
    } finally {
      setBusy(false)
    }
  }

  async function verify() {
    setError(null)
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit code.')
      return
    }
    setBusy(true)
    try {
      if (reviewToken) {
        const session = await api<{ token: string; role: 'customer' }>(
          `/gift-reviews/${reviewToken}/verify`,
          { method: 'POST', body: { code: code.trim() }, auth: false },
        )
        onResult({ status: 'signed_in', token: session.token, role: session.role })
        return
      }
      onResult(
        await verifyLoginCode({
          channel,
          destination: destination.trim(),
          code: code.trim(),
        }),
      )
    } catch (err) {
      setError(getErrorMessage(err, 'That code did not work.'))
      setBusy(false)
    }
  }

  function onEnter(event: KeyboardEvent) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (busy) return
    void (sent ? verify() : sendCode())
  }

  if (reviewToken) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant={channel === 'sms' ? 'default' : 'outline'} disabled>
            <Smartphone /> Phone
          </Button>
          <Button type="button" variant={channel === 'email' ? 'default' : 'outline'} disabled>
            <Mail /> Email
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {target
            ? `We'll send a one-time code to ${target.destination}. Enter it to sign in and review your gift. We'll set up your account if you don't have one.`
            : 'Loading your gift…'}
        </p>
        {sent ? (
          <div className="space-y-2">
            <Label htmlFor="login-code">6-digit code</Label>
            <Input
              id="login-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
              onKeyDown={onEnter}
              className="h-12 bg-surface text-center text-lg tracking-[0.5em]"
            />
            <div className="flex justify-end text-xs">
              <button
                type="button"
                className="font-medium text-primary disabled:text-muted-foreground"
                disabled={wait > 0 || busy}
                onClick={() => void sendCode()}
              >
                {wait > 0 ? `Resend in ${wait}s` : 'Resend code'}
              </button>
            </div>
          </div>
        ) : null}
        <FormAlert error={error} notice={notice} />
        <Button
          type="button"
          size="lg"
          disabled={busy || !target}
          onClick={() => void (sent ? verify() : sendCode())}
          className="h-12 w-full rounded-full text-sm font-semibold"
        >
          {busy ? <LoaderCircle className="animate-spin" /> : null}
          {sent ? 'Sign in & review' : 'Send code'}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={channel === 'sms' ? 'default' : 'outline'}
          onClick={() => switchChannel('sms')}
        >
          <Smartphone /> Phone
        </Button>
        <Button
          type="button"
          variant={channel === 'email' ? 'default' : 'outline'}
          onClick={() => switchChannel('email')}
        >
          <Mail /> Email
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="code-destination">
          {channel === 'sms' ? 'Phone number' : 'Email'}
        </Label>
        {channel === 'sms' ? (
          <PhoneField
            id="code-destination"
            value={destination}
            onChange={setDestination}
            disabled={sent}
          />
        ) : (
          <Input
            id="code-destination"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            onKeyDown={onEnter}
            className="h-12 bg-surface"
            disabled={sent}
          />
        )}
      </div>

      {sent ? (
        <div className="space-y-2">
          <Label htmlFor="login-code">6-digit code</Label>
          <Input
            id="login-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            onKeyDown={onEnter}
            className="h-12 bg-surface text-center text-lg tracking-[0.5em]"
          />
          <div className="flex justify-between text-xs">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => switchChannel(channel)}
            >
              Change {channel === 'sms' ? 'number' : 'email'}
            </button>
            <button
              type="button"
              className="font-medium text-primary disabled:text-muted-foreground"
              disabled={wait > 0 || busy}
              onClick={() => void sendCode()}
            >
              {wait > 0 ? `Resend in ${wait}s` : 'Resend code'}
            </button>
          </div>
        </div>
      ) : null}

      <FormAlert error={error} notice={notice} />

      <Button
        type="button"
        size="lg"
        disabled={busy}
        onClick={() => void (sent ? verify() : sendCode())}
        className="h-12 w-full rounded-full text-sm font-semibold"
      >
        {busy ? <LoaderCircle className="animate-spin" /> : null}
        {sent ? 'Sign in' : 'Send code'}
      </Button>
    </div>
  )
}
