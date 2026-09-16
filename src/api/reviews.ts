import { api } from '@/lib/api'

/**
 * Verified-purchase product reviews.
 *
 * A review always hangs off a delivered order line, never off a product page:
 * the backend checks the order item is yours and `delivered` before it writes
 * anything, and `UNIQUE(order_item_id)` stops the same purchase being reviewed
 * twice. That is why the create call is addressed by order item, not product.
 */

/** One uploaded photo or video on a review, as the API returns it. */
export type ReviewMedia = {
  media_asset_id: string
  position: number
  asset_type: 'image' | 'video'
  bucket: string
  object_path: string
  cdn_url?: string | null
  mime_type: string
  size_bytes: number
}

/** The reviewer as the public sees them — "Anonymous" when they asked for it. */
export type ReviewCustomer = {
  display_name?: string | null
  image_url?: string | null
}

export type ReviewStatus = 'pending' | 'published' | 'hidden' | 'rejected'

export type ProductReview = {
  id: string
  product_id: string
  shop_id: string
  seller_id: string
  customer_id: string
  order_id: string
  order_item_id: string
  rating: number
  product_quality_rating: number
  shipping_rating: number
  seller_service_rating: number
  title?: string | null
  body?: string | null
  is_anonymous: boolean
  status: ReviewStatus
  seller_reply?: string | null
  seller_replied_at?: string | null
  helpful_count: number
  created_at: string
  updated_at: string
  media: ReviewMedia[]
  customer?: ReviewCustomer | null
  /** Only set when the caller is signed in and has voted on this review. */
  voted_helpful?: boolean | null
}

export type ReviewList = {
  items: ProductReview[]
  next_cursor?: string | null
}

export type ReviewSummary = {
  product_id: string
  review_count: number
  avg_rating: number
  avg_product_quality_rating: number
  avg_shipping_rating: number
  avg_seller_service_rating: number
  /** Keys "1".."5" → how many reviews gave that many stars. */
  rating_breakdown: Record<string, number>
}

/** A file already PUT to storage — send the presign `key` as `object_path`. */
export type ReviewMediaInput = {
  object_path: string
  mime_type: string
  size_bytes: number
}

export type CreateReviewInput = {
  rating: number
  product_quality_rating: number
  shipping_rating: number
  seller_service_rating: number
  title?: string | null
  body?: string | null
  is_anonymous: boolean
  media?: ReviewMediaInput[]
}

/** Same as create, except `media` omitted keeps the existing photos. */
export type UpdateReviewInput = Omit<CreateReviewInput, 'media'> & {
  media?: ReviewMediaInput[]
}

export type VoteResult = {
  vote: {
    id: string
    review_id: string
    customer_id: string
    is_helpful: boolean
    created_at: string
  }
  helpful_count: number
}

type ListParams = { cursor?: string | null; limit?: number }

function listQuery({ cursor, limit }: ListParams = {}): string {
  const params = new URLSearchParams()
  if (cursor) params.set('cursor', cursor)
  if (limit) params.set('limit', String(limit))
  const query = params.toString()
  return query ? `?${query}` : ''
}

// ── Public ────────────────────────────────────────────────────────────────
// Signed-in callers get `voted_helpful` filled in on each row; guests do not.

export function listProductReviews(productId: string, params?: ListParams) {
  return api<ReviewList>(`/products/${productId}/reviews${listQuery(params)}`)
}

export function getProductReviewSummary(productId: string) {
  return api<ReviewSummary>(`/products/${productId}/reviews/summary`)
}

export function listShopReviews(shopId: string, params?: ListParams) {
  return api<ReviewList>(`/shops/${shopId}/reviews${listQuery(params)}`)
}

export function getReview(id: string) {
  return api<ProductReview>(`/reviews/${id}`)
}

// ── Customer ──────────────────────────────────────────────────────────────

export function createReview(orderItemId: string, body: CreateReviewInput) {
  return api<ProductReview>(`/customers/me/order-items/${orderItemId}/reviews`, {
    method: 'POST',
    body,
  })
}

export function listMyReviews(params?: ListParams) {
  return api<ReviewList>(`/customers/me/reviews${listQuery(params)}`)
}

export function getMyReview(id: string) {
  return api<ProductReview>(`/customers/me/reviews/${id}`)
}

export function updateMyReview(id: string, body: UpdateReviewInput) {
  return api<ProductReview>(`/customers/me/reviews/${id}`, { method: 'PUT', body })
}

export function deleteMyReview(id: string) {
  return api<{ message: string }>(`/customers/me/reviews/${id}`, { method: 'DELETE' })
}

export function voteReview(id: string, isHelpful: boolean) {
  return api<VoteResult>(`/reviews/${id}/vote`, {
    method: 'PUT',
    body: { is_helpful: isHelpful },
  })
}

export function clearReviewVote(id: string) {
  return api<{ helpful_count: number }>(`/reviews/${id}/vote`, { method: 'DELETE' })
}

// ── Seller ────────────────────────────────────────────────────────────────

export function listSellerReviews(params?: ListParams) {
  return api<ReviewList>(`/sellers/me/reviews${listQuery(params)}`)
}

export function getSellerReview(id: string) {
  return api<ProductReview>(`/sellers/me/reviews/${id}`)
}

export function replyToReview(id: string, sellerReply: string) {
  return api<ProductReview>(`/sellers/me/reviews/${id}/reply`, {
    method: 'PUT',
    body: { seller_reply: sellerReply },
  })
}

export function clearReviewReply(id: string) {
  return api<ProductReview>(`/sellers/me/reviews/${id}/reply`, { method: 'DELETE' })
}
