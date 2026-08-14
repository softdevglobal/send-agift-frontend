import { api } from '@/lib/api'

export type CountryInput = {
  iso_code: string
  name: string
  default_currency: string
  default_timezone: string
  status?: string
}

export type Country = {
  id: string
  iso_code: string
  name: string
  default_currency: string
  default_timezone: string
  status: string
  created_at: string
  updated_at: string
}

export function listCountries() {
  return api<Country[]>('/countries', { auth: false })
}

export function getCountry(id: string) {
  return api<Country>(`/countries/${id}`, { auth: false })
}
