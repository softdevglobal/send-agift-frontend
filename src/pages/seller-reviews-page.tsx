import { useCallback, useEffect, useState } from 'react'
import { LoaderCircle, MessageSquareReply, Star } from 'lucide-react'

import {
  clearReviewReply,
  listSellerReviews,
  replyToReview,
  type ProductReview,
} from '@/api/reviews'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getCatalogProduct } from '@/features/customer-commerce'
import { SellerEmptyState, SellerPageHeader } from '@/features/seller'
import { sellerPanelClass } from '@/features/seller/seller-styles'
import { ReviewCard } from '@/features/reviews/review-card'
import { RatingBars, StarMeter } from '@/features/reviews/star-rating'
import { getErrorMessage } from '@/lib/api'
import { loadMarketplaceIntoCatalog } from '@/lib/marketplace'
import { textareaClassName } from '@/lib/form-styles'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 20
const REPLY_MAX = 2000

/** The seller's own numbers, worked out from the page they are looking at. */
function ReviewStats({ reviews }: { reviews: ProductReview[] }) {
  const total = reviews.length
  const average =
    total === 0 ? 0 : reviews.reduce((sum, row) => sum + row.rating, 0) / total
  const awaiting = reviews.filter((row) => !row.seller_reply?.trim()).length
  const breakdown: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
  for (const review of reviews) {
    const key = String(Math.round(review.rating))
    if (key in breakdown) breakdown[key] += 1
  }

  return (
    <div className={cn(sellerPanelClass, 'grid gap-5 p-5 sm:grid-cols-[auto_minmax(0,1fr)_auto]')}>
      <div>
        <p className="font-display text-4xl leading-none tracking-tight">
          {average.toFixed(1)}
        </p>
        <StarMeter value={average} size="md" className="mt-2" />
        <p className="mt-1 text-xs text-muted-foreground">
          across {total} {total === 1 ? 'review' : 'reviews'}
        </p>
      </div>
      <RatingBars breakdown={breakdown} total={total} className="self-center" />
      <div className="self-center rounded-xl bg-muted/50 px-4 py-3 text-center">
        <p className="font-display text-2xl">{awaiting}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">awaiting a reply</p>
      </div>
    </div>
  )
}

export function SellerReviewsPage() {
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [replying, setReplying] = useState<ProductReview | null>(null)
  const [replyText, setReplyText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [list] = await Promise.all([
        listSellerReviews({ limit: PAGE_SIZE }),
        // Reviews carry product ids only; the catalog turns them into names.
        loadMarketplaceIntoCatalog(),
      ])
      setReviews(list.items)
      setCursor(list.next_cursor ?? null)
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Could not load your reviews.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function loadMore() {
    if (!cursor) return
    setLoadingMore(true)
    try {
      const next = await listSellerReviews({ cursor, limit: PAGE_SIZE })
      setReviews((current) => [...current, ...next.items])
      setCursor(next.next_cursor ?? null)
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Could not load more reviews.'))
    } finally {
      setLoadingMore(false)
    }
  }

  function applyReview(saved: ProductReview) {
    setReviews((current) => current.map((row) => (row.id === saved.id ? saved : row)))
  }

  async function submitReply() {
    if (!replying) return
    const text = replyText.trim()
    if (!text) return
    setBusy(true)
    setError(null)
    try {
      applyReview(await replyToReview(replying.id, text))
      setReplying(null)
    } catch (replyError) {
      setError(getErrorMessage(replyError, 'Could not post your reply.'))
    } finally {
      setBusy(false)
    }
  }

  async function removeReply(review: ProductReview) {
    setBusy(true)
    setError(null)
    try {
      applyReview(await clearReviewReply(review.id))
    } catch (clearError) {
      setError(getErrorMessage(clearError, 'Could not remove your reply.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <SellerPageHeader
        icon={Star}
        tone="amber"
        title="Reviews"
        description="What buyers said about gifts you delivered. A reply appears publicly under the review."
      />

      <FormAlert error={error} className="mb-4" />

      {loading ? (
        <div className="flex justify-center py-20">
          <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : reviews.length === 0 ? (
        <SellerEmptyState
          icon={Star}
          title="No reviews yet"
          description="Buyers can only review a gift once it has been delivered. Your first review will land here."
        />
      ) : (
        <div className="space-y-4">
          <ReviewStats reviews={reviews} />

          <div className="space-y-3">
            {reviews.map((review) => {
              const product = getCatalogProduct(review.product_id)
              const replied = Boolean(review.seller_reply?.trim())
              return (
                <ReviewCard
                  key={review.id}
                  review={review}
                  context={
                    <p className="text-sm font-medium text-muted-foreground">
                      {product?.name ?? 'Your gift'}
                    </p>
                  }
                  actions={
                    <>
                      <Button
                        variant={replied ? 'ghost' : 'outline'}
                        size="sm"
                        className="h-8 rounded-full px-3"
                        disabled={busy}
                        onClick={() => {
                          setReplying(review)
                          setReplyText(review.seller_reply ?? '')
                        }}
                      >
                        <MessageSquareReply className="size-3.5" />
                        {replied ? 'Edit reply' : 'Reply'}
                      </Button>
                      {replied ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-full px-3 text-destructive hover:text-destructive"
                          disabled={busy}
                          onClick={() => void removeReply(review)}
                        >
                          Remove reply
                        </Button>
                      ) : null}
                    </>
                  }
                />
              )
            })}
          </div>

          {cursor ? (
            <div className="flex justify-center">
              <Button
                variant="outline"
                className="rounded-full"
                disabled={loadingMore}
                onClick={() => void loadMore()}
              >
                {loadingMore ? <LoaderCircle className="size-4 animate-spin" /> : null}
                Show more
              </Button>
            </div>
          ) : null}
        </div>
      )}

      <Dialog open={replying != null} onOpenChange={(open) => !open && setReplying(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Reply to this review</DialogTitle>
            <DialogDescription>
              Your reply is public and sits under the review on the gift page.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={replyText}
            maxLength={REPLY_MAX}
            onChange={(event) => setReplyText(event.target.value)}
            className={cn(textareaClassName, 'min-h-32')}
            placeholder="Thank you for the feedback — we have passed the delay on to our courier."
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReplying(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              onClick={() => void submitReply()}
              disabled={busy || replyText.trim().length === 0}
            >
              {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Post reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
