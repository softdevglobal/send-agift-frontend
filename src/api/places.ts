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
  language?: string
  signal?: AbortSignal
}

type AddressFieldsFromPlace = {
  line1: string
  line2: string
  city: string
  region: string
  postal_code: string
  latitude: number | null
  longitude: number | null
}

/** Maps Place Details 1:1 onto AddressInput fields. Does not touch country_id. */
export function addressFieldsFromPlace(place: PlaceDetails): AddressFieldsFromPlace {
  return {
    line1: place.line1 ?? '',
    line2: place.line2 ?? '',
    city: place.city ?? '',
    region: place.region ?? '',
    postal_code: place.postal_code ?? '',
    latitude: place.latitude ?? null,
    longitude: place.longitude ?? null,
  }
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
  {
    sessionToken,
    countryCode,
    types = 'address',
    language = 'en',
    signal,
  }: AutocompleteOptions = {},
): Promise<PlaceSuggestion[]> {
  const trimmed = input.trim()
  if (!trimmed) return []

  const query = new URLSearchParams({
    input: trimmed,
    language,
    types,
  })
  if (sessionToken) query.set('session', sessionToken)
  if (countryCode) query.set('country', countryCode)

  const response = await api<PlaceAutocompleteResponse>(
    `/places/autocomplete?${query.toString()}`,
    { auth: false, signal },
  )
  return response?.suggestions ?? []
}

export function getPlaceDetails(
  placeId: string,
  options: { sessionToken?: string; language?: string; signal?: AbortSignal } = {},
): Promise<PlaceDetails> {
  const query = new URLSearchParams({
    place_id: placeId,
    language: options.language ?? 'en',
  })
  if (options.sessionToken) query.set('session', options.sessionToken)
  return api<PlaceDetails>(`/places/details?${query.toString()}`, {
    auth: false,
    signal: options.signal,
  })
}
