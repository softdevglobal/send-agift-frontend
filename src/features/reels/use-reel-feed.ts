import { useCallback, useEffect, useRef, useState } from 'react'

import { listReels, type ReelFeedParams } from '@/api/reels'
import { getErrorMessage } from '@/lib/api'
import { isPlayable, toReelView, type ReelView } from '@/features/reels/reel-view'

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

  return { ...state, loadMore, retry }
}
