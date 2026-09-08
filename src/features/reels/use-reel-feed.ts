import { useCallback, useEffect, useRef, useState } from 'react'

import { getReel, listReels, type ReelFeedParams } from '@/api/reels'
import { getErrorMessage } from '@/lib/api'
import { isPlayable, toReelView, type ReelView } from '@/features/reels/reel-view'

/**
 * Reels already counted, for the life of the page.
 *
 * Module scope rather than a ref: React remounts this hook (StrictMode in
 * development, and any navigation away and back), and a per-instance set
 * would count the same reel again on every remount — inflating the number
 * the API stores.
 */
const countedReels = new Set<string>()

type ReelFeedState = {
  reels: ReelView[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  hasMore: boolean
}

/**
 * Loads the public reel feed and appends pages as the viewer scrolls.
 *
 * Paging is by the API's keyset cursor, so a reel posted mid-scroll never
 * shifts the page under the viewer.
 */
export function useReelFeed(params: ReelFeedParams = {}) {
  const { scope, shopId, productId, limit } = params

  const [state, setState] = useState<ReelFeedState>({
    reels: [],
    loading: true,
    loadingMore: false,
    error: null,
    hasMore: false,
  })

  const cursorRef = useRef<string | null>(null)
  // Guards against two loads racing after a fast scroll or a quick refresh.
  const loadingRef = useRef(false)

  const load = useCallback(
    async (mode: 'first' | 'more') => {
      if (loadingRef.current) return
      loadingRef.current = true

      setState((current) =>
        mode === 'first'
          ? { ...current, loading: true, error: null }
          : { ...current, loadingMore: true },
      )

      try {
        const feed = await listReels({
          scope,
          shopId,
          productId,
          limit,
          cursor: mode === 'more' ? (cursorRef.current ?? undefined) : undefined,
        })

        const page = (feed.items ?? []).map(toReelView).filter(isPlayable)
        cursorRef.current = feed.next_cursor ?? null

        setState((current) => ({
          reels: mode === 'first' ? page : [...current.reels, ...page],
          loading: false,
          loadingMore: false,
          error: null,
          hasMore: Boolean(cursorRef.current),
        }))
      } catch (error) {
        setState((current) => ({
          ...current,
          loading: false,
          loadingMore: false,
          // A failed "load more" keeps what is already on screen; only a
          // failed first page is worth replacing the feed with an error.
          error: mode === 'first' ? getErrorMessage(error, 'Could not load reels') : current.error,
        }))
      } finally {
        loadingRef.current = false
      }
    },
    [scope, shopId, productId, limit],
  )

  useEffect(() => {
    cursorRef.current = null
    void load('first')
  }, [load])

  const loadMore = useCallback(() => {
    if (!cursorRef.current) return
    void load('more')
  }, [load])

  const retry = useCallback(() => {
    cursorRef.current = null
    void load('first')
  }, [load])

  /**
   * Counts a view for the reel now on screen.
   *
   * `GET /reels/{id}` increments `view_count` server-side and returns the
   * already-incremented reel, so the number shown is the one the database now
   * holds rather than a guess.
   */
  const registerView = useCallback(async (reelId: string) => {
    if (countedReels.has(reelId)) return
    countedReels.add(reelId)

    try {
      const updated = await getReel(reelId)
      setState((current) => ({
        ...current,
        reels: current.reels.map((reel) =>
          reel.id === reelId ? { ...reel, viewCount: updated.view_count } : reel,
        ),
      }))
    } catch {
      // A missed view is not worth interrupting playback for.
    }
  }, [])

  return { ...state, loadMore, retry, registerView }
}
