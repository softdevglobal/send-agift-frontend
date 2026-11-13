import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import {
  getConversation,
  listConversations,
  type ConversationDetails,
  type ConversationSummary,
} from '@/api/messaging'
import { useAuth } from '@/features/auth/auth-context'
import { getErrorMessage } from '@/lib/api'
import { getTokenSubject } from '@/lib/auth'

import { usePolling } from './use-polling'

const NO_CONVERSATIONS: ConversationSummary[] = []

export type InboxState = {
  conversations: ConversationSummary[]
  /** False until the first response lands. Distinguishes "empty" from "loading". */
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

/**
 * The caller's conversations, kept fresh by polling.
 *
 * The list belongs to one signed-in account. When the account changes (sign
 * out, sign in as someone else, or the inbox is switched off) the list is
 * cleared, requests still on their way are cancelled, and any answer that
 * started under the earlier account is thrown away instead of shown.
 */
export function useInbox({ enabled = true, intervalMs = 20_000 }: UseInboxOptions = {}): InboxState {
  const { token } = useAuth()
  const account = enabled && token ? (getTokenSubject() ?? token) : null
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  /** Bumped on every account change; a response from an older one is stale. */
  const generation = useRef(0)
  const inflight = useRef<AbortController | null>(null)

  useEffect(() => {
    generation.current += 1
    inflight.current?.abort()
    inflight.current = null
    setConversations(null)
    setError(null)
  }, [account])

  const refresh = useCallback(async () => {
    if (!account) return null
    const mine = generation.current
    const controller = new AbortController()
    inflight.current = controller
    try {
      const data = await listConversations(controller.signal)
      if (mine !== generation.current) return null
      const list = Array.isArray(data) ? data : []
      setConversations(list)
      setError(null)
      return list
    } catch (err) {
      if (mine !== generation.current || controller.signal.aborted) return null
      setError(getErrorMessage(err, 'Could not load your messages.'))
      return null
    } finally {
      if (inflight.current === controller) inflight.current = null
    }
  }, [account])

  usePolling(refresh, account ? intervalMs : null, account)

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
 * fetched directly. A deep link or a just-created thread may not be in the
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
