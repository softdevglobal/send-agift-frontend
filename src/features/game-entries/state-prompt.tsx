import { useEffect, useState } from 'react'
import { LoaderCircle, MapPin } from 'lucide-react'

import { getMyState, setMyState, type CustomerState } from '@/api/game-entries'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getErrorMessage } from '@/lib/api'
import { useAuth } from '@/features/auth/auth-context'

import { StateSelect } from './state-select'

const LATER_KEY = 'sendagift.state-prompt.later'

/**
 * Asks a signed-in customer for their state or region when their country has
 * states and they have not given one: every existing customer, the next
 * time they sign in. They can put it off for the session, but games and
 * game entries stay unavailable until they answer.
 */
export function StatePrompt() {
  const [state, setState] = useState<CustomerState | null>(null)
  const [choice, setChoice] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const { isAuthenticated, role } = useAuth()

  useEffect(() => {
    if (!isAuthenticated || role !== 'customer') {
      setOpen(false)
      return
    }
    if (sessionStorage.getItem(LATER_KEY)) return
    let cancelled = false
    getMyState()
      .then((s) => {
        if (cancelled) return
        setState(s)
        setOpen(s.state_required)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, role])

  if (!state || !open) return null

  function later() {
    sessionStorage.setItem(LATER_KEY, '1')
    setOpen(false)
  }

  async function save() {
    if (!choice) return setError('Choose your state or region.')
    setBusy(true)
    setError(null)
    try {
      await setMyState(choice)
      setOpen(false)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save your state.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && later()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <span className="mb-2 flex size-11 items-center justify-center rounded-xl bg-brand-violet/10 text-brand-violet">
            <MapPin className="size-5" />
          </span>
          <DialogTitle>Which state or region do you live in?</DialogTitle>
          <DialogDescription>
            Games and competitions are offered state by state. Tell us yours to use games and game entries. It can only
            be changed occasionally, so choose the one you live in.
          </DialogDescription>
        </DialogHeader>
        <StateSelect countryId={state.country_id} value={choice} onChange={setChoice} id="state-prompt" />
        <FormAlert error={error} />
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button className="h-11 flex-1" onClick={() => void save()} disabled={busy || !choice}>
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Save
          </Button>
          <Button variant="ghost" className="h-11 flex-1" onClick={later} disabled={busy}>
            Not now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
