import { useEffect, useMemo, useState } from 'react'

import { listCountries } from '@/api/countries'
import type { Country } from '@/api/types'
import { currenciesFromCountries } from '@/lib/country-options'
import { selectClassName } from '@/lib/form-styles'
import { cn } from '@/lib/utils'

type CurrencySelectProps = {
  id: string
  value: string
  onChange: (code: string) => void
  className?: string
  disabled?: boolean
  required?: boolean
  /** Pass countries the parent already loaded, so this does not fetch again. */
  countries?: Pick<Country, 'default_currency'>[]
}

/**
 * Currency choices are the `default_currency` values on the countries table,
 * not the full ISO list. The admin country form is what adds a currency.
 */
export function CurrencySelect({
  id,
  value,
  onChange,
  className,
  disabled,
  required,
  countries,
}: CurrencySelectProps) {
  const [loaded, setLoaded] = useState<Country[] | null>(countries ? null : [])
  const [loading, setLoading] = useState(countries == null)

  useEffect(() => {
    if (countries) return
    let cancelled = false
    listCountries()
      .then((list) => {
        if (!cancelled) setLoaded(Array.isArray(list) ? list : [])
      })
      .catch(() => {
        if (!cancelled) setLoaded([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [countries])

  const codes = useMemo(
    () => currenciesFromCountries(countries ?? loaded ?? []),
    [countries, loaded],
  )
  const current = value.trim().toUpperCase()
  const options = current && !codes.includes(current) ? [current, ...codes] : codes

  return (
    <select
      id={id}
      value={current}
      onChange={(event) => onChange(event.target.value)}
      className={cn(selectClassName, className)}
      disabled={disabled || loading || options.length === 0}
      required={required}
    >
      {loading ? <option value={current}>Loading currencies…</option> : null}
      {!loading && options.length === 0 ? (
        <option value="">No currencies on countries</option>
      ) : null}
      {!loading && options.length > 0 && !current ? (
        <option value="">Select currency</option>
      ) : null}
      {options.map((code) => (
        <option key={code} value={code}>
          {code}
        </option>
      ))}
    </select>
  )
}
