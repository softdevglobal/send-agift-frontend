import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { LoaderCircle, MapPin, Search } from 'lucide-react'

import {
  autocompletePlaces,
  getPlaceDetails,
  newPlacesSessionToken,
  type PlaceDetails,
  type PlaceSuggestion,
  type PlaceTypeFilter,
} from '@/api/places'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const DEBOUNCE_MS = 250
const MIN_QUERY_LENGTH = 3

type PlaceAutocompleteProps = {
  /** Called with the resolved place once the user picks a suggestion. */
  onSelect?: (place: PlaceDetails) => void
  /**
   * Called with the raw prediction as soon as it is picked. Pair it with
   * resolveDetails={false} when the label alone is enough — that skips the
   * billed Place Details call.
   */
  onSelectSuggestion?: (suggestion: PlaceSuggestion) => void
  /** Set false to keep the prediction text without resolving it. Default true. */
  resolveDetails?: boolean
  /** Narrows results, e.g. "cities" for a city-level field. */
  types?: PlaceTypeFilter
  /** Controlled text, for fields whose value is stored by the parent form. */
  value?: string
  onQueryChange?: (value: string) => void
  /** ISO-3166-1 alpha-2 code (e.g. "LK") that restricts results to a country. */
  countryCode?: string
  label?: string
  placeholder?: string
  helperText?: string
  disabled?: boolean
  className?: string
  id?: string
}

/**
 * Google Places address search. Requests go through our own API so the Google
 * key stays server-side. Picking a suggestion hands the caller the address
 * already split into line1 / city / region / postal code / lat-lng.
 */
export function PlaceAutocomplete({
  onSelect,
  onSelectSuggestion,
  resolveDetails = true,
  types,
  value,
  onQueryChange,
  countryCode,
  label = 'Search for an address',
  placeholder = 'Start typing an address…',
  helperText = 'Pick a result to fill the fields below, or enter them manually.',
  disabled = false,
  className,
  id,
}: PlaceAutocompleteProps) {
  const generatedId = useId()
  const inputId = id ?? `place-search-${generatedId}`
  const listboxId = `${inputId}-listbox`

  const [internalQuery, setInternalQuery] = useState('')
  const controlled = value !== undefined
  const query = controlled ? value : internalQuery

  function setQuery(next: string) {
    if (!controlled) setInternalQuery(next)
    onQueryChange?.(next)
  }

  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [error, setError] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  // One session token spans every keystroke of a search plus the details call
  // that follows, so Google bills the whole lookup once.
  const sessionToken = useRef(newPlacesSessionToken())
  // Set while applying a selection, so writing the chosen address back into the
  // input does not immediately trigger another search.
  const skipNextSearch = useRef(false)
  // Only search once the user has actually typed here. A controlled value that
  // arrives pre-filled (editing a saved record) must not pop the dropdown open.
  const userTyped = useRef(false)

  // Debounced search. Each run aborts the previous in-flight request so a slow
  // reply for an old prefix cannot overwrite newer results.
  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false
      return
    }
    if (!userTyped.current) return
    const trimmed = query.trim()
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions([])
      setOpen(false)
      setSearching(false)
      return
    }

    const controller = new AbortController()
    setSearching(true)
    const timer = window.setTimeout(() => {
      autocompletePlaces(trimmed, {
        sessionToken: sessionToken.current,
        countryCode,
        types,
        signal: controller.signal,
      })
        .then((results) => {
          setSuggestions(results)
          setActiveIndex(-1)
          setOpen(true)
          setError(null)
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return
          if (err instanceof DOMException && err.name === 'AbortError') return
          setSuggestions([])
          setError('Address search is unavailable right now.')
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false)
        })
    }, DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query, countryCode, types])

  // Close the dropdown when focus or a click lands outside the field.
  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  async function handlePick(suggestion: PlaceSuggestion) {
    setOpen(false)
    setError(null)
    onSelectSuggestion?.(suggestion)

    if (!resolveDetails) {
      skipNextSearch.current = true
      setQuery(suggestion.description)
      setSuggestions([])
      sessionToken.current = newPlacesSessionToken()
      return
    }

    setResolving(true)
    try {
      const details = await getPlaceDetails(suggestion.place_id, {
        sessionToken: sessionToken.current,
      })
      skipNextSearch.current = true
      setQuery(details.formatted_address || suggestion.description)
      setSuggestions([])
      onSelect?.(details)
      // The session ended with this pick — the next search starts a new one.
      sessionToken.current = newPlacesSessionToken()
    } catch {
      setError('Could not load that address. Try another result.')
    } finally {
      setResolving(false)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }
    if (!open || suggestions.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1))
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      // Only swallow Enter when a suggestion is highlighted, so the key still
      // submits the surrounding form otherwise.
      event.preventDefault()
      void handlePick(suggestions[activeIndex])
    }
  }

  const busy = searching || resolving

  return (
    <div className={cn('space-y-2', className)} ref={containerRef}>
      {label ? <Label htmlFor={inputId}>{label}</Label> : null}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          autoComplete="off"
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => {
            userTyped.current = true
            setQuery(event.target.value)
          }}
          onFocus={() => {
            if (suggestions.length) setOpen(true)
          }}
          onKeyDown={handleKeyDown}
          className="h-11 bg-surface pl-9 pr-9"
        />
        {busy ? (
          <LoaderCircle className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}

        {open && suggestions.length > 0 ? (
          <ul
            id={listboxId}
            role="listbox"
            className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
          >
            {suggestions.map((suggestion, index) => (
              <li key={suggestion.place_id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => void handlePick(suggestion)}
                  className={cn(
                    'flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors',
                    index === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60',
                  )}
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {suggestion.main_text || suggestion.description}
                    </span>
                    {suggestion.secondary_text ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {suggestion.secondary_text}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  )
}
