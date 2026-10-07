import { ArrowRight, Clapperboard, Play } from 'lucide-react'
import { Link } from 'react-router-dom'

import { storefrontFrameClass } from '@/components/common/site-styles'
import { Dot, Marker, Sparkle } from '@/components/common/storefront-decor'
import { useReelFeed } from '@/features/reels/use-reel-feed'
import type { ReelView } from '@/features/reels/reel-view'
import { cn } from '@/lib/utils'

/**
 * Home-page entry point into the feed: a solid ink card with a scrollable
 * row of the newest reels.
 *
 * Cards are stills, not autoplaying video. A row of clips competing for
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
      <div className="relative overflow-hidden rounded-[1.75rem] bg-brand-ink p-6 text-white sm:p-8 lg:p-10">
        <Sparkle className="absolute top-8 right-[34%] size-6 text-brand-teal" />
        <Sparkle className="absolute top-16 right-[6%] size-4 text-brand-violet" />
        <Dot className="absolute top-10 right-[20%] size-2.5 bg-white/40" />

        <div className="relative mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-teal px-2.5 py-1 text-[10px] font-bold tracking-[0.16em] text-brand-ink uppercase">
              <Clapperboard className="size-3.5" />
              Reels
            </span>
            <h2 className="mt-4 font-poster text-3xl sm:text-4xl lg:text-5xl">
              Watch it <Marker tone="violet">made</Marker>,
              <br />
              then send it
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/65">
              Real clips from the people who make these gifts. Send one straight
              from the feed.
            </p>
          </div>
          <Link
            to="/reels"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md bg-white px-5 text-xs font-bold tracking-[0.08em] text-brand-ink uppercase transition-colors hover:bg-brand-teal"
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
      className="group relative aspect-[9/16] w-44 shrink-0 snap-start overflow-hidden rounded-2xl bg-brand-navy ring-1 ring-white/10 transition-transform duration-300 hover:-translate-y-1 sm:w-52 lg:w-56"
    >
      {reel.imageUrl ? (
        <img
          src={reel.imageUrl}
          alt={reel.product ? reel.product.name : `Reel by ${reel.shopName}`}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      ) : null}

      <span className="absolute top-2.5 right-2.5 grid size-9 place-items-center rounded-full bg-brand-violet text-white transition-transform group-hover:scale-110">
        <Play className="size-4 fill-current" />
      </span>

      <div className="absolute inset-x-2 bottom-2 rounded-xl bg-brand-ink/85 p-3 text-white backdrop-blur-sm">
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
