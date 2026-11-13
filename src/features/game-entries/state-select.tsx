import { useEffect, useState } from 'react'
import { CircleCheck, LoaderCircle } from 'lucide-react'

import { listCountries } from '@/api/countries'
import { listStates, resolveState } from '@/api/game-entries'
import { AddressAutocomplete } from '@/components/common/place-autocomplete'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

/** Country ISO codes by id, read once and shared by every state field. */
let isoByCountry: Promise<Map<string, string>> | null = null
function countryIso(countryId: string) {
  isoByCountry ??= listCountries()
    .then((list) => new Map(list.map((c) => [c.id, c.iso_code])))
    .catch(() => {
      isoByCountry = null
      return new Map<string, string>()
    })
  return isoByCountry.then((map) => map.get(countryId))
}

/**
 * The customer's state or region, searched on Google Places within their
 * country. Picking a suggestion checks it on the server and gives back our
 * state's id, which is what [onChange] receives; typing again clears it.
 *
 * Shown as soon as a country is chosen. onRequired(true) tells the form a
 * state is needed; a customer whose country has no states can say so.
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
  const [iso, setIso] = useState<string | undefined>()
  /** The country's code has been looked up (found or not). */
  const [isoReady, setIsoReady] = useState(false)
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState('')
  const [resolving, setResolving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [noStates, setNoStates] = useState(false)

  // A new country: look up its code, and show the state already chosen.
  useEffect(() => {
    let cancelled = false
    setQuery('')
    setPicked('')
    setError(null)
    setNoStates(false)
    setIsoReady(false)
    if (!countryId) {
      setIso(undefined)
      onRequired?.(false)
      return
    }
    onRequired?.(true)
    void countryIso(countryId).then((code) => {
      if (cancelled) return
      setIso(code)
      setIsoReady(true)
    })
    if (value) {
      listStates(countryId)
        .then((list) => {
          if (cancelled) return
          const current = list.find((s) => s.id === value)
          if (current) {
            setQuery(current.name)
            setPicked(current.name)
          } else {
            onChange('')
          }
        })
        .catch(() => undefined)
    }
    return () => {
      cancelled = true
    }
    // The country decides everything here; the callbacks are stable enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryId])

  if (!countryId) return null

  async function pick(placeId: string, label: string) {
    setResolving(true)
    setError(null)
    setQuery(label)
    try {
      const state = await resolveState(countryId, placeId)
      setQuery(state.name)
      setPicked(state.name)
      onChange(state.id)
    } catch (err) {
      setPicked('')
      onChange('')
      setError(getErrorMessage(err, 'Could not use that state. Pick another from the list.'))
    } finally {
      setResolving(false)
    }
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      {noStates ? null : (
        <div className="relative">
          <AddressAutocomplete
            key={countryId}
            id={id}
            types="states"
            countryCode={iso}
            value={query}
            resolveDetails={false}
            onQueryChange={(text) => {
              setQuery(text)
              setError(null)
              // Typing over a chosen state un-chooses it.
              if (picked && text !== picked) {
                setPicked('')
                onChange('')
              }
            }}
            onSelectSuggestion={(s) => void pick(s.place_id, s.main_text || s.description)}
            label="State or region"
            placeholder="Start typing your state or region…"
            helperText=""
            disabled={resolving || !isoReady}
          />
          {resolving ? (
            <LoaderCircle className="absolute top-10 right-3 size-4 animate-spin text-muted-foreground" />
          ) : value && picked ? (
            <CircleCheck className="absolute top-10 right-3 size-4 text-emerald-600" aria-label="State chosen" />
          ) : null}
        </div>
      )}
      {error ? (
        <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">
          {error}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {noStates
            ? 'No state needed.'
            : 'Pick yours from the list. Games are offered state by state, so we need the one you live in.'}{' '}
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => {
              const next = !noStates
              setNoStates(next)
              setQuery('')
              setPicked('')
              onChange('')
              onRequired?.(!next)
            }}
          >
            {noStates ? 'Choose a state' : 'My country has no states'}
          </button>
        </p>
      )}
    </div>
  )
}
