import { api } from '@/lib/api'
import type {
  MessageResponse,
  ReelComment,
  ReelCommentList,
  ReelLikeResult,
  ReelLikes,
} from '@/api/types'

export type { ReelComment, ReelCommentList, ReelLikeResult, ReelLiker, ReelLikes }
  from '@/api/types'

/**
 * Reel likes and comments.
 *
 * Reads are public. Writes take the signed-in customer's bearer token — the
 * API also accepts an `X-Guest-Token`, but the storefront only lets signed-in
 * customers like and comment.
 */

/**
 * Like count, the newest likers, and — when `asViewer` sends the customer's
 * token — whether this viewer already liked the reel. The public feed never
 * fills `liked_by_me`, so this is where the heart's state comes from.
 */
export function getReelLikes(reelId: string, asViewer: boolean) {
  return api<ReelLikes>(`/reels/${reelId}/likes`, { auth: asViewer })
}

/** Idempotent: liking twice leaves one like and returns 200 both times. */
export function likeReel(reelId: string) {
  return api<ReelLikeResult>(`/reels/${reelId}/likes`, { method: 'POST' })
}

/** 404s when this customer has no like on the reel. */
export function unlikeReel(reelId: string) {
  return api<ReelLikeResult>(`/reels/${reelId}/likes`, { method: 'DELETE' })
}

/** Visible comments, newest first, keyset paged. */
export function listReelComments(
  reelId: string,
  { cursor, limit }: { cursor?: string; limit?: number } = {},
) {
  const query = new URLSearchParams()
  if (limit) query.set('limit', String(limit))
  if (cursor) query.set('cursor', cursor)
  const suffix = query.toString()
  return api<ReelCommentList>(
    `/reels/${reelId}/comments${suffix ? `?${suffix}` : ''}`,
    { auth: false },
  )
}

export type ReelCommentInput = {
  body: string
  /** Hides the customer's name; `display_name` is shown instead. */
  is_anonymous?: boolean
  display_name?: string
}

export function createReelComment(reelId: string, body: ReelCommentInput) {
  return api<ReelComment>(`/reels/${reelId}/comments`, { method: 'POST', body })
}

/** Author only — the API matches the token against the stored author. */
export function updateReelComment(reelId: string, commentId: string, body: string) {
  return api<ReelComment>(`/reels/${reelId}/comments/${commentId}`, {
    method: 'PUT',
    body: { body },
  })
}

/** Author only. A soft delete: the comment drops out of every list. */
export function deleteReelComment(reelId: string, commentId: string) {
  return api<MessageResponse>(`/reels/${reelId}/comments/${commentId}`, {
    method: 'DELETE',
  })
}
