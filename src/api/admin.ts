import { api } from '@/lib/api'
import type { Admin, Country, CountryInput, MessageResponse } from '@/api/types'

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

export function deleteCountry(id: string) {
  return api<MessageResponse>(`/admin/countries/${id}`, {
    method: 'DELETE',
  })
}
