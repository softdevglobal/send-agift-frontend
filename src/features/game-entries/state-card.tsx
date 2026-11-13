import { useCallback, useEffect, useState } from 'react'
import { LoaderCircle, MapPin } from 'lucide-react'

import { getMyState, setMyState, type CustomerState } from '@/api/game-entries'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { StateSelect } from '@/features/game-entries/state-select'
import { getErrorMessage } from '@/lib/api'

function longDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * The state or region on the account, in Settings. Searched on Google within
 * the customer's country. The first answer is saved as given; changing it
 * later needs a verified phone and waits out a cooldown, which the server
 * enforces and this explains.
 */
export function StateCard() {
  const [state, setState] = useState<CustomerState | null>(null)
  const [choice, setChoice] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const next = await getMyState()
      setState(next)
      setChoice(next.state?.id ?? '')
    } catch {
      setState(null)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (!state) return null

  const current = state.state
  const until = state.can_change_at ? new Date(state.can_change_at) : null
  const locked = Boolean(current && until && until > new Date())
  const needsPhone = Boolean(current && !state.phone_verified)
  const changed = choice !== '' && choice !== current?.id

  async function save() {
    if (!choice) return
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const next = await setMyState(choice)
      setState(next)
      setChoice(next.state?.id ?? '')
      setNotice('State saved.')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save your state.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="flex items-center gap-2 font-poster text-xl">
        <MapPin className="size-5" />
        State or region
      </h2>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">
        {current ? (
          <>
            Saved as <strong className="text-foreground">{current.name}</strong>.{' '}
            {locked && until
              ? `It can be changed again on ${longDate(until.toISOString())}.`
              : needsPhone
                ? 'Verify your phone number above to change it.'
                : 'You can change it below. After a change it stays fixed for a while.'}
          </>
        ) : (
          'Games and game entries are offered state by state, so we need the one you live in.'
        )}
      </p>

      {locked || needsPhone ? null : (
        <div className="space-y-4">
          <StateSelect countryId={state.country_id} value={choice} onChange={setChoice} id="settings-state" />
          <FormAlert error={error} notice={notice} />
          <Button type="button" className="h-10" disabled={!changed || saving} onClick={() => void save()}>
            {saving ? <LoaderCircle className="animate-spin" /> : null}
            {current ? 'Change state' : 'Save state'}
          </Button>
        </div>
      )}
      {locked || needsPhone ? <FormAlert notice={notice} className="mt-2" /> : null}
    </section>
  )
}
