import type { ReelComment, ReelDetails, ReelLiker, ReelMediaItem } from '@/api/types'
import { formatPriceAmount } from '@/lib/money'

/** What the product tagged on a reel gives the UI. */
export type ReelProductView = {
  id: string
  name: string
  priceLabel: string
  imageUrl: string | null
}

/** A reel reduced to what the feed actually renders. */
export type ReelView = {
  id: string
  shopName: string
  shopId: string | null
  shopImageUrl: string | null
  caption: string | null
  hashtags: string[]
  /** First playable video, if the reel has one. */
  videoUrl: string | null
  /** Poster for a video, or the first frame of a photo post. */
  imageUrl: string | null
  /**
   * Every image on the reel, in the order the seller arranged them. A photo
   * post can carry up to ten, which the feed shows as a carousel.
   */
  photoUrls: string[]
  product: ReelProductView | null
  viewCount: number
  likeCount: number
  commentCount: number
  /** Whether the signed-in customer liked it. False until the API says so. */
  likedByMe: boolean
  /** Newest likers, names only. */
  recentLikers: ReelLiker[]
  /** Visible comments embedded in the feed, newest first. */
  comments: ReelComment[]
}

/**
 * Media plays only through `cdn_url`, which the API fills in solely for
 * objects under `public/`. Anything else has no URL the browser can open, so
 * it is treated as absent rather than rendered as a broken player.
 */
function mediaUrl(item: ReelMediaItem | null | undefined): string | null {
  const url = item?.cdn_url
  return typeof url === 'string' && url.trim() ? url.trim() : null
}

function urlsOfType(
  media: ReelMediaItem[],
  assetType: ReelMediaItem['asset_type'],
): string[] {
  const urls: string[] = []
  for (const item of media) {
    if (item.asset_type !== assetType) continue
    const url = mediaUrl(item)
    if (url) urls.push(url)
  }
  return urls
}

function text(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function toReelView(reel: ReelDetails): ReelView {
  // `position` is the seller's ordering of a carousel. The API already sorts
  // by it; sorting again costs nothing and keeps the order right if a
  // response ever arrives out of order.
  const media = [...(reel.media ?? [])].sort((a, b) => a.position - b.position)
  const product = reel.product ?? null
  const photos = urlsOfType(media, 'image')

  return {
    id: reel.id,
    shopId: reel.shop?.id ?? null,
    shopName: text(reel.shop?.name) ?? 'Send A Gift',
    shopImageUrl: text(reel.shop?.image_url),
    caption: text(reel.caption),
    hashtags: (reel.hashtags ?? []).filter(Boolean),
    videoUrl: urlsOfType(media, 'video')[0] ?? null,
    imageUrl: mediaUrl(reel.thumbnail) ?? photos[0] ?? text(product?.image_url),
    photoUrls: photos,
    product: product
      ? {
          id: product.id,
          name: text(product.name) ?? 'Gift',
          priceLabel: formatPriceAmount(product.price_amount, product.currency),
          imageUrl: text(product.image_url),
        }
      : null,
    viewCount: reel.view_count ?? 0,
    likeCount: reel.like_count ?? 0,
    commentCount: reel.comment_count ?? 0,
    likedByMe: reel.liked_by_me ?? false,
    recentLikers: reel.recent_likers ?? [],
    comments: reel.comments ?? [],
  }
}

/**
 * "Liked by Aisha and 12 others". Only names from `recent_likers` are
 * known; everyone past them is folded into the count.
 */
export function likersLine(reel: ReelView): string | null {
  const names = reel.recentLikers.map((liker) => liker.display_name.trim()).filter(Boolean)
  if (reel.likeCount <= 0 || names.length === 0) return null
  const first = names[0]
  const others = reel.likeCount - 1
  if (others <= 0) return `Liked by ${first}`
  return `Liked by ${first} and ${compactCount(others)} ${others === 1 ? 'other' : 'others'}`
}

/** True when this is a photo post with more than one frame to swipe through. */
export function isCarousel(reel: ReelView): boolean {
  return !reel.videoUrl && reel.photoUrls.length > 1
}

/** A reel with nothing playable is dropped rather than shown as a blank card. */
export function isPlayable(reel: ReelView): boolean {
  return Boolean(reel.videoUrl || reel.imageUrl)
}

/** Hashtags come back stripped and lowercased; the UI puts the `#` back. */
export function hashtagLine(reel: ReelView): string {
  return reel.hashtags.map((tag) => `#${tag}`).join(' ')
}

/** 1200 → "1.2K". The overlay has room for a glance, not a full number. */
export function compactCount(count: number): string {
  if (count < 1000) return String(count)
  if (count < 1_000_000) {
    const thousands = count / 1000
    return `${thousands.toFixed(thousands < 10 ? 1 : 0)}K`
  }
  const millions = count / 1_000_000
  return `${millions.toFixed(millions < 10 ? 1 : 0)}M`
}
