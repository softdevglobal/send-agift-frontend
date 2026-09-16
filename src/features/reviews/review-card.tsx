import { useState } from 'react'
import { BadgeCheck, ThumbsUp, Store, X } from 'lucide-react'

import type { ProductReview } from '@/api/reviews'
import { StarMeter } from '@/features/reviews/star-rating'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function reviewerName(review: ProductReview): string {
  if (review.is_anonymous) return 'Anonymous'
  const name = review.customer?.display_name?.trim()
  return name || 'Customer'
}

function initials(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
  return letters || '?'
}

/** The three sub-scores, shown only when they add something to the overall. */
function BreakdownChips({ review }: { review: ProductReview }) {
  const chips = [
    { label: 'Quality', value: review.product_quality_rating },
    { label: 'Delivery', value: review.shipping_rating },
    { label: 'Service', value: review.seller_service_rating },
  ].filter((chip) => chip.value > 0)

  if (chips.length === 0) return null

  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
      {chips.map((chip) => (
        <span key={chip.label} className="inline-flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{chip.label}</span>
          <StarMeter value={chip.value} size="xs" />
        </span>
      ))}
    </div>
  )
}

function MediaStrip({
  media,
  onOpen,
}: {
  media: ProductReview['media']
  onOpen: (index: number) => void
}) {
  if (media.length === 0) return null
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {media.map((item, index) => {
        const url = item.cdn_url?.trim()
        if (!url) return null
        return (
          <button
            key={item.media_asset_id}
            type="button"
            onClick={() => onOpen(index)}
            className="group relative size-20 overflow-hidden rounded-lg ring-1 ring-border/60 transition-transform hover:scale-[1.03]"
          >
            {item.asset_type === 'video' ? (
              <video src={url} className="size-full object-cover" muted playsInline />
            ) : (
              <img
                src={url}
                alt=""
                loading="lazy"
                className="size-full object-cover"
              />
            )}
            {item.asset_type === 'video' ? (
              <span className="absolute inset-0 grid place-items-center bg-black/25 text-[10px] font-semibold text-white">
                VIDEO
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

function Lightbox({
  media,
  index,
  onClose,
}: {
  media: ProductReview['media']
  index: number
  onClose: () => void
}) {
  const item = media[index]
  const url = item?.cdn_url?.trim()
  if (!url) return null
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-6"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-5 right-5 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
      >
        <X className="size-5" />
      </button>
      {item.asset_type === 'video' ? (
        <video src={url} controls autoPlay className="max-h-[85vh] max-w-full rounded-xl" />
      ) : (
        <img src={url} alt="" className="max-h-[85vh] max-w-full rounded-xl object-contain" />
      )}
    </div>
  )
}

export type ReviewCardProps = {
  review: ProductReview
  /**
   * Casting a vote. Omit for guests — the button then invites them to sign in
   * rather than failing the call with a 401.
   */
  onVote?: (review: ProductReview, isHelpful: boolean) => void
  voting?: boolean
  /** Rendered under the review: "Edit"/"Delete" for the author, "Reply" for the seller. */
  actions?: React.ReactNode
  /** Shown above the stars, e.g. the product this review is about. */
  context?: React.ReactNode
  className?: string
}

export function ReviewCard({
  review,
  onVote,
  voting = false,
  actions,
  context,
  className,
}: ReviewCardProps) {
  const [lightbox, setLightbox] = useState<number | null>(null)
  const name = reviewerName(review)
  const avatar = review.is_anonymous ? null : review.customer?.image_url?.trim()
  const voted = review.voted_helpful === true

  return (
    <article
      className={cn(
        'rounded-2xl border border-border/60 bg-surface p-4 sm:p-5',
        className,
      )}
    >
      {context ? <div className="mb-3">{context}</div> : null}

      <div className="flex items-start gap-3">
        {avatar ? (
          <img
            src={avatar}
            alt=""
            className="size-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {initials(name)}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-sm font-semibold">{name}</span>
            {/* Every review here came from a delivered order line — the
                backend will not create one any other way. */}
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
              <BadgeCheck className="size-3.5" />
              Verified purchase
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <StarMeter value={review.rating} size="sm" />
            <span className="text-xs text-muted-foreground">
              {formatDate(review.created_at)}
            </span>
          </div>
        </div>
      </div>

      {review.title?.trim() ? (
        <h3 className="mt-3 text-sm font-semibold">{review.title}</h3>
      ) : null}
      {review.body?.trim() ? (
        <p className="mt-1.5 text-sm whitespace-pre-line text-muted-foreground">
          {review.body}
        </p>
      ) : null}

      <BreakdownChips review={review} />
      <MediaStrip media={review.media} onOpen={setLightbox} />

      {review.seller_reply?.trim() ? (
        <div className="mt-4 rounded-xl border-l-2 border-primary/40 bg-muted/50 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Store className="size-3.5 text-primary" />
            Seller replied
            {review.seller_replied_at ? (
              <span className="font-normal text-muted-foreground">
                · {formatDate(review.seller_replied_at)}
              </span>
            ) : null}
          </p>
          <p className="mt-1.5 text-sm whitespace-pre-line text-muted-foreground">
            {review.seller_reply}
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant={voted ? 'secondary' : 'ghost'}
          size="sm"
          disabled={voting || !onVote}
          onClick={() => onVote?.(review, !voted)}
          className="h-8 rounded-full px-3"
          aria-pressed={voted}
        >
          <ThumbsUp className={cn('size-3.5', voted && 'fill-current')} />
          Helpful
          {review.helpful_count > 0 ? (
            <span className="tabular-nums">({review.helpful_count})</span>
          ) : null}
        </Button>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>

      {lightbox != null ? (
        <Lightbox
          media={review.media}
          index={lightbox}
          onClose={() => setLightbox(null)}
        />
      ) : null}
    </article>
  )
}
