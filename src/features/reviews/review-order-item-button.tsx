import { useEffect, useState } from 'react'
import { PencilLine, Star } from 'lucide-react'

import {
  createReview,
  updateMyReview,
  type CreateReviewInput,
  type ProductReview,
} from '@/api/reviews'
import { Button } from '@/components/ui/button'
import { ReviewDialog } from '@/features/reviews/review-dialog'
import { StarMeter } from '@/features/reviews/star-rating'

export type ReviewOrderItemButtonProps = {
  orderItemId: string
  /** Only a delivered line can be reviewed; the backend enforces this too. */
  delivered: boolean
  /** The existing review for this line, when there is one. */
  review?: ProductReview
  productName?: string
  /** Opens the form as soon as it can, e.g. when arriving from a review link. */
  defaultOpen?: boolean
  /** Draw it as an outlined button (beside other actions) instead of a text link. */
  asButton?: boolean
  onSaved: (review: ProductReview) => void
}

/**
 * The review entry point on an order line: writes the first review, or reopens
 * the one already left. Hidden entirely until the line is delivered, since the
 * API would refuse it anyway.
 */
export function ReviewOrderItemButton({
  orderItemId,
  delivered,
  review,
  productName,
  defaultOpen = false,
  asButton = false,
  onSaved,
}: ReviewOrderItemButtonProps) {
  const [open, setOpen] = useState(defaultOpen)

  useEffect(() => {
    if (defaultOpen) setOpen(true)
  }, [defaultOpen])

  if (!delivered) return null

  async function handleSubmit(input: CreateReviewInput) {
    const saved = review
      ? await updateMyReview(review.id, input)
      : await createReview(orderItemId, input)
    // The dialog says thank you, then closes itself.
    onSaved(saved)
  }

  return (
    <>
      {asButton ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="h-9 gap-2 rounded-full px-4"
        >
          {review ? (
            <>
              <StarMeter value={review.rating} size="xs" />
              Edit your review
            </>
          ) : (
            <>
              <Star className="size-3.5" />
              Write a review
            </>
          )}
        </Button>
      ) : review ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <StarMeter value={review.rating} size="xs" />
          <span className="inline-flex items-center gap-1">
            <PencilLine className="size-3" />
            Edit your review
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <Star className="size-3.5" />
          Write a review
        </button>
      )}

      <ReviewDialog
        open={open}
        onOpenChange={setOpen}
        review={review}
        productName={productName}
        onSubmit={handleSubmit}
      />
    </>
  )
}
