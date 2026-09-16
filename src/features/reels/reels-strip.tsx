import { ArrowRight, Clapperboard, Play } from 'lucide-react'
import { Link } from 'react-router-dom'

import { storefrontFrameClass } from '@/components/common/site-styles'
import { useReelFeed } from '@/features/reels/use-reel-feed'
import type { ReelView } from '@/features/reels/reel-view'
import { cn } from '@/lib/utils'

/**
 * Home-page entry point into the feed: a soft tinted card with a scrollable
 * row of the newest reels.
 *
 * Cards are stills, not autoplaying video — a row of clips competing for
 * attention on a landing page is noise, and each one costs a stream. Watching
 * happens on /reels.
 *
 * The framed card is deliberate: one or twelve reels, the section reads as a
 * designed feature rather than a lone tile stranded in white space. It hides
 * itself entirely when there is nothing to show.
 */
export function ReelsStrip() {
  const { reels, loading, error } = useReelFeed({ limit: 12 })

  if (loading || error || reels.length === 0) return null

  return (
    <section className={cn(storefrontFrameClass, 'py-14 lg:py-16')}>
      <div className="relative overflow-hidden rounded-[1.75rem] p-6 ring-1 ring-border/50 sm:p-8 lg:p-10 bg-[linear-gradient(140deg,var(--accent)_0%,var(--card)_52%,oklch(0.95_0.045_190)_100%)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 right-[10%] size-64 rounded-full bg-[var(--brand-violet)]/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 left-[4%] size-72 rounded-full bg-[var(--brand-teal)]/12 blur-3xl"
        />

        <div className="relative mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-accent-foreground uppercase ring-1 ring-primary/10">
              <Clapperboard className="size-3.5" />
              Reels
            </span>
            <h2 className="mt-3 font-display text-3xl tracking-tight text-foreground sm:text-4xl">
              Watch it made, then send it
            </h2>
            <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
              Real clips from the people who make these gifts — send one straight
              from the feed.
            </p>
          </div>
          <Link
            to="/reels"
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-navy to-brand-violet px-5 text-sm font-semibold text-white shadow-lg shadow-brand-violet/20 transition-transform hover:-translate-y-0.5"
          >
            Watch all reels
            <ArrowRight className="size-4" />
          </Link>
        </div>

        {/* Edge-bleed filmstrip: aligned to the heading, scrolls to the card edge. */}
        <div className="relative -mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-1 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {reels.map((reel) => (
            <ReelTile key={reel.id} reel={reel} />
          ))}
        </div>
      </div>
    </section>
  )
}

function ReelTile({ reel }: { reel: ReelView }) {
  return (
    <Link
      to="/reels"
      className="group relative aspect-[9/16] w-44 shrink-0 snap-start overflow-hidden rounded-2xl bg-brand-navy shadow-[0_12px_32px_-12px_rgba(15,27,69,0.4)] ring-1 ring-black/5 transition-transform duration-300 hover:-translate-y-1 sm:w-52 lg:w-56"
    >
      {reel.imageUrl ? (
        <img
          src={reel.imageUrl}
          alt={reel.product ? reel.product.name : `Reel by ${reel.shopName}`}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      ) : null}

      <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/90 via-brand-navy/5 to-transparent" />

      <span className="absolute top-2.5 right-2.5 grid size-9 place-items-center rounded-full bg-brand-violet/85 text-white backdrop-blur-sm transition-transform group-hover:scale-110">
        <Play className="size-4 fill-current" />
      </span>

      <div className="absolute inset-x-0 bottom-0 p-3.5 text-white">
        <p className="truncate text-xs font-medium text-white/80">
          {reel.shopName}
        </p>
        {reel.product ? (
          <>
            <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-tight">
              {reel.product.name}
            </p>
            <p className="mt-1 text-sm font-bold text-brand-teal">
              {reel.product.priceLabel}
            </p>
          </>
        ) : null}
      </div>
    </Link>
  )
}
