import type { Country } from '@/api/types'

/** Currencies actually assigned to a country. Duplicates collapse to one code. */
export function currenciesFromCountries(
  countries: Pick<Country, 'default_currency'>[],
): string[] {
  const codes = new Set<string>()
  for (const country of countries) {
    const code = country.default_currency?.trim().toUpperCase()
    if (code) codes.add(code)
  }
  return [...codes].sort()
}

/** "Sri Lanka (LK) · LKR" — the country and the currency stored on it. */
export function countryOptionLabel(
  country: Pick<Country, 'name' | 'iso_code' | 'default_currency'>,
): string {
  const code = country.default_currency?.trim().toUpperCase()
  const iso = country.iso_code?.trim().toUpperCase()
  if (iso && code) return `${country.name} (${iso}) · ${code}`
  if (code) return `${country.name} · ${code}`
  return country.name
}

/** "LK" → 🇱🇰, or nothing for a code that is not two letters. */
export function flagOf(iso: string | undefined): string {
  const code = iso?.trim().toUpperCase() ?? ''
  if (!/^[A-Z]{2}$/.test(code)) return ''
  return String.fromCodePoint(...[...code].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65))
}
