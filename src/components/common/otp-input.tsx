import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'

import { cn } from '@/lib/utils'

const LENGTH = 6

type OtpInputProps = {
  value: string
  onChange: (value: string) => void
  /** Id of the first box, so a <Label htmlFor> focuses the field. */
  id?: string
  disabled?: boolean
  'aria-label'?: string
  /** Fires when Enter is pressed in any box. */
  onEnter?: () => void
  className?: string
}

/**
 * Six small boxes for a one-time code. Typing advances, Backspace steps back,
 * and pasting (or the OS autofill, via one-time-code) fills every box.
 */
export function OtpInput({
  value,
  onChange,
  id,
  disabled,
  'aria-label': ariaLabel = '6-digit code',
  onEnter,
  className,
}: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const digits = value.replace(/\D/g, '').slice(0, LENGTH)

  function focusBox(index: number) {
    const box = refs.current[Math.max(0, Math.min(index, LENGTH - 1))]
    box?.focus()
    box?.select()
  }

  function setAt(index: number, entered: string) {
    const cleaned = entered.replace(/\D/g, '')
    if (!cleaned) return
    // A multi-character change is a paste or autofill: spread it from this box.
    const next = (digits.slice(0, index) + cleaned).slice(0, LENGTH)
    onChange(next)
    focusBox(Math.min(next.length, LENGTH - 1))
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace') {
      event.preventDefault()
      if (digits[index]) {
        onChange(digits.slice(0, index) + digits.slice(index + 1))
      } else if (index > 0) {
        onChange(digits.slice(0, index - 1) + digits.slice(index))
        focusBox(index - 1)
      }
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      focusBox(index - 1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      focusBox(index + 1)
    } else if (event.key === 'Enter' && onEnter) {
      event.preventDefault()
      onEnter()
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '')
    if (!pasted) return
    event.preventDefault()
    const next = pasted.slice(0, LENGTH)
    onChange(next)
    focusBox(Math.min(next.length, LENGTH - 1))
  }

  return (
    <div role="group" aria-label={ariaLabel} className={cn('flex gap-1.5', className)}>
      {Array.from({ length: LENGTH }, (_, index) => (
        <input
          key={index}
          ref={(node) => {
            refs.current[index] = node
          }}
          id={index === 0 ? id : undefined}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={LENGTH}
          aria-label={`${ariaLabel}, digit ${index + 1}`}
          value={digits[index] ?? ''}
          disabled={disabled}
          onChange={(event) => setAt(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          onFocus={(event) => event.target.select()}
          className="size-10 rounded-md border border-input bg-surface text-center font-display text-lg outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        />
      ))}
    </div>
  )
}
