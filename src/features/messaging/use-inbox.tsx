import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import {
  getConversation,
  listConversations,
  type ConversationDetails,
  type ConversationSummary,
} from '@/api/messaging'
import { getErrorMessage } from '@/lib/api'

import { usePolling } from './use-polling'

const NO_CONVERSATIONS: ConversationSummary[] = []

export type InboxState = {
  conversations: ConversationSummary[]
  /** False until the first response lands — distinguishes "empty" from "loading". */
  loaded: boolean
  error: string | null
  unreadTotal: number
  /** Refetches now. Resolves to the fresh list, or null when the request failed. */
  refresh: () => Promise<ConversationSummary[] | null>
}

type UseInboxOptions = {
  enabled?: boolean
  intervalMs?: number
}

/** The caller's conversations, kept fresh by polling. */
export function useInbox({ enabled = true, intervalMs = 20_000 }: UseInboxOptions = {}): InboxState {
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const data = await listConversations()
      const list = Array.isArray(data) ? data : []
      setConversations(list)
      setError(null)
      return list
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load your messages.'))
      return null
    }
  }, [])

  useEffect(() => {
    // Signing out (or switching role) must not leave the last user's threads behind.
    if (!enabled) {
      setConversations(null)
      setError(null)
    }
  }, [enabled])

  usePolling(refresh, enabled ? intervalMs : null)

  const unreadTotal = useMemo(
    () => (conversations ?? []).reduce((total, item) => total + (item.unread_count || 0), 0),
    [conversations],
  )

  return {
    conversations: conversations ?? NO_CONVERSATIONS,
    loaded: conversations !== null,
    error,
    unreadTotal,
    refresh,
  }
}

const InboxContext = createContext<InboxState | null>(null)

/**
 * One poller per portal: the sidebar's unread badge and the inbox page read
 * the same list instead of each fetching it on their own timer.
 */
export function InboxProvider({
  children,
  intervalMs,
}: {
  children: ReactNode
  intervalMs?: number
}) {
  const inbox = useInbox({ intervalMs })
  return <InboxContext.Provider value={inbox}>{children}</InboxContext.Provider>
}

export function useSharedInbox(): InboxState {
  const context = useContext(InboxContext)
  if (!context) {
    throw new Error('useSharedInbox must be used within InboxProvider')
  }
  return context
}

/**
 * The selected conversation: from the inbox list when it's there, otherwise
 * fetched directly — a deep link or a just-created thread may not be in the
 * list until the next poll.
 */
export function useResolvedConversation(
  id: string | null,
  conversations: ConversationSummary[],
): ConversationSummary | ConversationDetails | null {
  const fromList = id ? (conversations.find((item) => item.id === id) ?? null) : null
  const inList = fromList !== null
  const [fetched, setFetched] = useState<ConversationDetails | null>(null)

  useEffect(() => {
    if (!id || inList) return
    let cancelled = false
    getConversation(id)
      .then((conversation) => {
        if (!cancelled) setFetched(conversation)
      })
      .catch(() => {
        if (!cancelled) setFetched(null)
      })
    return () => {
      cancelled = true
    }
  }, [id, inList])

  if (fromList) return fromList
  return fetched && fetched.id === id ? fetched : null
}
