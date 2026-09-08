import { api } from '@/lib/api'
import type { MessageResponse, ReelDetails, ReelFeed } from '@/api/types'

export type { ReelDetails, ReelFeed, ReelMediaItem, ReelProductSummary, ReelShopSummary }
  from '@/api/types'

/** `scope` mirrors the API: every reel, shop promos only, or product-tagged only. */
export type ReelScope = 'all' | 'shop' | 'product'

export type ReelFeedParams = {
  scope?: ReelScope
  shopId?: string
  productId?: string
  /** 1–50; the API defaults to 20. */
  limit?: number
  /** `next_cursor` from the previous page. */
  cursor?: string
}

/**
 * Reads the public reel feed. No auth: only published, public reels from
 * active shops come back, so a signed-out visitor sees the same thing.
 */
export function listReels({
  scope,
  shopId,
  productId,
  limit,
  cursor,
}: ReelFeedParams = {}) {
  const query = new URLSearchParams()
  if (scope) query.set('scope', scope)
  if (shopId) query.set('shop_id', shopId)
  if (productId) query.set('product_id', productId)
  if (limit) query.set('limit', String(limit))
  if (cursor) query.set('cursor', cursor)

  const suffix = query.toString()
  return api<ReelFeed>(`/reels${suffix ? `?${suffix}` : ''}`, { auth: false })
}

/** Reels tagged to one product. */
export function listProductReels(productId: string, limit?: number) {
  const query = limit ? `?limit=${limit}` : ''
  return api<ReelFeed>(`/products/${productId}/reels${query}`, { auth: false })
}

/** One reel. Counts a view server-side. */
export function getReel(id: string) {
  return api<ReelDetails>(`/reels/${id}`, { auth: false })
}

/** One file on a reel, as posted. `object_path` is the `key` from presign-upload. */
export type ReelMediaInput = {
  object_path: string
  mime_type: string
  size_bytes?: number
  metadata?: Record<string, unknown>
}

/**
 * The POST/PUT body for a seller reel.
 *
 * `reel_type` is derived server-side (any video item makes it a video), so it
 * is not sent. On update, omitting `media` keeps the current files — sending
 * an empty array is rejected.
 */
export type ReelInput = {
  product_id?: string | null
  caption?: string | null
  hashtags?: string[]
  visibility?: 'public' | 'private'
  status?: 'draft' | 'published' | 'archived'
  duration_ms?: number | null
  thumbnail?: ReelMediaInput | null
  media?: ReelMediaInput[]
}

/** Every reel the seller has posted, any status, newest first. */
export function listMyReels() {
  return api<ReelDetails[]>('/sellers/me/reels')
}

/** Reels on one of the seller's shops. */
export function listShopReels(shopId: string) {
  return api<ReelDetails[]>(`/sellers/me/shops/${shopId}/reels`)
}

/**
 * Posts a reel to a shop. Tagging a product is optional here — pass
 * `product_id` to connect the reel to something customers can buy.
 */
export function createShopReel(shopId: string, body: ReelInput) {
  return api<ReelDetails>(`/sellers/me/shops/${shopId}/reels`, {
    method: 'POST',
    body,
  })
}

export function updateSellerReel(id: string, body: ReelInput) {
  return api<ReelDetails>(`/sellers/me/reels/${id}`, { method: 'PUT', body })
}

export function deleteSellerReel(id: string) {
  return api<MessageResponse>(`/sellers/me/reels/${id}`, { method: 'DELETE' })
}
