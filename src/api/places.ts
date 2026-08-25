import { api } from '@/lib/api'
import type {
  PlaceAutocompleteResponse,
  PlaceDetails,
  PlaceSuggestion,
} from '@/api/types'

export type { PlaceDetails, PlaceSuggestion }

/** Narrows what kind of place is suggested. */
export type PlaceTypeFilter = 'address' | 'cities' | 'regions' | 'establishment'

type AutocompleteOptions = {
  /** Groups keystrokes + the follow-up details call into one billed session. */
  sessionToken?: string
  /** ISO-3166-1 alpha-2 code that restricts results to one country. */
  countryCode?: string
  types?: PlaceTypeFilter
  signal?: AbortSignal
}

/** Creates a session token for one address search, from first keystroke to pick. */
export function newPlacesSessionToken(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export async function autocompletePlaces(
  input: string,
  { sessionToken, countryCode, types, signal }: AutocompleteOptions = {},
): Promise<PlaceSuggestion[]> {
  const query = new URLSearchParams({ input })
  if (sessionToken) query.set('session', sessionToken)
  if (countryCode) query.set('country', countryCode)
  if (types) query.set('types', types)

  const response = await api<PlaceAutocompleteResponse>(
    `/places/autocomplete?${query.toString()}`,
    { auth: false, signal },
  )
  return response?.suggestions ?? []
}

export function getPlaceDetails(
  placeId: string,
  options: { sessionToken?: string; signal?: AbortSignal } = {},
): Promise<PlaceDetails> {
  const query = new URLSearchParams({ place_id: placeId })
  if (options.sessionToken) query.set('session', options.sessionToken)
  return api<PlaceDetails>(`/places/details?${query.toString()}`, {
    auth: false,
    signal: options.signal,
  })
}
