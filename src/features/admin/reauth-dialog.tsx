import { useEffect, useRef, useState, type FormEvent } from 'react'
import { LoaderCircle, ShieldCheck } from 'lucide-react'

import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { confirmPassword, getErrorMessage, setReauthPrompt } from '@/lib/api'

type Confirmation = Awaited<ReturnType<typeof confirmPassword>>

/**
 * Asks the admin to confirm their password before a high-risk action —
 * moving prize money or points, voiding, settling, cancelling, drawing. The
 * confirmation lasts a few minutes, so a run of actions asks only once.
 */
export function ReauthDialog() {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resolver = useRef<((value: Confirmation | null) => void) | null>(null)

  useEffect(() => {
    setReauthPrompt(
      () =>
        new Promise<Confirmation | null>((resolve) => {
          resolver.current = resolve
          setPassword('')
          setError(null)
          setOpen(true)
        }),
    )
    return () => setReauthPrompt(null)
  }, [])

  function finish(value: Confirmation | null) {
    resolver.current?.(value)
    resolver.current = null
    setOpen(false)
    setPassword('')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!password) return
    setBusy(true)
    setError(null)
    try {
      finish(await confirmPassword(password))
    } catch (err) {
      setError(getErrorMessage(err, 'Could not confirm your password.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && finish(null)}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              Confirm it is you
            </DialogTitle>
            <DialogDescription>
              This action moves money or points. Enter your password to continue — you will not be asked again for a
              few minutes.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4 space-y-2">
            <Label htmlFor="reauth-password">Password</Label>
            <Input
              id="reauth-password"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10"
            />
            <FormAlert error={error} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-10" disabled={busy} onClick={() => finish(null)}>
              Cancel
            </Button>
            <Button type="submit" className="h-10" disabled={busy || !password}>
              {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
