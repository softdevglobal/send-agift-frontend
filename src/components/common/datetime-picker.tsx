import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@/lib/utils'

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

/** `yyyy-mm-ddTHH:mm`, built from local fields. Never a UTC instant. */
function toValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * Parses a `datetime-local` value as local wall-clock time. `new Date()`
 * already does this for a string with no `Z`/offset, so this only guards
 * against an empty or malformed one.
 */
function parseValue(value: string): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Midnight of the same local day, for comparing whole days. */
function dayOf(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Every day drawn in a month's grid, padded to whole weeks from Monday. */
function monthGrid(month: Date): (Date | null)[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const lead = (first.getDay() + 6) % 7
  const cells: (Date | null)[] = Array.from({ length: lead }, () => null)
  for (let day = 1; day <= days; day++) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), day))
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

/** "Fri, 3 Oct · 2:30 PM". A datetime a person can read. */
function friendlyDateTime(value: string): string {
  const date = parseValue(value)
  if (!date) return value
  const day = date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${day} · ${time}`
}

export type DateTimePickerPreset = { label: string; minutesFromNow: number }

type DateTimePickerProps = {
  /** `yyyy-mm-ddTHH:mm`, or empty for nothing chosen. */
  value: string
  onChange: (value: string) => void
  /** Earliest selectable moment, same format. Days before it are disabled. */
  min?: string
  presets?: DateTimePickerPreset[]
  placeholder?: string
  id?: string
  className?: string
}

/**
 * A calendar month plus an hour/minute spinner, in one popover. The pairing
 * every `datetime-local` field on this form needs, drawn the same way
 * instead of however each browser happens to render that input.
 */
export function DateTimePicker({
  value,
  onChange,
  min,
  presets = [],
  placeholder = 'Choose a date and time',
  id,
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [place, setPlace] = useState<{ top: number; left: number } | null>(null)
  const [narrow, setNarrow] = useState(false)

  const selected = parseValue(value)
  const minDate = min ? parseValue(min) : null
  const floorDay = minDate ? dayOf(minDate) : null
  const [month, setMonth] = useState(() => selected ?? minDate ?? new Date())
  // The time being edited, kept separate from `selected` so spinning the
  // hour before a day is picked still has something to apply it to.
  const [hour, setHour] = useState(() => selected?.getHours() ?? 12)
  const [minute, setMinute] = useState(() => selected?.getMinutes() ?? 0)

  useEffect(() => {
    if (!open) return
    const d = selected
    setMonth(d ?? minDate ?? new Date())
    setHour(d?.getHours() ?? 12)
    setMinute(d?.getMinutes() ?? 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Rendered into <body>: a Sheet panel scrolls, and a popover positioned
  // inside it would scroll away with the field instead of following it.
  useLayoutEffect(() => {
    if (!open) return
    function measure() {
      const isNarrow = window.innerWidth < 640
      setNarrow(isNarrow)
      if (isNarrow) return
      const anchor = containerRef.current
      const popover = popoverRef.current
      if (!anchor || !popover) return
      const rect = anchor.getBoundingClientRect()
      const margin = 16
      const width = popover.offsetWidth
      const height = popover.offsetHeight
      const left = Math.max(margin, Math.min(rect.left, window.innerWidth - margin - width))
      const below = rect.bottom + 8
      const top =
        below + height > window.innerHeight - margin && rect.top - 8 - height > margin
          ? rect.top - 8 - height
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
      if (containerRef.current?.contains(target) || popoverRef.current?.contains(target)) return
      setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      // Stopped on `window`'s capture phase. Strictly before `document`'s,
      // regardless of add order. Or a Sheet/Dialog this opens inside
      // closes itself too: Radix's own Escape handling listens there.
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

  const cells = useMemo(() => monthGrid(month), [month])
  const today = dayOf(new Date())
  const pickedDay = selected ? dayOf(selected) : null

  const canGoBack =
    !floorDay ||
    new Date(month.getFullYear(), month.getMonth(), 1) >
      new Date(floorDay.getFullYear(), floorDay.getMonth(), 1)

  function apply(day: Date, h: number, m: number) {
    const next = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m)
    onChange(toValue(next))
  }

  function pickDay(day: Date) {
    apply(day, hour, minute)
  }

  function nudgeHour(delta: number) {
    const next = (hour + delta + 24) % 24
    setHour(next)
    if (pickedDay) apply(pickedDay, next, minute)
  }

  function nudgeMinute(delta: number) {
    const next = (minute + delta + 60) % 60
    setMinute(next)
    if (pickedDay) apply(pickedDay, hour, next)
  }

  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  const isPM = hour >= 12

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'flex h-11 w-full items-center gap-2 rounded-lg border border-input bg-surface px-3 text-left text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          value ? 'font-medium text-foreground' : 'text-muted-foreground',
        )}
      >
        <Clock className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{value ? friendlyDateTime(value) : placeholder}</span>
      </button>

      {open
        ? createPortal(
            <>
              {narrow ? (
                <div
                  aria-hidden
                  onClick={() => setOpen(false)}
                  className="pointer-events-auto fixed inset-0 z-[90] bg-black/40 backdrop-blur-[2px]"
                />
              ) : null}
              <div
                ref={popoverRef}
                role="dialog"
                aria-modal={narrow || undefined}
                aria-label="Choose a date and time"
                style={narrow || !place ? undefined : { top: place.top, left: place.left }}
                className={cn(
                  // Radix's modal Sheet sets pointer-events: none on <body>
                  // while it is open and only re-enables its own content, so
                  // this. Rendered as a body sibling, not inside that
                  // content. Needs it back explicitly or every click on it
                  // falls through to whatever is behind.
                  'pointer-events-auto fixed z-[100] w-[19rem] max-w-[calc(100vw-2rem)]',
                  'rounded-2xl border border-border bg-surface p-3 shadow-2xl',
                  narrow && 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
                  !narrow && !place && 'invisible',
                )}
              >
                {presets.length ? (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {presets.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          const next = new Date(Date.now() + preset.minutesFromNow * 60_000)
                          setHour(next.getHours())
                          setMinute(next.getMinutes())
                          setMonth(next)
                          onChange(toValue(next))
                        }}
                        className="rounded-full border border-border/70 px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="mb-2 flex items-center justify-between">
                  <button
                    type="button"
                    disabled={!canGoBack}
                    onClick={() =>
                      setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
                    }
                    aria-label="Previous month"
                    className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <p className="text-sm font-semibold">
                    {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
                    }
                    aria-label="Next month"
                    className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-0.5 text-center">
                  {WEEKDAYS.map((day) => (
                    <span
                      key={day}
                      className="py-1 text-[0.7rem] font-semibold text-muted-foreground"
                    >
                      {day}
                    </span>
                  ))}
                  {cells.map((day, index) => {
                    if (!day) return <span key={`pad-${index}`} />
                    const disabled = Boolean(floorDay && dayOf(day) < floorDay)
                    const picked = Boolean(pickedDay && dayOf(day).getTime() === pickedDay.getTime())
                    const isToday = dayOf(day).getTime() === today.getTime()
                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        disabled={disabled}
                        onClick={() => pickDay(day)}
                        aria-current={isToday ? 'date' : undefined}
                        className={cn(
                          'grid size-9 place-items-center rounded-xl text-sm transition',
                          disabled && 'text-muted-foreground/35',
                          !disabled && !picked && 'hover:bg-accent',
                          isToday && !picked && 'font-semibold text-primary',
                          picked && 'bg-primary font-semibold text-primary-foreground shadow-sm',
                        )}
                      >
                        {day.getDate()}
                      </button>
                    )
                  })}
                </div>

                {/* Time: hour and minute spin independently, wheel-style, so
                    picking 11:45 pm is two nudges rather than typing digits
                    into a cramped native control. */}
                <div className="mt-3 flex items-center justify-center gap-1.5 rounded-2xl bg-muted/60 py-2.5">
                  <TimeSpinner label="Hour" display={String(hour12).padStart(2, '0')} onUp={() => nudgeHour(1)} onDown={() => nudgeHour(-1)} />
                  <span className="pb-0.5 text-lg font-semibold text-muted-foreground">:</span>
                  <TimeSpinner label="Minute" display={String(minute).padStart(2, '0')} onUp={() => nudgeMinute(5)} onDown={() => nudgeMinute(-5)} />
                  <button
                    type="button"
                    onClick={() => nudgeHour(12)}
                    className={cn(
                      'ml-2 h-8 rounded-full px-3 text-xs font-bold transition',
                      isPM ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground ring-1 ring-border/70',
                    )}
                  >
                    {isPM ? 'PM' : 'AM'}
                  </button>
                </div>
                {!pickedDay ? (
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">
                    Pick a day above to set this time.
                  </p>
                ) : null}
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  )
}

function TimeSpinner({
  label,
  display,
  onUp,
  onDown,
}: {
  label: string
  display: string
  onUp: () => void
  onDown: () => void
}) {
  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        aria-label={`${label} up`}
        onClick={onUp}
        className="grid size-6 place-items-center rounded-full text-muted-foreground transition hover:bg-card hover:text-foreground"
      >
        <ChevronUp className="size-3.5" />
      </button>
      <span className="w-9 text-center font-display text-xl tabular-nums">{display}</span>
      <button
        type="button"
        aria-label={`${label} down`}
        onClick={onDown}
        className="grid size-6 place-items-center rounded-full text-muted-foreground transition hover:bg-card hover:text-foreground"
      >
        <ChevronDown className="size-3.5" />
      </button>
    </div>
  )
}
