import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

const markerTones = {
  violet: 'bg-brand-violet text-white',
  teal: 'bg-brand-teal text-brand-ink',
  ink: 'bg-brand-ink text-white',
  white: 'bg-white text-brand-ink',
} as const

type MarkerTone = keyof typeof markerTones

/** A word set on a solid block of brand colour, like a highlighter swipe. */
export function Marker({
  children,
  tone = 'violet',
  className,
}: {
  children: ReactNode
  tone?: MarkerTone
  className?: string
}) {
  return <span className={cn('marker-block', markerTones[tone], className)}>{children}</span>
}

/** Four-point sparkle used to scatter flat accents over banners. */
export function Sparkle({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={cn('pointer-events-none fill-current', className)}
    >
      <path d="M12 0c.6 6.4 5.6 11.4 12 12-6.4.6-11.4 5.6-12 12-.6-6.4-5.6-11.4-12-12C6.4 11.4 11.4 6.4 12 0Z" />
    </svg>
  )
}

/** Small solid dot, the other half of the banner confetti. */
export function Dot({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn('pointer-events-none block rounded-full', className)} />
  )
}
