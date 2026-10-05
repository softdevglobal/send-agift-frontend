import { Check, ChevronDown, Globe2, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

/** Every IANA zone this browser knows, or a small curated fallback. */
function allZones(): string[] {
  const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] })
    .supportedValuesOf
  if (supported) {
    try {
      return supported('timeZone')
    } catch {
      // falls through to the curated list
    }
  }
  return [
    'UTC',
    'Pacific/Auckland',
    'Australia/Sydney',
    'Asia/Tokyo',
    'Asia/Singapore',
    'Asia/Kolkata',
    'Asia/Dubai',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Africa/Johannesburg',
    'America/Sao_Paulo',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
  ]
}

/** "Pacific/Auckland" → "Auckland". */
function cityOf(zone: string): string {
  return zone.split('/').pop()?.replace(/_/g, ' ') ?? zone
}

/** The zone's current UTC offset, e.g. "GMT+13:00". */
function offsetOf(zone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: zone,
      timeZoneName: 'longOffset',
    }).formatToParts(new Date())
    return parts.find((p) => p.type === 'timeZoneName')?.value.replace('GMT', 'UTC') ?? ''
  } catch {
    return ''
  }
}

type TimezoneSelectProps = {
  value: string
  onChange: (zone: string) => void
  id?: string
  placeholder?: string
  className?: string
}

/**
 * A searchable list of IANA time zones, each shown with its current UTC
 * offset. The thing that actually decides when a round opens, which a bare
 * "Pacific/Auckland" text field left the admin to work out themselves.
 */
export function TimezoneSelect({
  value,
  onChange,
  id,
  placeholder = 'Search a city or zone…',
  className,
}: TimezoneSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const zones = useMemo(allZones, [])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? zones.filter((zone) => zone.toLowerCase().replace(/_/g, ' ').includes(q))
      : zones
    return list.slice(0, 60)
  }, [zones, query])

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function pick(zone: string) {
    onChange(zone)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-11 w-full items-center gap-2 rounded-lg border border-input bg-surface px-3 text-left text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Globe2 className="size-4 shrink-0 text-muted-foreground" />
        <span className={cn('min-w-0 flex-1 truncate', !value && 'text-muted-foreground')}>
          {value ? cityOf(value) : placeholder}
        </span>
        {value ? (
          <span className="shrink-0 text-xs font-medium text-muted-foreground">
            {offsetOf(value)}
          </span>
        ) : null}
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute top-full left-0 z-50 mt-1.5 w-full min-w-[16rem] overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        >
          <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2">
            <Search className="size-3.5 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {results.length === 0 ? (
              <p className="px-3 py-3 text-sm text-muted-foreground">No matching time zone.</p>
            ) : (
              results.map((zone) => (
                <button
                  key={zone}
                  type="button"
                  role="option"
                  aria-selected={zone === value}
                  onClick={() => pick(zone)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-accent',
                    zone === value && 'bg-accent/70 font-medium',
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{cityOf(zone)}</span>
                    <span className="block truncate text-xs text-muted-foreground">{zone}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{offsetOf(zone)}</span>
                  {zone === value ? <Check className="size-4 shrink-0 text-primary" /> : null}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
