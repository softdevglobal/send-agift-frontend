import { ChevronDown, ChevronUp } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { ReelCard } from '@/features/reels/reel-card'
import type { ReelView } from '@/features/reels/reel-view'
import { cn } from '@/lib/utils'

type ReelsFeedProps = {
  reels: ReelView[]
  hasMore: boolean
  onLoadMore: () => void
  /** Ids of gifts already on the viewer's saved list. */
  savedProductIds: Set<string>
  onToggleSave: (productId: string) => void
}

/**
 * The vertical feed: one reel per viewport, snapping as the viewer scrolls —
 * the Shorts pattern, including the up/down buttons and arrow-key control that
 * make it usable with a mouse and keyboard rather than only a touchscreen.
 *
 * Which reel is "active" comes from an IntersectionObserver rather than scroll
 * maths, so it stays correct through wheel, trackpad, keyboard and touch
 * scrolling alike — and only that reel plays.
 */
export function ReelsFeed({
  reels,
  hasMore,
  onLoadMore,
  savedProductIds,
  onToggleSave,
}: ReelsFeedProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [muted, setMuted] = useState(true)
  const [liked, setLiked] = useState<Set<string>>(new Set())

  const scrollTo = useCallback((index: number) => {
    const container = containerRef.current
    if (!container) return
    const slide = container.querySelector<HTMLElement>(
      `[data-reel-slide][data-index="${index}"]`,
    )
    slide?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const index = Number((entry.target as HTMLElement).dataset.index)
          if (Number.isNaN(index)) continue
          setActiveIndex(index)
          // Fetch the next page before the viewer reaches the end, so the
          // feed never stalls mid-scroll.
          if (index >= reels.length - 3 && hasMore) onLoadMore()
        }
      },
      { root: container, threshold: 0.6 },
    )

    const slides = container.querySelectorAll('[data-reel-slide]')
    slides.forEach((slide) => observer.observe(slide))
    return () => observer.disconnect()
  }, [reels.length, hasMore, onLoadMore])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // Leave typing alone — the header's search box lives on the same page.
      const target = event.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return

      if (event.key === 'ArrowDown' || event.key === 'PageDown') {
        event.preventDefault()
        scrollTo(Math.min(activeIndex + 1, reels.length - 1))
      } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault()
        scrollTo(Math.max(activeIndex - 1, 0))
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeIndex, reels.length, scrollTo])

  const advance = useCallback(
    (index: number) => {
      // The last reel loops back to the top rather than dead-ending the feed.
      scrollTo(index + 1 >= reels.length ? 0 : index + 1)
    },
    [reels.length, scrollTo],
  )

  const toggleLike = useCallback((reelId: string) => {
    setLiked((current) => {
      const next = new Set(current)
      if (!next.delete(reelId)) next.add(reelId)
      return next
    })
  }, [])

  return (
    <div className="relative h-full">
      <div
        ref={containerRef}
        className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {reels.map((reel, index) => (
          <div
            key={reel.id}
            data-reel-slide
            data-index={index}
            className="flex h-full snap-start snap-always items-center justify-center"
          >
            <ReelCard
              reel={reel}
              active={index === activeIndex}
              muted={muted}
              onToggleMute={() => setMuted((value) => !value)}
              liked={liked.has(reel.id)}
              onToggleLike={() => toggleLike(reel.id)}
              saved={reel.product ? savedProductIds.has(reel.product.id) : false}
              onToggleSave={() => {
                if (reel.product) onToggleSave(reel.product.id)
              }}
              onEnded={() => advance(index)}
            />
          </div>
        ))}
      </div>

      {/* Shorts' step controls, on pointer devices where there is room. */}
      <div className="pointer-events-none absolute inset-y-0 right-2 hidden flex-col justify-center gap-3 lg:flex">
        <StepButton
          label="Previous reel"
          disabled={activeIndex === 0}
          onClick={() => scrollTo(activeIndex - 1)}
          icon={<ChevronUp className="size-5" />}
        />
        <StepButton
          label="Next reel"
          disabled={activeIndex >= reels.length - 1}
          onClick={() => scrollTo(activeIndex + 1)}
          icon={<ChevronDown className="size-5" />}
        />
      </div>
    </div>
  )
}

function StepButton({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'pointer-events-auto grid size-10 cursor-pointer place-items-center rounded-full bg-muted text-foreground transition-all hover:scale-105 hover:bg-mist active:scale-95',
        disabled && 'pointer-events-none opacity-35',
      )}
    >
      {icon}
    </button>
  )
}
