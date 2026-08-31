import { api, ApiError } from '@/lib/api'
import type {
  Admin,
  Country,
  CountryCapability,
  CountryCapabilityEntry,
  CountryCapabilityInput,
  CountryInput,
  MessageResponse,
} from '@/api/types'

export type { Admin } from '@/api/types'
export type {
  CountryCapability,
  CountryCapabilityEntry,
  CountryCapabilityFlag,
  CountryCapabilityInput,
} from '@/api/types'

export type AdminUpdateRequest = {
  display_name?: string
  image_url?: string
}

export function getAdminMe() {
  return api<Admin>('/admin/me')
}

export function updateAdminMe(body: AdminUpdateRequest) {
  return api<Admin>('/admin/me', {
    method: 'PUT',
    body,
  })
}

export function createCountry(body: CountryInput) {
  return api<Country>('/admin/countries', {
    method: 'POST',
    body,
  })
}

export function updateCountry(id: string, body: CountryInput) {
  return api<Country>(`/admin/countries/${id}`, {
    method: 'PUT',
    body,
  })
}

export async function deleteCountry(id: string) {
  try {
    await deleteCountryCapabilities(id)
  } catch (err) {
    // No capability row is fine — the country can still be removed.
    if (!(err instanceof ApiError && err.status === 404)) throw err
  }

  return api<MessageResponse>(`/admin/countries/${id}`, {
    method: 'DELETE',
  })
}

export function listCountryCapabilities() {
  return api<CountryCapabilityEntry[]>('/admin/country-capabilities')
}

export function getCountryCapabilities(countryId: string) {
  return api<CountryCapabilityEntry>(`/admin/countries/${countryId}/capabilities`)
}

export function createCountryCapabilities(countryId: string, body: CountryCapabilityInput) {
  return api<CountryCapability>(`/admin/countries/${countryId}/capabilities`, {
    method: 'POST',
    body,
  })
}

export function updateCountryCapabilities(countryId: string, body: CountryCapabilityInput) {
  return api<CountryCapability>(`/admin/countries/${countryId}/capabilities`, {
    method: 'PUT',
    body,
  })
}

export function deleteCountryCapabilities(countryId: string) {
  return api<MessageResponse>(`/admin/countries/${countryId}/capabilities`, {
    method: 'DELETE',
  })
}
