import { Check, ChevronDown, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { Country } from '@/api/types'
import { flagOf } from '@/lib/country-options'
import { cn } from '@/lib/utils'

type CountryMultiSelectProps = {
  value: string[]
  onChange: (ids: string[]) => void
  countries: Country[]
  id?: string
  placeholder?: string
  className?: string
}

/**
 * Pick several countries. The chosen ones sit inside the field as flag
 * chips; clicking the field opens a searchable list with a tick per country.
 */
export function CountryMultiSelect({
  value,
  onChange,
  countries,
  id,
  placeholder = 'Choose the countries it runs in',
  className,
}: CountryMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const chosen = useMemo(
    () => value.map((cid) => countries.find((c) => c.id === cid)).filter((c): c is Country => !!c),
    [value, countries],
  )

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return countries
    return countries.filter((c) =>
      [c.name, c.iso_code, c.default_currency].some((v) => v?.toLowerCase().includes(q)),
    )
  }, [countries, query])

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

  function toggle(cid: string) {
    onChange(value.includes(cid) ? value.filter((v) => v !== cid) : [...value, cid])
  }

  const allShown = results.length > 0 && results.every((c) => value.includes(c.id))

  function toggleShown() {
    const shown = new Set(results.map((c) => c.id))
    onChange(
      allShown
        ? value.filter((v) => !shown.has(v))
        : [...value, ...results.map((c) => c.id).filter((cid) => !value.includes(cid))],
    )
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div
        id={id}
        role="combobox"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((was) => !was)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setOpen((was) => !was)
          }
        }}
        className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-lg border border-input bg-surface py-1.5 pr-3 pl-1.5 text-left text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {chosen.length === 0 ? (
            <span className="px-1.5 py-1 text-muted-foreground">{placeholder}</span>
          ) : (
            chosen.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background py-1 pr-1 pl-2 text-sm"
              >
                {flagOf(c.iso_code) ? <span aria-hidden>{flagOf(c.iso_code)}</span> : null}
                <span className="font-medium">{c.name}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggle(c.id)
                  }}
                  aria-label={`Remove ${c.name}`}
                  className="rounded p-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            ))
          )}
        </div>
        <ChevronDown
          className={cn('size-4 shrink-0 text-muted-foreground transition', open && 'rotate-180')}
        />
      </div>

      {open ? (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute top-full left-0 z-50 mt-1.5 w-full min-w-[16rem] overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        >
          <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2">
            <Search className="size-3.5 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, code or currency…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {results.length > 1 ? (
              <button
                type="button"
                onClick={toggleShown}
                className="shrink-0 text-xs font-medium text-primary hover:underline"
              >
                {allShown ? 'Clear' : 'Select all'}
              </button>
            ) : null}
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {results.length === 0 ? (
              <p className="px-3 py-3 text-sm text-muted-foreground">No matching country.</p>
            ) : (
              results.map((c) => {
                const selected = value.includes(c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => toggle(c.id)}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition hover:bg-accent',
                      selected && 'bg-accent/60',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center rounded border',
                        selected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input',
                      )}
                    >
                      {selected ? <Check className="size-3" /> : null}
                    </span>
                    <span className="w-5 shrink-0 text-base leading-none" aria-hidden>
                      {flagOf(c.iso_code)}
                    </span>
                    <span className={cn('min-w-0 flex-1 truncate', selected && 'font-medium')}>
                      {c.name}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {[c.iso_code?.toUpperCase(), c.default_currency?.toUpperCase()]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </button>
                )
              })
            )}
          </div>
          <div className="flex items-center justify-between border-t border-border/70 px-3 py-2 text-xs text-muted-foreground">
            <span>
              {value.length === 0
                ? 'None chosen'
                : `${value.length} ${value.length === 1 ? 'country' : 'countries'} chosen`}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="font-medium text-primary hover:underline"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
