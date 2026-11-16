import { useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'

import { listStates, type State } from '@/api/game-entries'
import { selectClassName } from '@/lib/form-styles'
import { cn } from '@/lib/utils'

/**
 * The state or region of a country, as a dropdown. The list comes from
 * Google Places: the server fetches a country's states the first time they
 * are asked for and keeps them, so the first visitor may wait a moment.
 *
 * Renders nothing for a country with no states. onRequired tells the form
 * whether a choice is needed, so it can hold sign-up until one is made.
 */
export function StateSelect({
  countryId,
  value,
  onChange,
  onRequired,
  id = 'state',
  className,
}: {
  countryId: string
  value: string
  onChange: (stateId: string) => void
  onRequired?: (required: boolean) => void
  id?: string
  className?: string
}) {
  const [states, setStates] = useState<State[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setStates([])
    if (!countryId) {
      onRequired?.(false)
      return
    }
    setLoading(true)
    listStates(countryId)
      .then((list) => {
        if (cancelled) return
        setStates(list)
        onRequired?.(list.length > 0)
        if (value && !list.some((s) => s.id === value)) onChange('')
      })
      .catch(() => {
        if (cancelled) return
        setStates([])
        onRequired?.(false)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // The country decides the list; the callbacks are stable enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryId])

  if (!countryId) return null
  if (loading) {
    return (
      <div className={cn('space-y-1.5', className)}>
        <label htmlFor={id} className="text-sm font-medium">
          State or region
        </label>
        <div
          id={id}
          className={cn(selectClassName, 'flex items-center gap-2 text-muted-foreground')}
          role="status"
        >
          <LoaderCircle className="size-4 animate-spin" />
          Loading states…
        </div>
      </div>
    )
  }
  if (states.length === 0) return null
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium">
        State or region
      </label>
      <select id={id} className={selectClassName} value={value} onChange={(e) => onChange(e.target.value)} required>
        <option value="">Choose your state or region</option>
        {states.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted-foreground">Games are offered state by state, so we need the one you live in.</p>
    </div>
  )
}
