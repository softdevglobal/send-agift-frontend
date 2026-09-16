import { api } from '@/lib/api'
import type {
  ChatAttachmentInput,
  ChatMessage,
  ConversationDetails,
  ConversationSummary,
  MessageResponse,
  SendMessageInput,
  StartConversationInput,
} from '@/api/types'

export type {
  ChatAttachmentInput,
  ChatMessage,
  ConversationDetails,
  ConversationParticipant,
  ConversationSummary,
  ConversationType,
  MessageAttachment,
  ParticipantRole,
  SendMessageInput,
  StartConversationInput,
  SupportCase,
  SupportPriority,
} from '@/api/types'

/** Starts a thread, or returns the existing one for the same product / order item / support case. */
export function startConversation(body: StartConversationInput) {
  return api<ConversationDetails>('/conversations', {
    method: 'POST',
    body,
  })
}

/** The caller's inbox, newest activity first, with unread counts. */
export function listConversations(signal?: AbortSignal) {
  return api<ConversationSummary[]>('/conversations', { signal })
}

/** The first message of a new thread, sent inside the start request. */
export type FirstMessage = {
  body: string
  attachments?: ChatAttachmentInput[]
}

/**
 * How recent a thread's last message must be to count as the one we just
 * sent. Kept short so a genuinely reused thread is never mistaken for new —
 * clock skew beyond this only risks a duplicate, never a lost message.
 */
const JUST_SENT_SLACK_MS = 30_000

/**
 * Starts a conversation with its first message in the same request
 * (`POST /conversations` with `body` and `attachments`), as the API docs show:
 * a product question carries `product_id`, an order chat `order_item_id`, and
 * an admin's support message the seller's `counterpart_user_id`.
 *
 * Order chats and admin-opened support always store that message. A product
 * question or seller ticket that's already open is handed back as-is without
 * it — so when the thread's last message predates this request, the message
 * is posted to the thread separately instead of being dropped.
 */
export async function startConversationWithMessage(
  target: Omit<StartConversationInput, 'body' | 'attachments'>,
  first: FirstMessage,
) {
  const startedAt = Date.now()
  const conversation = await startConversation({
    ...target,
    body: first.body,
    ...(first.attachments?.length ? { attachments: first.attachments } : {}),
  })

  const alwaysStored =
    target.type === 'order' || (target.type === 'support' && Boolean(target.counterpart_user_id))
  if (!alwaysStored) {
    const lastMessageAt = conversation.last_message_at
      ? Date.parse(conversation.last_message_at)
      : Number.NaN
    const stored =
      Number.isFinite(lastMessageAt) && lastMessageAt >= startedAt - JUST_SENT_SLACK_MS
    if (!stored) await sendMessage(conversation.id, first)
  }
  return conversation
}

export function getConversation(id: string) {
  return api<ConversationDetails>(`/conversations/${id}`)
}

/** Oldest → newest. Reading also marks the thread read for the caller. */
export function listMessages(
  id: string,
  params: { limit?: number; before?: string } = {},
  signal?: AbortSignal,
) {
  const query = new URLSearchParams()
  if (params.limit) query.set('limit', String(params.limit))
  if (params.before) query.set('before', params.before)
  const suffix = query.size ? `?${query.toString()}` : ''
  return api<ChatMessage[]>(`/conversations/${id}/messages${suffix}`, { signal })
}

export function sendMessage(id: string, body: SendMessageInput) {
  return api<ChatMessage>(`/conversations/${id}/messages`, {
    method: 'POST',
    body,
  })
}

export function markConversationRead(id: string) {
  return api<MessageResponse>(`/conversations/${id}/read`, { method: 'POST' })
}

export function closeConversation(id: string) {
  return api<ConversationDetails>(`/conversations/${id}/close`, { method: 'POST' })
}

export function reopenConversation(id: string) {
  return api<ConversationDetails>(`/conversations/${id}/reopen`, { method: 'POST' })
}
