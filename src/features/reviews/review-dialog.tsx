import { useEffect, useRef, useState } from 'react'
import { BadgeCheck, X } from 'lucide-react'

import type { CreateReviewInput, ProductReview } from '@/api/reviews'
import { Dot, Marker, Sparkle } from '@/components/common/storefront-decor'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { ReviewForm } from '@/features/reviews/review-form'

type ReviewDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The review being edited; omit to write the first one. */
  review?: ProductReview
  /** The gift the review is about, for the line under the title. */
  productName?: string
  /** Saves the review. The dialog says thank you and closes itself after. */
  onSubmit: (input: CreateReviewInput) => Promise<void>
}

const THANKS_MS = 2400

/**
 * The review window. A dark banner with one big question, a form that
 * answers back as you score, and a thank-you moment once it is posted.
 */
export function ReviewDialog({
  open,
  onOpenChange,
  review,
  productName,
  onSubmit,
}: ReviewDialogProps) {
  const [thanks, setThanks] = useState(false)
  const timer = useRef<number | null>(null)
  const editing = Boolean(review)

  useEffect(() => {
    if (!open) setThanks(false)
  }, [open])

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current)
    },
    [],
  )

  async function handleSubmit(input: CreateReviewInput) {
    await onSubmit(input)
    setThanks(true)
    timer.current = window.setTimeout(() => onOpenChange(false), THANKS_MS)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[92vh] flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-xl"
      >
        {thanks ? (
          <div className="relative overflow-hidden bg-brand-ink px-8 py-14 text-center text-white">
            <Sparkle className="absolute top-6 left-8 size-6 text-brand-teal" />
            <Sparkle className="absolute right-10 bottom-8 size-4 text-white/50" />
            <Dot className="absolute top-12 right-16 size-2.5 bg-brand-violet" />
            <span className="animate-star-pop mx-auto flex size-16 items-center justify-center rounded-2xl bg-brand-teal text-brand-ink">
              <BadgeCheck className="size-8" />
            </span>
            <DialogTitle className="font-poster mt-5 text-4xl">
              {editing ? 'All ' : 'Thank '}
              <Marker>{editing ? 'updated' : 'you'}</Marker>
            </DialogTitle>
            <DialogDescription className="mx-auto mt-3 max-w-xs text-white/70">
              {editing
                ? 'Your changes are live on the gift.'
                : 'Your review is live. It will help the next person choosing a gift.'}
            </DialogDescription>
            <Button
              type="button"
              variant="outline"
              className="mt-7 h-11 rounded-full border-white/30 bg-transparent px-6 text-white hover:border-white hover:bg-white/10 hover:text-white"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </div>
        ) : (
          <ReviewForm
            review={review}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
            header={
              <div className="relative flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="w-fit rounded-md bg-white px-2 py-0.5 text-[10px] font-bold tracking-[0.18em] text-brand-ink uppercase">
                    {editing ? 'Edit your review' : 'Your turn'}
                  </p>
                  <DialogTitle className="font-poster text-3xl leading-tight sm:text-4xl">
                    How did the gift <Marker>land</Marker>?
                  </DialogTitle>
                  <DialogDescription className="text-sm text-white/65">
                    {productName ? `Tell us about ${productName}.` : 'Tell us how it arrived.'}
                  </DialogDescription>
                </div>
                <DialogClose
                  aria-label="Close"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:ring-3 focus-visible:ring-white/40 focus-visible:outline-none"
                >
                  <X className="size-4" />
                </DialogClose>
              </div>
            }
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
