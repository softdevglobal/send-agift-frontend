import { Play } from 'lucide-react'
import { Link } from 'react-router-dom'

import { SectionHeading } from '@/components/common/section-heading'
import { storefrontFrameClass } from '@/components/common/site-styles'
import { useReelFeed } from '@/features/reels/use-reel-feed'
import type { ReelView } from '@/features/reels/reel-view'
import { cn } from '@/lib/utils'

/**
 * Home-page entry point into the feed: a scrollable row of the newest reels.
 *
 * Cards are stills, not autoplaying video — a row of clips competing for
 * attention on a landing page is noise, and each one costs a stream. Watching
 * happens on /reels.
 *
 * The whole section hides itself when there is nothing to show, so a
 * marketplace with no reels yet does not get an empty shelf.
 */
export function ReelsStrip() {
  const { reels, loading, error } = useReelFeed({ limit: 12 })

  if (loading || error || reels.length === 0) return null

  return (
    <section className={cn(storefrontFrameClass, 'py-14 lg:py-16')}>
      <SectionHeading
        title="Reels from our sellers"
        actionLabel="Watch all reels"
        actionTo="/reels"
      />

      {/* Left-aligned filmstrip: the row scrolls, and the negative margin lets
          tiles bleed to the frame edge on small screens while the heading
          keeps the gutter. */}
      <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        {reels.map((reel) => (
          <ReelTile key={reel.id} reel={reel} />
        ))}
      </div>
    </section>
  )
}

function ReelTile({ reel }: { reel: ReelView }) {
  return (
    <Link
      to="/reels"
      className="group relative aspect-[9/16] w-48 shrink-0 snap-start overflow-hidden rounded-2xl bg-brand-navy transition-transform duration-300 hover:-translate-y-1 sm:w-56 lg:w-60"
    >
      {reel.imageUrl ? (
        <img
          src={reel.imageUrl}
          alt={reel.product ? reel.product.name : `Reel by ${reel.shopName}`}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      ) : null}

      <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/90 via-brand-navy/10 to-transparent" />

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
