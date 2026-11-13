import { useEffect, useState } from 'react'
import { MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'

import { getMyState, type CustomerState } from '@/api/game-entries'

/**
 * The state or region on the account, on the profile page. Changing it is
 * limited (a cooldown and a verified phone), so it is done from Game entries.
 */
export function StateCard() {
  const [state, setState] = useState<CustomerState | null>(null)

  useEffect(() => {
    getMyState()
      .then(setState)
      .catch(() => setState(null))
  }, [])

  if (!state || (!state.state && !state.state_required)) return null
  const until = state.can_change_at ? new Date(state.can_change_at) : null
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="flex items-center gap-2 font-poster text-xl">
        <MapPin className="size-5" />
        State or region
      </h2>
      <p className="mt-2 text-sm">
        {state.state ? <strong>{state.state.name}</strong> : 'Not given yet.'}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {state.state
          ? until && until > new Date()
            ? `It can be changed again on ${until.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}.`
            : 'Changing it needs a verified phone number, and then waits a while before it can change again.'
          : 'Games and game entries are offered state by state, so we need the one you live in.'}{' '}
        <Link to="/account/game-entries" className="font-medium text-primary hover:underline">
          {state.state ? 'Change it' : 'Add it'}
        </Link>
      </p>
    </section>
  )
}
