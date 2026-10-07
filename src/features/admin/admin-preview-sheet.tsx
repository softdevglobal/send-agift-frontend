import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

/**
 * A quick look at one record from an admin list, in a panel from the right.
 * The list stays put behind it; "View full details" goes to the record's page.
 */
export function AdminPreviewSheet({
  open,
  onClose,
  eyebrow,
  title,
  description,
  badges,
  fullDetailsTo,
  fullDetailsLabel = 'View full details',
  actions,
  children,
}: {
  open: boolean
  onClose: () => void
  eyebrow: string
  title: string
  description?: string
  badges?: ReactNode
  /** The record's own page. */
  fullDetailsTo?: string
  /** Label for that link; "View full details" by default. */
  fullDetailsLabel?: string
  /** Extra buttons in the footer, before "View full details". */
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="account-box w-[calc(100%-2.5rem)] gap-0 border-l-2 border-brand-ink p-0 shadow-none sm:max-w-lg [&>[data-slot=sheet-close]]:text-white [&>[data-slot=sheet-close]]:opacity-90">
        <SheetHeader className="shrink-0 bg-brand-ink px-6 py-6 pr-14 text-white">
          <p className="w-fit rounded-md bg-brand-teal px-2 py-0.5 text-[10px] font-bold tracking-[0.18em] text-brand-ink uppercase">
            {eyebrow}
          </p>
          <SheetTitle className="font-poster text-3xl text-white">{title}</SheetTitle>
          {description ? (
            <SheetDescription className="text-white/65">{description}</SheetDescription>
          ) : null}
          {badges ? <div className="mt-2 flex flex-wrap items-center gap-2">{badges}</div> : null}
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">{children}</div>

        {actions || fullDetailsTo ? (
          <div className="flex shrink-0 flex-wrap gap-2 border-t-2 border-brand-ink/10 bg-background p-4">
            {actions}
            {fullDetailsTo ? (
              <Button asChild className="h-10 flex-1 px-4">
                <Link to={fullDetailsTo}>
                  {fullDetailsLabel}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : null}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

/** Label/value pairs in a two-column grid. */
export function PreviewFacts({ items }: { items: { label: string; value?: ReactNode }[] }) {
  const shown = items.filter((item) => item.value !== undefined && item.value !== null && item.value !== '')
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg bg-accent/60 p-4 text-sm">
      {shown.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-[10px] font-bold tracking-[0.14em] text-brand-ink/55 uppercase">
            {item.label}
          </dt>
          <dd className="mt-0.5 truncate font-semibold">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** A row of small count tiles. */
export function PreviewCounts({
  items,
}: {
  items: { label: string; value: number | string; tone?: 'violet' | 'teal' | 'ink' | 'amber' }[]
}) {
  const toneClass = {
    violet: 'bg-brand-violet text-white',
    teal: 'bg-brand-teal text-brand-ink',
    ink: 'bg-brand-ink text-white',
    amber: 'bg-amber-300 text-amber-950',
  }
  return (
    <div className={cn('grid gap-2', items.length >= 4 ? 'grid-cols-4' : 'grid-cols-3')}>
      {items.map((item) => (
        <div key={item.label} className={cn('rounded-lg p-3', toneClass[item.tone ?? 'ink'])}>
          <p className="font-poster text-2xl">{item.value}</p>
          <p className="mt-0.5 text-[10px] font-bold tracking-[0.1em] uppercase opacity-80">
            {item.label}
          </p>
        </div>
      ))}
    </div>
  )
}

/** A small poster heading inside the preview. */
export function PreviewHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[11px] font-bold tracking-[0.16em] text-brand-ink uppercase dark:text-foreground">
      {children}
    </h3>
  )
}
