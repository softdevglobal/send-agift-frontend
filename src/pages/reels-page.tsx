import { Gift, Loader2, PlayCircle, WifiOff } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { SiteLayout } from '@/components/common/site-layout'
import { Button } from '@/components/ui/button'
import { useSavedGifts } from '@/features/customer-commerce/saved-gifts-context'
import { ReelCommentsPanel, ReelCommentsSheet } from '@/features/reels/reel-comments'
import type { ReelView } from '@/features/reels/reel-view'
import { ReelsFeed } from '@/features/reels/reels-feed'
import { useReelFeed } from '@/features/reels/use-reel-feed'
import { useReelLikes } from '@/features/reels/use-reel-likes'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/lib/use-media-query'

/**
 * Reels: sellers' clips as a full-screen vertical feed, the same experience
 * the mobile app's centre tab gives. Any reel with a product tagged offers to
 * send it as a gift, which lands on that product's page.
 *
 * The footer is dropped and the page title with it — like Shorts, the feed
 * *is* the page, filling everything under the header edge to edge.
 */
export function ReelsPage() {
  const { reels, loading, error, hasMore, loadMore, retry, registerView, patchReel } =
    useReelFeed()
  const { gifts, toggleSave } = useSavedGifts()
  const { likeGate, syncLikes, toggleLike } = useReelLikes(patchReel)

  // Shorts on desktop: comments dock beside the player and follow whichever
  // reel is on screen. Narrower screens have no room, so they slide over it.
  const docked = useMediaQuery('(min-width: 1024px)')
  const [activeReelId, setActiveReelId] = useState<string | null>(null)
  // The sheet's reel outlives `commentsOpen` so it keeps its content while it
  // animates closed.
  const [sheetReelId, setSheetReelId] = useState<string | null>(null)
  const [commentsOpen, setCommentsOpen] = useState(false)

  const commentsReelId = docked ? activeReelId : sheetReelId
  const commentsReel = reels.find((reel) => reel.id === commentsReelId) ?? null
  const panelDocked = docked && commentsOpen && commentsReel !== null

  const savedProductIds = useMemo(
    () => new Set(gifts.map((gift) => gift.product_id)),
    [gifts],
  )

  const handleView = useCallback(
    (reelId: string) => {
      void registerView(reelId)
      void syncLikes(reelId)
    },
    [registerView, syncLikes],
  )

  const handleToggleLike = useCallback(
    (reel: ReelView) => void toggleLike(reel),
    [toggleLike],
  )

  const toggleComments = useCallback(
    (reel: ReelView) => {
      // The comment button toggles the docked panel, as on YouTube.
      if (docked && commentsOpen) {
        setCommentsOpen(false)
        return
      }
      setActiveReelId(reel.id)
      setSheetReelId(reel.id)
      setCommentsOpen(true)
    },
    [commentsOpen, docked],
  )

  const closeComments = useCallback(() => setCommentsOpen(false), [])

  return (
    <SiteLayout hideFooter>
      {/*
        Explicit height, not a flex-fill chain: the feed's slides are all
        `h-full`, and that only resolves against a definite height. Rooting it
        at `min-h-svh` left the player collapsed to nothing. Header is ~5.5rem
        (logo h-16 + py-3 + border); the footer is gone, so this fills the rest.
      */}
      <div
        className={cn(
          'relative mx-auto flex h-[calc(100svh-5rem)] w-full flex-col px-0 py-0 sm:h-[calc(100svh-5.5rem)] sm:px-4 sm:py-2',
          panelDocked ? 'max-w-7xl' : 'max-w-6xl',
        )}
      >
        {/* A quiet way back to the shelves, kept off the player itself — and
            out of the way of the docked panel's close button. */}
        {panelDocked ? null : (
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
        )}

        <div className="flex min-h-0 flex-1 gap-4">
          <div className="min-w-0 flex-1">
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
                onView={handleView}
                onToggleLike={handleToggleLike}
                likeGate={likeGate}
                onOpenComments={toggleComments}
                onActiveReelChange={setActiveReelId}
                // The docked panel is not modal, so the feed keeps its keys;
                // the sheet is, so they stay with it.
                keyboardEnabled={docked || !commentsOpen}
              />
            )}
          </div>

          {panelDocked && commentsReel ? (
            <aside className="w-[400px] max-w-[40%] shrink-0">
              <ReelCommentsPanel
                key={commentsReel.id}
                reel={commentsReel}
                onClose={closeComments}
                onPatch={patchReel}
                className="overflow-hidden rounded-2xl border border-border shadow-sm"
              />
            </aside>
          ) : null}
        </div>
      </div>

      {docked ? null : (
        <ReelCommentsSheet
          reel={commentsReel}
          open={commentsOpen && commentsReel !== null}
          onOpenChange={setCommentsOpen}
          onPatch={patchReel}
        />
      )}
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
