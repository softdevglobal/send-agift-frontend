import { useEffect, useRef, useState } from 'react'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { dialCodes, defaultDialCode } from '@/data/dial-codes'

type PhoneFieldProps = {
  id: string
  value: string
  onChange: (value: string) => void
  /**
   * ISO 3166-1 alpha-2 code of the country picked on the same form. The calling
   * code follows it until the user picks a code themselves.
   */
  country?: string | null
  disabled?: boolean
  required?: boolean
}

const codeByIso2 = new Map(dialCodes.map((code) => [code.iso2, code]))
const defaultIso2 =
  dialCodes.find((code) => code.dial === defaultDialCode)?.iso2 ??
  dialCodes[0].iso2

/** The dial-code entry for an ISO code, or undefined when it is not in the list. */
function knownIso2(iso2: string | null | undefined): string | undefined {
  const upper = iso2?.trim().toUpperCase()
  return upper && codeByIso2.has(upper) ? upper : undefined
}

function dialOf(iso2: string | undefined): string | undefined {
  return iso2 ? codeByIso2.get(iso2)?.dial : undefined
}

/**
 * Splits "+1 416 555 0100" into a country and the national number. Several
 * countries share a code (Canada and the US are both +1), so `prefer` picks
 * which of them to show when it matches.
 */
function parsePhone(value: string, prefer?: string) {
  const trimmed = value.trim()
  let best: string | undefined
  for (const code of dialCodes) {
    if (!trimmed.startsWith(code.dial)) continue
    const bestDial = dialOf(best)
    if (!bestDial || code.dial.length > bestDial.length) best = code.iso2
  }
  if (!best) return { iso2: prefer ?? defaultIso2, number: trimmed }
  const dial = dialOf(best)!
  const iso2 = prefer && dialOf(prefer) === dial ? prefer : best
  return { iso2, number: trimmed.slice(dial.length).trim() }
}

export function PhoneField({
  id,
  value,
  onChange,
  country,
  disabled,
  required,
}: PhoneFieldProps) {
  const countryIso2 = knownIso2(country)
  const [iso2, setIso2] = useState(() => parsePhone(value, countryIso2).iso2)
  const [number, setNumber] = useState(() => parsePhone(value, countryIso2).number)
  // Set once the user picks a code by hand. From then on the country on the
  // form no longer moves it.
  const pickedByHand = useRef(false)
  const previousCountry = useRef(countryIso2)

  useEffect(() => {
    // An empty value carries no code, so keep the one on screen rather than
    // jumping back to the default when the number is cleared.
    if (!value.trim()) {
      setNumber('')
      return
    }
    const parsed = parsePhone(value, iso2)
    setIso2(parsed.iso2)
    setNumber(parsed.number)
    // Only re-sync when the external value changes, not on every local edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // Follow the country picked on the form. A number that is already filled in
  // only moves when its code came from the previous country, so a saved
  // number from another country is left alone.
  useEffect(() => {
    const previous = previousCountry.current
    previousCountry.current = countryIso2
    if (!countryIso2 || countryIso2 === previous || pickedByHand.current) return
    // Read the incoming value, not local state: a profile can load its saved
    // phone and its country in the same render.
    const hasNumber = Boolean(value.trim())
    const current = hasNumber ? parsePhone(value, iso2) : null
    if (current && dialOf(current.iso2) !== dialOf(previous)) return
    setIso2(countryIso2)
    if (current) commit(countryIso2, current.number)
    // Only the country should trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryIso2])

  function commit(nextIso2: string, nextNumber: string) {
    const trimmed = nextNumber.trim()
    const dial = dialOf(nextIso2) ?? defaultDialCode
    onChange(trimmed ? `${dial} ${trimmed}` : '')
  }

  const dial = dialOf(iso2) ?? defaultDialCode

  return (
    <div className="flex gap-2">
      <Select
        value={iso2}
        onValueChange={(nextIso2) => {
          pickedByHand.current = true
          setIso2(nextIso2)
          commit(nextIso2, number)
        }}
        disabled={disabled}
      >
        <SelectTrigger aria-label="Country code" className="w-[4.5rem] shrink-0 gap-1 px-2">
          <SelectValue>{dial}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {dialCodes.map((code) => (
            <SelectItem key={code.iso2} value={code.iso2}>
              {code.name} ({code.dial})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="Phone number"
        value={number}
        onChange={(event) => {
          setNumber(event.target.value)
          commit(iso2, event.target.value)
        }}
        className="h-11 flex-1 bg-surface px-3"
        required={required}
        disabled={disabled}
      />
    </div>
  )
}
