import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Gift, Quote, Star } from 'lucide-react'

import { listReceivedGifts } from '@/api/orders'
import type { ReceivedGift } from '@/api/types'
import { FormAlert } from '@/components/common/form-alert'
import { CustomerEmptyState, CustomerPageHeader } from '@/features/customer-commerce'
import { customerPanelClass } from '@/features/customer-commerce/customer-styles'
import { useMyReviews } from '@/features/reviews/my-reviews'
import { ReviewOrderItemButton } from '@/features/reviews/review-order-item-button'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * Gifts other people sent you, once they've arrived. Each one can be
 * reviewed from here. Prices are never shown: it's a gift.
 */
export function CustomerReceivedGiftsPage() {
  const [gifts, setGifts] = useState<ReceivedGift[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { byOrderItem, apply } = useMyReviews()

  useEffect(() => {
    listReceivedGifts()
      .then(setGifts)
      .catch((err) => setError(getErrorMessage(err, 'Could not load your gifts.')))
  }, [])

  return (
    <>
      <CustomerPageHeader
        title="Gifts received"
        description="Everything people have sent you through SendAGift. Loved it? Leave a review."
      />

      <FormAlert error={error} className="mb-4" />

      {gifts === null && !error ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className={cn(customerPanelClass, 'h-48 animate-pulse')} />
          ))}
        </div>
      ) : gifts && gifts.length === 0 ? (
        <CustomerEmptyState
          icon={Gift}
          title="No gifts yet"
          description="When someone sends you a gift, it shows up here once it's delivered."
        />
      ) : (
        <div className="space-y-5">
          {gifts?.map((gift) => (
            <article key={gift.order_id} className={cn(customerPanelClass, 'overflow-hidden')}>
              <header className="relative bg-gradient-to-br from-pink-500 via-fuchsia-500 to-amber-400 px-5 py-5 text-white sm:px-6">
                <Gift aria-hidden className="absolute -top-3 -right-3 size-24 rotate-12 opacity-15" />
                <p className="text-[11px] font-semibold tracking-[0.18em] uppercase opacity-85">
                  Delivered {new Date(gift.delivered_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </p>
                <h2 className="mt-1 font-display text-2xl">From {gift.sender_name}</h2>
                {gift.gift_points > 0 ? (
                  <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
                    <Star className="size-3.5 fill-current" />
                    {gift.gift_points.toLocaleString()} points included
                  </span>
                ) : null}
              </header>

              <div className="space-y-4 px-5 py-5 sm:px-6">
                {gift.gift_message ? (
                  <blockquote className="relative rounded-2xl bg-gradient-to-br from-orange-50 to-pink-50 px-5 py-4 ring-1 ring-orange-100">
                    <Quote aria-hidden className="mb-1 size-4 text-pink-400" />
                    <p className="font-display text-lg leading-relaxed whitespace-pre-line text-orange-950 italic">
                      {gift.gift_message}
                    </p>
                    <footer className="mt-2 text-sm font-semibold text-pink-700">From {gift.sender_name}</footer>
                  </blockquote>
                ) : null}

                <ul className="divide-y divide-border/50">
                  {gift.items.map((item) => {
                    const mine = byOrderItem.get(item.id)
                    return (
                      <li key={item.id} className="flex items-start gap-4 py-3">
                        <Link to={`/products/${item.product_id}`} className="shrink-0">
                          {item.product_image_url ? (
                            <img
                              src={item.product_image_url}
                              alt=""
                              className="size-16 rounded-xl object-cover ring-1 ring-border/50"
                            />
                          ) : (
                            <span className="flex size-16 items-center justify-center rounded-xl bg-muted">
                              <Gift className="size-6 text-muted-foreground" />
                            </span>
                          )}
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/products/${item.product_id}`}
                            className="block truncate font-medium hover:text-primary"
                          >
                            {item.product_name}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            from {item.shop_name} · ×{item.quantity}
                          </p>
                          {item.review_id && !mine ? (
                            <p className="mt-1.5 text-xs text-muted-foreground">
                              {gift.sender_name} already reviewed this one.
                            </p>
                          ) : (
                            <ReviewOrderItemButton
                              orderItemId={item.id}
                              delivered={item.fulfilment_status === 'delivered'}
                              review={mine}
                              productName={item.product_name}
                              onSaved={apply}
                            />
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
