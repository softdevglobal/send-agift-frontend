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
import { countryIsoFor } from '@/lib/country-iso'

type PhoneFieldProps = {
  id: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  required?: boolean
  /**
   * The country chosen elsewhere in the form. The calling code follows it:
   * pick Australia and the code becomes +61. The person can still pick a
   * different code by hand, and a saved number is never changed just by
   * opening the form.
   */
  countryId?: string
}

const codeByIso2 = new Map(dialCodes.map((code) => [code.iso2, code]))
const defaultIso2 =
  dialCodes.find((code) => code.dial === defaultDialCode)?.iso2 ??
  dialCodes[0].iso2
const sortedByDialLength = [...dialCodes].sort(
  (a, b) => b.dial.length - a.dial.length,
)

function parsePhone(value: string, preferIso2?: string) {
  const trimmed = value.trim()
  // +1 is shared by the US, Canada and others: keep the form's own country
  // when its code is the one in the number.
  const preferred = preferIso2 ? codeByIso2.get(preferIso2) : undefined
  if (preferred && trimmed.startsWith(preferred.dial)) {
    return { iso2: preferred.iso2, number: trimmed.slice(preferred.dial.length).trim() }
  }
  const match = sortedByDialLength.find((code) => trimmed.startsWith(code.dial))
  if (match) {
    return { iso2: match.iso2, number: trimmed.slice(match.dial.length).trim() }
  }
  return { iso2: defaultIso2, number: trimmed }
}

export function PhoneField({
  id,
  value,
  onChange,
  disabled,
  required,
  countryId,
}: PhoneFieldProps) {
  const [iso2, setIso2] = useState(() => parsePhone(value).iso2)
  const [number, setNumber] = useState(() => parsePhone(value).number)
  /** The form country's code, once looked up. */
  const countryIso2 = useRef<string | undefined>(undefined)
  /** The country the code last followed; undefined until the first one. */
  const followed = useRef<string | undefined>(undefined)
  /** True once the person has typed or picked here, rather than it loading. */
  const touched = useRef(false)

  useEffect(() => {
    const parsed = parsePhone(value, countryIso2.current)
    setIso2(parsed.iso2)
    setNumber(parsed.number)
    // Only re-sync when the external value changes, not on every local edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // The code follows the form's country.
  useEffect(() => {
    if (!countryId) return
    let cancelled = false
    void countryIsoFor(countryId).then((iso) => {
      if (cancelled || !iso || !codeByIso2.has(iso)) return
      countryIso2.current = iso
      const first = followed.current === undefined
      followed.current = countryId
      const current = parsePhone(value, iso)
      // Opening a form with a number already saved keeps its code.
      if (first && current.number && !touched.current) return
      setIso2(iso)
      commit(iso, current.number)
    })
    return () => {
      cancelled = true
    }
    // Runs when the country changes; value is read as it is then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryId])

  function commit(nextIso2: string, nextNumber: string) {
    const trimmed = nextNumber.trim()
    const dial = codeByIso2.get(nextIso2)?.dial ?? defaultDialCode
    onChange(trimmed ? `${dial} ${trimmed}` : '')
  }

  const dial = codeByIso2.get(iso2)?.dial ?? defaultDialCode

  return (
    <div className="flex gap-2">
      <Select
        value={iso2}
        onValueChange={(nextIso2) => {
          touched.current = true
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
        placeholder="77 123 4567"
        value={number}
        onChange={(event) => {
          touched.current = true
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
