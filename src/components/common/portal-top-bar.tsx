import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { LucideIcon } from 'lucide-react'
import { CalendarDays, CornerDownLeft, Menu, MessageSquare, Plus, Search } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type PortalPage = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

/** The nav entry for the page you are on: the longest path that matches. */
function currentItem(allItems: PortalPage[], pathname: string) {
  return (
    [...allItems]
      .sort((a, b) => b.to.length - a.to.length)
      .find((item) =>
        item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`),
      ) ?? allItems[0]
  )
}

const today = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

/**
 * The bar across the top of every seller and admin page: where you are, a
 * jump-to box that finds any page of the portal (press /), today's date, the
 * inbox, and the one action people take most.
 */
export function PortalTopBar({
  pages: allItems,
  portalLabel,
  inboxTo,
  action,
  onOpenMenu,
  statusLabel,
  unreadMessages,
}: {
  /** Every page the person can open, in menu order. */
  pages: PortalPage[]
  portalLabel: string
  inboxTo: string
  action?: { to: string; label: string }
  onOpenMenu: () => void
  statusLabel: string | null
  unreadMessages: number
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)

  const here = currentItem(allItems, location.pathname)
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return needle ? allItems.filter((item) => item.label.toLowerCase().includes(needle)) : allItems
  }, [allItems, query])

  // "/" anywhere outside a field focuses the jump box.
  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      event.preventDefault()
      inputRef.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function go(item: PortalPage | undefined) {
    if (!item) return
    navigate(item.to)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setHighlight((value) => Math.min(value + 1, matches.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlight((value) => Math.max(value - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      go(matches[highlight])
    } else if (event.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-brand-ink/10 bg-background">
      <div className="flex h-16 items-center gap-3 px-3 sm:px-5 lg:px-6">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Open menu"
          onClick={onOpenMenu}
        >
          <Menu className="size-5" />
        </Button>

        {/* Where you are. */}
        <div className="hidden min-w-0 items-center gap-2.5 md:flex">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-violet text-white">
            <here.icon className="size-4.5" />
          </span>
          <div className="min-w-0 leading-none">
            <p className="text-[9px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
              {portalLabel}
            </p>
            <p className="mt-1 truncate font-poster text-lg text-brand-ink dark:text-foreground">
              {here.label}
            </p>
          </div>
        </div>

        {/* Jump to any page. */}
        <div className="relative min-w-0 flex-1 md:mx-4 md:max-w-md">
          <label className="sr-only" htmlFor="portal-jump">
            Jump to a page
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-brand-ink/50" />
          <input
            ref={inputRef}
            id="portal-jump"
            role="combobox"
            aria-expanded={open}
            aria-controls="portal-jump-list"
            autoComplete="off"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setHighlight(0)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            // Let a click on a result land before the list closes.
            onBlur={() => window.setTimeout(() => setOpen(false), 120)}
            onKeyDown={onKeyDown}
            placeholder="Jump to a page…"
            className="h-10 w-full rounded-lg border-2 border-brand-ink/15 bg-card pr-10 pl-9 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-brand-ink"
          />
          <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border border-brand-ink/20 bg-accent px-1.5 text-[11px] font-bold text-brand-ink sm:block">
            /
          </kbd>

          {open && matches.length ? (
            <ul
              id="portal-jump-list"
              role="listbox"
              className="absolute inset-x-0 top-full z-40 mt-2 max-h-80 overflow-y-auto rounded-lg border-2 border-brand-ink bg-popover p-1.5 shadow-lg"
            >
              {matches.map((item, index) => (
                <li key={item.to} role="option" aria-selected={index === highlight}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => go(item)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm font-semibold transition-colors',
                      index === highlight ? 'bg-brand-ink text-white' : 'text-brand-ink',
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {index === highlight ? <CornerDownLeft className="size-3.5 opacity-70" /> : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-md border-2 border-brand-ink/15 px-2.5 py-1.5 text-[11px] font-bold tracking-[0.08em] text-brand-ink uppercase xl:inline-flex dark:text-foreground">
            <CalendarDays className="size-3.5" />
            {today.format(new Date())}
          </span>
          {statusLabel ? (
            <span className="hidden rounded-md bg-brand-teal px-2.5 py-1.5 text-[11px] font-bold tracking-[0.08em] text-brand-ink uppercase sm:inline">
              {statusLabel}
            </span>
          ) : null}
          <Button
            asChild
            variant="outline"
            size="icon"
            className="relative size-10 border-2 border-brand-ink/15"
          >
            <Link
              to={inboxTo}
              aria-label={unreadMessages ? `Inbox, ${unreadMessages} unread` : 'Inbox'}
            >
              <MessageSquare className="size-4.5" />
              {unreadMessages > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-md bg-brand-violet px-1 text-[10px] font-bold text-white">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              ) : null}
            </Link>
          </Button>
          {action ? (
            <Button asChild className="hidden h-10 px-4 sm:inline-flex">
              <Link to={action.to}>
                <Plus className="size-4" />
                {action.label}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  )
}
