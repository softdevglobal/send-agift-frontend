import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'

import { cn } from '@/lib/utils'

export type MultiSelectOption = { value: string; label: string }

type MultiSelectProps = {
  id?: string
  options: MultiSelectOption[]
  /** Selected values, in the order they were picked. */
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  className?: string
}

/**
 * A dropdown that keeps several choices. It looks like the form's other
 * selects; the list stays open while ticking, and closes on a click outside
 * or Escape. Rendered in place rather than in a portal, so it works inside a
 * dialog without fighting its focus trap.
 */
export function MultiSelect({
  id,
  options,
  value,
  onChange,
  placeholder = 'Choose…',
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    // Capture phase, so Escape closes only this list and not the dialog
    // around it.
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open])

  function toggle(option: string) {
    onChange(
      value.includes(option) ? value.filter((v) => v !== option) : [...value, option],
    )
  }

  const selected = value
    .map((v) => options.find((option) => option.value === v))
    .filter((option): option is MultiSelectOption => Boolean(option))

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex min-h-11 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-surface py-1.5 pr-3 pl-3 text-left text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          open && 'border-ring',
        )}
      >
        <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {selected.length === 0 ? (
            <span className="py-1 text-muted-foreground">{placeholder}</span>
          ) : (
            selected.map((option) => (
              <span
                key={option.value}
                className="inline-flex items-center gap-1 rounded-md bg-brand-ink py-1 pr-1 pl-2 text-xs font-semibold text-white"
              >
                {option.label}
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label={`Remove ${option.label}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    toggle(option.value)
                  }}
                  className="flex size-4 items-center justify-center rounded-sm hover:bg-white/20"
                >
                  <X className="size-3" />
                </span>
              </span>
            ))
          )}
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-multiselectable="true"
          className="absolute top-full right-0 left-0 z-50 mt-1.5 max-h-64 overflow-y-auto rounded-lg border-2 border-brand-ink/15 bg-card p-1 shadow-lg"
        >
          {options.map((option) => {
            const picked = value.includes(option.value)
            return (
              <li key={option.value} role="option" aria-selected={picked}>
                <button
                  type="button"
                  onClick={() => toggle(option.value)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted',
                    picked && 'font-semibold',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-4 shrink-0 items-center justify-center rounded-[4px] border-2',
                      picked
                        ? 'border-brand-ink bg-brand-ink text-white'
                        : 'border-brand-ink/30 bg-card',
                    )}
                  >
                    {picked ? <Check className="size-3" strokeWidth={3} /> : null}
                  </span>
                  {option.label}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
