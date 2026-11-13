import { listCountries } from '@/api/countries'

/** Country ISO codes ("AU") by country id, read once and shared. */
let isoById: Promise<Map<string, string>> | null = null

export function countryIsoFor(countryId: string): Promise<string | undefined> {
  isoById ??= listCountries()
    .then((list) => new Map(list.map((c) => [c.id, c.iso_code.toUpperCase()])))
    .catch(() => {
      isoById = null
      return new Map<string, string>()
    })
  return isoById.then((map) => map.get(countryId))
}
