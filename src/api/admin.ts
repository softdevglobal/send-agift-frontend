import { api } from '@/lib/api'
import type { Country, CountryInput } from '@/api/countries'

export type Admin = {
  id: string
  email: string
  display_name?: string
  created_at?: string
  updated_at?: string
}

export function getAdminMe() {
  return api<Admin>('/admin/me')
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
  return api<{ message?: string }>(`/admin/countries/${id}`, {
    method: 'DELETE',
  })
}
