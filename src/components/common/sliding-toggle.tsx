import { useLayoutEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

export type SlidingToggleOption<T extends string> = {
  id: T
  label: string
  /** A small count shown beside the label. */
  count?: number
}

type SlidingToggleProps<T extends string> = {
  options: SlidingToggleOption<T>[]
  value: T
  onChange: (value: T) => void
  label: string
  /** Stretch the box to its container, with the options sharing the width equally. */
  fullWidth?: boolean
  className?: string
}

/**
 * A box toggle: the options sit in one rounded box and a dark thumb glides
 * to the chosen one, resizing to fit each label.
 */
export function SlidingToggle<T extends string>({
  options,
  value,
  onChange,
  label,
  fullWidth = false,
  className,
}: SlidingToggleProps<T>) {
  const box = useRef<HTMLDivElement>(null)
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null)

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => {
      const active = el.querySelector<HTMLElement>('[aria-selected="true"]')
      setThumb(active ? { left: active.offsetLeft, width: active.offsetWidth } : null)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [value, options])

  return (
    <div
      ref={box}
      role="tablist"
      aria-label={label}
      className={cn(
        'relative flex gap-1 rounded-lg bg-accent p-1',
        fullWidth ? 'w-full' : 'w-fit',
        className,
      )}
    >
      {thumb ? (
        <span
          aria-hidden
          className="absolute inset-y-1 left-0 rounded-md bg-brand-ink shadow-sm transition-[transform,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ width: thumb.width, transform: `translateX(${thumb.left}px)` }}
        />
      ) : null}
      {options.map((option) => {
        const active = option.id === value
        return (
          <button
            key={option.id || option.label}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            className={cn(
              fullWidth && 'flex-1',
              'relative z-10 flex items-center justify-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-bold tracking-[0.08em] whitespace-nowrap uppercase transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-brand-violet focus-visible:outline-none',
              // Until the thumb is measured, the chosen option paints its own fill.
              active ? 'text-white' : 'text-brand-ink/60 hover:text-brand-ink',
              active && !thumb && 'bg-brand-ink',
            )}
          >
            {option.label}
            {option.count !== undefined ? (
              <span
                className={cn(
                  'rounded-sm px-1 text-[10px] transition-colors duration-300',
                  active ? 'bg-brand-teal text-brand-ink' : 'bg-white text-brand-ink',
                )}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
