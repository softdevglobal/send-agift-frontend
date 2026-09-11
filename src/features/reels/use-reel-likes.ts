import { useCallback, useEffect, useRef } from 'react'

import { getReelLikes, likeReel, unlikeReel } from '@/api/reelSocial'
import { useAuth } from '@/features/auth/auth-context'
import type { ReelPatch } from '@/features/reels/use-reel-feed'
import type { ReelView } from '@/features/reels/reel-view'
import { ApiError } from '@/lib/api'

/**
 * Why the heart cannot be used right now: nobody is signed in, or the account
 * signed in is not a customer's. Null when liking is open.
 */
export type LikeGate = 'sign-in' | 'customer-only' | null

/**
 * The heart on each reel.
 *
 * Anyone sees the like count; only a signed-in customer can like. The public
 * feed never says whether *this* viewer liked a reel, so that is asked per
 * reel as it reaches the screen — once, and only for a customer.
 */
export function useReelLikes(patchReel: (reelId: string, patch: ReelPatch) => void) {
  const { role, isAuthenticated } = useAuth()
  const isCustomer = isAuthenticated && role === 'customer'
  const likeGate: LikeGate = isCustomer ? null : isAuthenticated ? 'customer-only' : 'sign-in'

  // Reels whose liked state has been asked for under the current session.
  const synced = useRef(new Set<string>())
  // A second tap while the first is in flight would race it.
  const pending = useRef(new Set<string>())

  useEffect(() => {
    synced.current = new Set()
  }, [isCustomer])

  /** Fills in the heart for the reel now on screen. */
  const syncLikes = useCallback(
    async (reelId: string) => {
      if (!isCustomer || synced.current.has(reelId)) return
      synced.current.add(reelId)
      try {
        const likes = await getReelLikes(reelId, true)
        patchReel(reelId, {
          likedByMe: likes.liked_by_requester,
          likeCount: likes.like_count,
          recentLikers: likes.recent_likers ?? [],
        })
      } catch {
        // Try again the next time it scrolls into view.
        synced.current.delete(reelId)
      }
    },
    [isCustomer, patchReel],
  )

  const toggleLike = useCallback(
    async (reel: ReelView) => {
      // The card explains why in place; nothing navigates away from the feed.
      if (!isCustomer) return
      if (pending.current.has(reel.id)) return
      pending.current.add(reel.id)

      const like = !reel.likedByMe
      // Optimistic: the heart answers the tap at once, the API settles the count.
      patchReel(reel.id, {
        likedByMe: like,
        likeCount: Math.max(0, reel.likeCount + (like ? 1 : -1)),
      })

      try {
        const result = like ? await likeReel(reel.id) : await unlikeReel(reel.id)
        patchReel(reel.id, { likedByMe: result.liked, likeCount: result.like_count })
      } catch (error) {
        if (!like && error instanceof ApiError && error.status === 404) {
          // Already unliked elsewhere — the heart is right to be empty.
          patchReel(reel.id, { likedByMe: false })
        } else {
          patchReel(reel.id, { likedByMe: reel.likedByMe, likeCount: reel.likeCount })
        }
      } finally {
        pending.current.delete(reel.id)
      }

      // "Liked by …" names come from the server; re-read them after a change.
      try {
        const likes = await getReelLikes(reel.id, true)
        patchReel(reel.id, {
          likedByMe: likes.liked_by_requester,
          likeCount: likes.like_count,
          recentLikers: likes.recent_likers ?? [],
        })
      } catch {
        // The count from the like call already stands.
      }
    },
    [isCustomer, patchReel],
  )

  return { likeGate, syncLikes, toggleLike }
}
