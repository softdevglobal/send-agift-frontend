import { useCallback, useEffect, useState } from 'react'

import { listMyReviews, type ProductReview } from '@/api/reviews'

/** Stop a runaway cursor from paging forever on a large history. */
const MAX_PAGES = 20
const PAGE_SIZE = 100

/** Every review the signed-in customer has written, newest first. */
export async function fetchAllMyReviews(): Promise<ProductReview[]> {
  const all: ProductReview[] = []
  let cursor: string | null = null
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await listMyReviews({ cursor, limit: PAGE_SIZE })
    all.push(...result.items)
    cursor = result.next_cursor ?? null
    if (!cursor) break
  }
  return all
}

export type MyReviewsState = {
  /** Keyed by `order_item_id` — one review per delivered line, by definition. */
  byOrderItem: Map<string, ProductReview>
  reviews: ProductReview[]
  loading: boolean
  reload: () => Promise<void>
  /** Applies a just-saved review without refetching the whole list. */
  apply: (review: ProductReview) => void
  /** Drops a deleted review from the map. */
  remove: (reviewId: string) => void
}

/**
 * The customer's own reviews, fetched once and indexed by order item.
 *
 * An order page needs to know, per line, whether it has been reviewed yet.
 * Asking per line would be one request per item; this is one request for the
 * page.
 */
export function useMyReviews(enabled = true): MyReviewsState {
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [loading, setLoading] = useState(enabled)

  const reload = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      setReviews(await fetchAllMyReviews())
    } catch {
      // A failed load just means no "you reviewed this" badges; the page works.
      setReviews([])
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void reload()
  }, [reload])

  const apply = useCallback((review: ProductReview) => {
    setReviews((current) => {
      const rest = current.filter((row) => row.id !== review.id)
      return [review, ...rest]
    })
  }, [])

  const remove = useCallback((reviewId: string) => {
    setReviews((current) => current.filter((row) => row.id !== reviewId))
  }, [])

  const byOrderItem = new Map(reviews.map((review) => [review.order_item_id, review]))

  return { byOrderItem, reviews, loading, reload, apply, remove }
}
