import { api } from '@/lib/api'
import type { Country } from '@/api/types'

export type { Country, CountryInput } from '@/api/types'

export function listCountries() {
  return api<Country[]>('/countries', { auth: false })
}

export function getCountry(id: string) {
  return api<Country>(`/countries/${id}`, { auth: false })
}
