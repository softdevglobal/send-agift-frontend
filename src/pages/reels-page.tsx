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
    <SiteLayout>
      {/* A fixed-height column so the player fills exactly what is left below
          the header and title, rather than guessing at an offset and hanging
          off the bottom of the viewport. */}
      <div className="mx-auto flex h-[calc(100svh-5.5rem)] w-full max-w-6xl flex-col px-4 py-4 sm:px-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl tracking-tight">
              <span className="bg-gradient-to-r from-brand-navy to-brand-violet bg-clip-text text-transparent">
                Reels
              </span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Watch what sellers are making, then send it as a gift.
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/products">
              <Gift className="size-4" />
              Browse all gifts
            </Link>
          </Button>
        </div>

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
    <div className="grid min-h-[60svh] place-items-center rounded-2xl border border-border bg-card px-6 py-16 text-center">
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
