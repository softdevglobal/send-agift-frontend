import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

/**
 * Panel width. Read-only previews fit `md`; anything with a form in it
 * (shipping rates, customs) needs `lg` or the fields stack into a column
 * too narrow to fill in.
 */
export type SellerSheetSize = 'md' | 'lg' | 'xl'

const sizeClass: Record<SellerSheetSize, string> = {
  md: 'sm:max-w-md',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-3xl',
}

type SellerSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Small tracking-wide line above the title — the record type, usually. */
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  /** Status pill or badge, shown on the header's right. */
  badge?: ReactNode
  /** Edge-to-edge visual above the header — a cover image or video. */
  media?: ReactNode
  /** Pinned to the bottom, outside the scroll area, so actions stay reachable. */
  footer?: ReactNode
  size?: SellerSheetSize
  children: ReactNode
}

/**
 * The seller portal's one detail surface: everything you open — a gift, a
 * reel, a shop, an order item — slides in from the right over the list you
 * opened it from.
 *
 * Keeping the list behind the panel is the point. Sellers work down a list,
 * and a full-page detail route made them lose their place on every look.
 */
export function SellerSheet({
  open,
  onOpenChange,
  eyebrow,
  title,
  description,
  badge,
  media,
  footer,
  size = 'md',
  children,
}: SellerSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={cn(
          'gap-0 p-0',
          // On a phone the sheet stops short of the left edge and rounds that
          // corner, so the dimmed page shows behind it and it reads as a
          // slide-over, not a new full-screen route. Full width again from sm.
          'w-[calc(100%-2.75rem)] overflow-hidden rounded-l-2xl sm:w-full sm:rounded-l-none',
          sizeClass[size],
          // The close button floats over the scroll area, so it needs to sit
          // above whatever passes under it — a dark cover photo on open, body
          // content once scrolled. A backdrop chip keeps it legible on both.
          '[&>[data-slot=sheet-close]]:z-20 [&>[data-slot=sheet-close]]:rounded-full [&>[data-slot=sheet-close]]:bg-background/85 [&>[data-slot=sheet-close]]:p-1.5 [&>[data-slot=sheet-close]]:text-foreground [&>[data-slot=sheet-close]]:opacity-100 [&>[data-slot=sheet-close]]:shadow-sm [&>[data-slot=sheet-close]]:backdrop-blur-sm',
        )}
      >
        {/*
          Cover, header and body scroll as one column.
          Only the body used to scroll, which left a tall cover image and the
          header holding most of the panel's height while the content it framed
          was squeezed into a short strip in the middle.
        */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {media}

          <SheetHeader
            className={cn(
              'gap-0 border-b border-border/50 px-6 py-5',
              // Room for the close button, which floats over the cover when
              // there is one and over the header when there is not.
              !media && 'pr-14',
              !media &&
                'bg-[linear-gradient(180deg,var(--accent)_0%,transparent_100%)]',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {eyebrow ? (
                  <p className="mb-1 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                    {eyebrow}
                  </p>
                ) : null}
                <SheetTitle className="truncate">{title}</SheetTitle>
                {description ? (
                  <SheetDescription className="mt-1">{description}</SheetDescription>
                ) : null}
              </div>
              {badge ? <div className="shrink-0 pt-0.5">{badge}</div> : null}
            </div>
          </SheetHeader>

          <div className="space-y-5 px-6 py-5">{children}</div>
        </div>

        {/*
          The action bar stays pinned. It is the one part that must not scroll
          away — Accept and Buy label sit here, at the end of a long form.
        */}
        {footer ? (
          <div className="shrink-0 border-t border-border/50 bg-surface/60 px-6 py-4">
            {footer}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

/** A titled block inside a panel, so every panel groups its facts the same way. */
export function SellerSheetSection({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon?: LucideIcon
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          {Icon ? <Icon className="size-3.5" /> : null}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Label/value pair. Stack them in a `SellerSheetFacts` list. */
export function SellerSheetRow({
  label,
  children,
  emphasis = false,
}: {
  label: string
  children: ReactNode
  emphasis?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 py-2.5 text-sm',
        emphasis && 'font-medium',
      )}
    >
      <span className={cn(!emphasis && 'text-muted-foreground')}>{label}</span>
      <span className="min-w-0 text-right">{children}</span>
    </div>
  )
}

/** The framed card `SellerSheetRow`s sit in. */
export function SellerSheetFacts({ children }: { children: ReactNode }) {
  return (
    <div className="divide-y divide-border/40 rounded-xl border border-border/50 bg-surface/60 px-4 py-1">
      {children}
    </div>
  )
}
