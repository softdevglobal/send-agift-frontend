import { useCallback, useEffect, useState } from 'react'
import { Loader2, MessageSquareQuote } from 'lucide-react'

import {
  clearReviewVote,
  getProductReviewSummary,
  listProductReviews,
  voteReview,
  type ProductReview,
  type ReviewSummary,
} from '@/api/reviews'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { ReviewCard } from '@/features/reviews/review-card'
import { RatingBars, StarMeter } from '@/features/reviews/star-rating'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 10

/** The averages that sit beside the headline score. */
function SubScores({ summary }: { summary: ReviewSummary }) {
  const rows = [
    { label: 'Gift quality', value: summary.avg_product_quality_rating },
    { label: 'Delivery', value: summary.avg_shipping_rating },
    { label: 'Seller service', value: summary.avg_seller_service_rating },
  ]
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {rows.map((row) => (
        <div key={row.label} className="rounded-xl bg-muted/40 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">{row.label}</p>
          <StarMeter value={row.value} size="xs" showValue className="mt-1" />
        </div>
      ))}
    </div>
  )
}

export function ProductReviews({
  productId,
  className,
}: {
  productId: string
  className?: string
}) {
  // Voting needs a customer JWT; guests and sellers get the count without
  // the button rather than a 401 on click.
  const { role } = useAuth()
  const signedInCustomer = role === 'customer'

  const [summary, setSummary] = useState<ReviewSummary | null>(null)
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [votingId, setVotingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      getProductReviewSummary(productId),
      listProductReviews(productId, { limit: PAGE_SIZE }),
    ])
      .then(([summaryResult, list]) => {
        if (cancelled) return
        setSummary(summaryResult)
        setReviews(list.items)
        setCursor(list.next_cursor ?? null)
      })
      .catch((loadError) => {
        if (!cancelled) setError(getErrorMessage(loadError, 'Could not load reviews.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [productId])

  const loadMore = useCallback(async () => {
    if (!cursor) return
    setLoadingMore(true)
    try {
      const next = await listProductReviews(productId, { cursor, limit: PAGE_SIZE })
      setReviews((current) => [...current, ...next.items])
      setCursor(next.next_cursor ?? null)
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Could not load more reviews.'))
    } finally {
      setLoadingMore(false)
    }
  }, [cursor, productId])

  /**
   * Votes are applied to the row optimistically and rolled back on failure —
   * a thumbs-up that waits for a round trip feels broken at this size.
   */
  async function handleVote(review: ProductReview, isHelpful: boolean) {
    if (!signedInCustomer) return
    setVotingId(review.id)
    const previous = reviews
    setReviews((current) =>
      current.map((row) =>
        row.id === review.id
          ? {
              ...row,
              voted_helpful: isHelpful ? true : null,
              helpful_count: row.helpful_count + (isHelpful ? 1 : -1),
            }
          : row,
      ),
    )
    try {
      const result = isHelpful
        ? await voteReview(review.id, true)
        : await clearReviewVote(review.id)
      setReviews((current) =>
        current.map((row) =>
          row.id === review.id ? { ...row, helpful_count: result.helpful_count } : row,
        ),
      )
    } catch {
      setReviews(previous)
    } finally {
      setVotingId(null)
    }
  }

  if (loading) {
    return (
      <div className={cn('flex justify-center py-12', className)}>
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const count = summary?.review_count ?? 0

  return (
    <section className={className} aria-labelledby="product-reviews-heading">
      <h2
        id="product-reviews-heading"
        className="font-display text-xl tracking-tight sm:text-2xl"
      >
        Reviews
      </h2>

      {count === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border/70 px-6 py-10 text-center">
          <MessageSquareQuote className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">No reviews yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Reviews come from delivered orders, so the first one lands once
            someone has received this gift.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-5 rounded-2xl border border-border/60 bg-surface p-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-8">
            <div className="text-center sm:text-left">
              <p className="font-display text-5xl leading-none tracking-tight">
                {summary ? summary.avg_rating.toFixed(1) : '—'}
              </p>
              <StarMeter
                value={summary?.avg_rating ?? 0}
                size="lg"
                className="mt-2 justify-center sm:justify-start"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {count.toLocaleString()} {count === 1 ? 'review' : 'reviews'}
              </p>
            </div>
            <div className="space-y-4">
              {summary ? (
                <RatingBars breakdown={summary.rating_breakdown} total={count} />
              ) : null}
              {summary ? <SubScores summary={summary} /> : null}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                voting={votingId === review.id}
                onVote={signedInCustomer ? handleVote : undefined}
              />
            ))}
          </div>

          {cursor ? (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="rounded-full"
              >
                {loadingMore ? <Loader2 className="size-4 animate-spin" /> : null}
                Show more reviews
              </Button>
            </div>
          ) : null}
        </>
      )}

      {error ? (
        <p className="mt-3 text-center text-sm text-destructive">{error}</p>
      ) : null}
    </section>
  )
}
