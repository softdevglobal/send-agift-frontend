import { Check, ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import { Popover } from 'radix-ui'
import { useState } from 'react'

import type { GiftCategory } from '@/features/marketing/data'
import { cn } from '@/lib/utils'

type OccasionFilterProps = {
  categories: GiftCategory[]
  /** `all` or a category id. */
  value: string
  onChange: (value: string) => void
  className?: string
}

/**
 * The occasion filter as a compact pop-over, for narrow screens: the button
 * says what is chosen and the panel lists the occasions as plain text boxes.
 */
export function OccasionFilter({ categories, value, onChange, className }: OccasionFilterProps) {
  const [open, setOpen] = useState(false)
  const active = categories.find((item) => item.id === value) ?? null

  function pick(next: string) {
    onChange(next)
    setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Filter by occasion"
          className={cn(
            'group flex h-11 items-center gap-2.5 rounded-xl border-2 bg-background pr-3 pl-1.5 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
            active || open
              ? 'border-brand-violet'
              : 'border-brand-ink/15 hover:border-brand-ink',
            className,
          )}
        >
          <span
            className={cn(
              'grid size-8 shrink-0 place-items-center rounded-lg',
              active ? 'bg-brand-ink text-white' : 'bg-brand-violet text-white',
            )}
          >
            <SlidersHorizontal className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-[9px] leading-none font-bold tracking-[0.16em] text-muted-foreground uppercase">
              Occasion
            </span>
            <span className="mt-0.5 block max-w-28 truncate text-sm leading-none font-extrabold text-brand-ink dark:text-foreground">
              {active ? active.name : 'All occasions'}
            </span>
          </span>
          <ChevronDown
            className={cn(
              'ml-1 size-4 shrink-0 text-muted-foreground transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-top-2 z-50 w-[min(24rem,calc(100vw-1.5rem))] rounded-2xl border-2 border-brand-ink bg-popover p-3 text-popover-foreground shadow-xl outline-none"
        >
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <p className="text-[10px] font-bold tracking-[0.16em] text-brand-ink/60 uppercase dark:text-muted-foreground">
              What&rsquo;s the occasion?
            </p>
            {active ? (
              <button
                type="button"
                onClick={() => pick('all')}
                className="inline-flex items-center gap-1 text-[11px] font-bold tracking-[0.08em] text-brand-violet uppercase hover:underline"
              >
                <X className="size-3" />
                Clear
              </button>
            ) : null}
          </div>

          <ul className="grid max-h-[min(22rem,60svh)] grid-cols-2 gap-2 overflow-y-auto">
            <Option
              label="All occasions"
              selected={value === 'all' || !active}
              onSelect={() => pick('all')}
            />
            {categories.map((item) => (
              <Option
                key={item.id}
                label={item.name}
                selected={item.id === value}
                onSelect={() => pick(item.id)}
              />
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function Option({
  label,
  selected,
  onSelect,
}: {
  label: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-2 rounded-lg border-2 px-3 text-left text-sm font-bold transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
          selected
            ? 'border-brand-ink bg-brand-ink text-white'
            : 'border-brand-ink/15 text-brand-ink hover:border-brand-ink dark:text-foreground',
        )}
      >
        <span className="truncate">{label}</span>
        {selected ? <Check className="size-4 shrink-0" /> : null}
      </button>
    </li>
  )
}
