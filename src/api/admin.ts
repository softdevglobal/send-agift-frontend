import { api, ApiError } from '@/lib/api'
import type {
  Admin,
  AdminSellerList,
  Country,
  CountryCapability,
  CountryCapabilityEntry,
  CountryCapabilityInput,
  CountryInput,
  MessageResponse,
  Seller,
  SellerDetails,
} from '@/api/types'

export type { Admin } from '@/api/types'

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
    // No capability row is fine. The country can still be removed.
    if (!(err instanceof ApiError && err.status === 404)) throw err
  }

  return api<MessageResponse>(`/admin/countries/${id}`, {
    method: 'DELETE',
  })
}

export function listCountryCapabilities() {
  return api<CountryCapabilityEntry[]>('/admin/country-capabilities')
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

export type SellerVerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected'

export function listAdminSellers(
  params: { status?: SellerVerificationStatus | ''; q?: string; limit?: number; offset?: number },
  signal?: AbortSignal,
) {
  const search = new URLSearchParams()
  if (params.status) search.set('status', params.status)
  if (params.q) search.set('q', params.q)
  if (params.limit) search.set('limit', String(params.limit))
  if (params.offset) search.set('offset', String(params.offset))
  const qs = search.toString()
  return api<AdminSellerList>(`/admin/sellers${qs ? `?${qs}` : ''}`, { signal })
}

export function getAdminSeller(id: string) {
  return api<SellerDetails>(`/admin/sellers/${id}`)
}

/** Approves or rejects a seller; the seller is emailed the outcome. */
export function reviewSeller(id: string, body: { status: 'verified' | 'rejected'; note?: string }) {
  return api<Seller>(`/admin/sellers/${id}/verification`, {
    method: 'PATCH',
    body,
  })
}
