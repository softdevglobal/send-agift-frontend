import { Clock } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@/lib/utils'

/** "14:30" → { hour12: 2, minute: 30, pm: true }. */
function parse(value: string) {
  const match = /^(\d{1,2}):(\d{2})/.exec(value)
  if (!match) return null
  const h = Math.min(23, Number(match[1]))
  const minute = Math.min(59, Number(match[2]))
  return { hour12: h % 12 === 0 ? 12 : h % 12, minute, pm: h >= 12 }
}

function to24(hour12: number, minute: number, pm: boolean) {
  const h = (hour12 % 12) + (pm ? 12 : 0)
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

/** "14:30" → "2:30 PM". */
export function formatTime(value: string) {
  const t = parse(value)
  if (!t) return value
  return `${t.hour12}:${String(t.minute).padStart(2, '0')} ${t.pm ? 'PM' : 'AM'}`
}

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

type TimePickerProps = {
  /** `HH:MM`, 24-hour, or empty. */
  value: string
  onChange: (value: string) => void
  /** One-tap times above the grid, as `HH:MM`. */
  presets?: string[]
  placeholder?: string
  disabled?: boolean
  id?: string
  className?: string
}

/**
 * A time of day in a popover, in the site's own style rather than the
 * browser's spinning columns: one tap for the hour, one for the minute,
 * and AM or PM.
 */
export function TimePicker({
  value,
  onChange,
  presets = ['10:00', '12:00', '14:00', '16:00'],
  placeholder = 'Choose a time',
  disabled,
  id,
  className,
}: TimePickerProps) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [place, setPlace] = useState<{ top: number; left: number } | null>(null)

  const current = parse(value) ?? { hour12: 12, minute: 0, pm: true }
  // A minute set elsewhere (14:07) still shows, even off the 5-minute grid.
  const minutes = MINUTES.includes(current.minute)
    ? MINUTES
    : [...MINUTES, current.minute].sort((a, b) => a - b)

  // Rendered into <body> and placed beside the field, so no card or
  // scrolling container can clip it or paint over it.
  useLayoutEffect(() => {
    if (!open) return
    function measure() {
      const anchor = anchorRef.current
      const popover = popoverRef.current
      if (!anchor || !popover) return
      const rect = anchor.getBoundingClientRect()
      const margin = 12
      const left = Math.max(margin, Math.min(rect.left, window.innerWidth - margin - popover.offsetWidth))
      const below = rect.bottom + 8
      const top =
        below + popover.offsetHeight > window.innerHeight - margin && rect.top - 8 - popover.offsetHeight > margin
          ? rect.top - 8 - popover.offsetHeight
          : below
      setPlace({ top, left })
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (anchorRef.current?.contains(target) || popoverRef.current?.contains(target)) return
      setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open])

  const set = (next: Partial<typeof current>) => {
    const t = { ...current, ...next }
    onChange(to24(t.hour12, t.minute, t.pm))
  }

  const cell = (picked: boolean) =>
    cn(
      'grid h-9 place-items-center rounded-lg text-sm tabular-nums transition',
      picked ? 'bg-primary font-semibold text-primary-foreground shadow-sm' : 'hover:bg-accent',
    )

  return (
    <>
      <button
        ref={anchorRef}
        id={id}
        type="button"
        data-slot="input"
        disabled={disabled}
        onClick={() => setOpen((was) => !was)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'flex h-8 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 py-1 text-left text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30',
          open && 'border-ring ring-3 ring-ring/50',
          !value && 'text-muted-foreground',
          className,
        )}
      >
        <Clock className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate tabular-nums">{value ? formatTime(value) : placeholder}</span>
      </button>

      {open
        ? createPortal(
            <div
              ref={popoverRef}
              role="dialog"
              aria-label="Choose a time"
              style={place ? { top: place.top, left: place.left } : undefined}
              className={cn(
                'pointer-events-auto fixed z-[100] w-[17.5rem] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-border bg-surface p-3 shadow-2xl',
                !place && 'invisible',
              )}
            >
              {presets.length ? (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {presets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        onChange(preset)
                        setOpen(false)
                      }}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-xs font-medium transition',
                        value === preset
                          ? 'border-transparent bg-primary text-primary-foreground'
                          : 'border-border/70 text-muted-foreground hover:border-primary/50 hover:text-foreground',
                      )}
                    >
                      {formatTime(preset)}
                    </button>
                  ))}
                </div>
              ) : null}

              <p className="mb-1.5 text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">Hour</p>
              <div className="grid grid-cols-6 gap-1">
                {HOURS.map((h) => (
                  <button key={h} type="button" className={cell(current.hour12 === h)} onClick={() => set({ hour12: h })}>
                    {h}
                  </button>
                ))}
              </div>

              <p className="mt-3 mb-1.5 text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">
                Minute
              </p>
              <div className="grid grid-cols-6 gap-1">
                {minutes.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={cell(current.minute === m)}
                    onClick={() => set({ minute: m })}
                  >
                    :{String(m).padStart(2, '0')}
                  </button>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
                {[false, true].map((pm) => (
                  <button
                    key={String(pm)}
                    type="button"
                    onClick={() => set({ pm })}
                    className={cn(
                      'h-8 rounded-lg text-sm font-semibold transition',
                      current.pm === pm ? 'bg-surface text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {pm ? 'PM' : 'AM'}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-3 h-9 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Done · {formatTime(to24(current.hour12, current.minute, current.pm))}
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
