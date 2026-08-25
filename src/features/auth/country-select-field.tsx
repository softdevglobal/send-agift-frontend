import { useEffect, useState } from 'react'

import { listCountries, type Country } from '@/api/countries'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/lib/api'
import { selectClassName } from '@/lib/form-styles'

type CountrySelectFieldProps = {
  id: string
  value: string
  onChange: (value: string) => void
  /** Receives the full selected country — used for its ISO code. */
  onCountrySelected?: (country: Country | null) => void
  disabled?: boolean
}

export function CountrySelectField({
  id,
  value,
  onChange,
  onCountrySelected,
  disabled,
}: CountrySelectFieldProps) {
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    listCountries()
      .then((list) => {
        if (cancelled) return
        setCountries(Array.isArray(list) ? list : [])
      })
      .catch((err) => {
        if (cancelled) return
        setError(getErrorMessage(err, 'Could not load countries.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const placeholder = loading
    ? 'Loading countries…'
    : error
      ? 'Countries unavailable'
      : countries.length === 0
        ? 'No countries available'
        : 'Select country'

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Country</Label>
      <select
        id={id}
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
          onCountrySelected?.(
            countries.find((country) => country.id === event.target.value) ?? null,
          )
        }}
        className={selectClassName}
        required
        disabled={disabled || loading || Boolean(error) || countries.length === 0}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {countries.map((country) => (
          <option key={country.id} value={country.id}>
            {country.name} ({country.iso_code})
          </option>
        ))}
      </select>
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  )
}
