import { useEffect, useState } from 'react'

import { getProductReviewSummary, type ReviewSummary } from '@/api/reviews'
import { StarMeter } from '@/features/reviews/star-rating'
import { cn } from '@/lib/utils'

/**
 * The product's real score next to its name, linking down to the reviews.
 *
 * Renders nothing until the summary arrives and nothing at all when there are
 * no reviews: an empty row of grey stars under a new gift reads as "rated
 * zero" rather than "not rated yet".
 */
export function ProductRatingBadge({
  productId,
  className,
}: {
  productId: string
  className?: string
}) {
  const [summary, setSummary] = useState<ReviewSummary | null>(null)

  useEffect(() => {
    let cancelled = false
    getProductReviewSummary(productId)
      .then((result) => {
        if (!cancelled) setSummary(result)
      })
      .catch(() => {
        // A missing summary just hides the badge; the page is still usable.
      })
    return () => {
      cancelled = true
    }
  }, [productId])

  if (!summary || summary.review_count === 0) return null

  return (
    <a
      href="#product-reviews-heading"
      className={cn(
        'inline-flex items-center gap-2 rounded-full transition-opacity hover:opacity-80',
        className,
      )}
    >
      <StarMeter
        value={summary.avg_rating}
        size="md"
        showValue
        count={summary.review_count}
      />
    </a>
  )
}
