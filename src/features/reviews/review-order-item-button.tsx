import { useState } from 'react'
import { PencilLine, Star } from 'lucide-react'

import {
  createReview,
  updateMyReview,
  type CreateReviewInput,
  type ProductReview,
} from '@/api/reviews'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ReviewForm } from '@/features/reviews/review-form'
import { StarMeter } from '@/features/reviews/star-rating'

export type ReviewOrderItemButtonProps = {
  orderItemId: string
  /** Only a delivered line can be reviewed; the backend enforces this too. */
  delivered: boolean
  /** The existing review for this line, when there is one. */
  review?: ProductReview
  productName?: string
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
  onSaved,
}: ReviewOrderItemButtonProps) {
  const [open, setOpen] = useState(false)

  if (!delivered) return null

  async function handleSubmit(input: CreateReviewInput) {
    const saved = review
      ? await updateMyReview(review.id, input)
      : await createReview(orderItemId, input)
    onSaved(saved)
    setOpen(false)
  }

  return (
    <>
      {review ? (
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {review ? 'Edit your review' : 'Review this gift'}
            </DialogTitle>
            <DialogDescription>
              {productName
                ? `How was ${productName}?`
                : 'How was this gift when it arrived?'}
            </DialogDescription>
          </DialogHeader>
          <ReviewForm
            review={review}
            onSubmit={handleSubmit}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
