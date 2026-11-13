import { useEffect, useState } from 'react'

import { listStates, type State } from '@/api/game-entries'
import { selectClassName } from '@/lib/form-styles'
import { cn } from '@/lib/utils'

/**
 * The state or region of a country, picked from the list the country has.
 * Renders nothing for a country without states. onRequired tells the form
 * whether a choice is needed, so it can block sign-up until one is made.
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

  useEffect(() => {
    let cancelled = false
    if (!countryId) {
      setStates([])
      onRequired?.(false)
      return
    }
    listStates(countryId)
      .then((list) => {
        if (cancelled) return
        setStates(list)
        onRequired?.(list.length > 0)
        if (!list.some((s) => s.id === value)) onChange('')
      })
      .catch(() => {
        if (cancelled) return
        setStates([])
        onRequired?.(false)
      })
    return () => {
      cancelled = true
    }
    // The country decides the list; the callbacks are stable enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryId])

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
      <p className="text-xs text-muted-foreground">
        Games and competitions are offered state by state, so we need the one you live in.
      </p>
    </div>
  )
}
