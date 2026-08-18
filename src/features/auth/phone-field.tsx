import { useEffect, useState } from 'react'

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
  disabled?: boolean
  required?: boolean
}

const codeByIso2 = new Map(dialCodes.map((code) => [code.iso2, code]))
const defaultIso2 =
  dialCodes.find((code) => code.dial === defaultDialCode)?.iso2 ??
  dialCodes[0].iso2
const sortedByDialLength = [...dialCodes].sort(
  (a, b) => b.dial.length - a.dial.length,
)

function parsePhone(value: string) {
  const trimmed = value.trim()
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
}: PhoneFieldProps) {
  const [iso2, setIso2] = useState(() => parsePhone(value).iso2)
  const [number, setNumber] = useState(() => parsePhone(value).number)

  useEffect(() => {
    const parsed = parsePhone(value)
    setIso2(parsed.iso2)
    setNumber(parsed.number)
    // Only re-sync when the external value changes, not on every local edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

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
