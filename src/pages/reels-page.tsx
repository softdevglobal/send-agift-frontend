import { Gift, Loader2, PlayCircle, WifiOff } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import { SiteLayout } from '@/components/common/site-layout'
import { Button } from '@/components/ui/button'
import { useSavedGifts } from '@/features/customer-commerce/saved-gifts-context'
import { ReelsFeed } from '@/features/reels/reels-feed'
import { useReelFeed } from '@/features/reels/use-reel-feed'

/**
 * Reels: sellers' clips as a full-screen vertical feed, the same experience
 * the mobile app's centre tab gives. Any reel with a product tagged offers to
 * send it as a gift, which lands on that product's page.
 *
 * The footer is dropped and the page title with it — like Shorts, the feed
 * *is* the page, filling everything under the header edge to edge.
 */
export function ReelsPage() {
  const { reels, loading, error, hasMore, loadMore, retry, registerView } =
    useReelFeed()
  const { gifts, toggleSave } = useSavedGifts()

  const savedProductIds = useMemo(
    () => new Set(gifts.map((gift) => gift.product_id)),
    [gifts],
  )

  return (
    <SiteLayout hideFooter>
      {/*
        Explicit height, not a flex-fill chain: the feed's slides are all
        `h-full`, and that only resolves against a definite height. Rooting it
        at `min-h-svh` left the player collapsed to nothing. Header is ~5.5rem
        (logo h-16 + py-3 + border); the footer is gone, so this fills the rest.
      */}
      <div className="relative mx-auto flex h-[calc(100svh-5rem)] w-full max-w-6xl flex-col px-0 py-0 sm:h-[calc(100svh-5.5rem)] sm:px-4 sm:py-2">
        {/* A quiet way back to the shelves, kept off the player itself. */}
        <Button
          asChild
          variant="outline"
          size="sm"
          className="absolute top-2 right-3 z-20 hidden rounded-full bg-background/80 backdrop-blur-sm sm:inline-flex"
        >
          <Link to="/products">
            <Gift className="size-4" />
            Browse gifts
          </Link>
        </Button>

        <div className="min-h-0 flex-1">
          {loading ? (
            <FeedMessage
              icon={<Loader2 className="size-6 animate-spin" />}
              title="Loading reels"
              description="Fetching the latest posts from sellers."
            />
          ) : error ? (
            <FeedMessage
              icon={<WifiOff className="size-6" />}
              title="Reels are offline"
              description={error}
              action={
                <Button onClick={retry} variant="outline">
                  Try again
                </Button>
              }
            />
          ) : reels.length === 0 ? (
            <FeedMessage
              icon={<PlayCircle className="size-6" />}
              title="No reels yet"
              description="Sellers have not posted anything to watch yet. Browse the shelves in the meantime."
              action={
                <Button asChild className="rounded-full">
                  <Link to="/products">Browse gifts</Link>
                </Button>
              }
            />
          ) : (
            <ReelsFeed
              reels={reels}
              hasMore={hasMore}
              onLoadMore={loadMore}
              savedProductIds={savedProductIds}
              onToggleSave={(productId) => void toggleSave(productId)}
              onView={(reelId) => void registerView(reelId)}
            />
          )}
        </div>
      </div>
    </SiteLayout>
  )
}

function FeedMessage({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="m-3 grid min-h-[60svh] place-items-center rounded-2xl border border-border bg-card px-6 py-16 text-center sm:m-0">
      <div className="flex max-w-sm flex-col items-center gap-3">
        <span className="grid size-14 place-items-center rounded-xl bg-gradient-to-br from-brand-navy to-brand-violet text-white">
          {icon}
        </span>
        <h2 className="font-display text-xl tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </div>
  )
}
