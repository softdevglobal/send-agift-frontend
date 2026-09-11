import type {
  ChatMessage,
  ConversationParticipant,
  ConversationType,
  MessageAttachment,
  ParticipantRole,
  SupportPriority,
} from '@/api/messaging'
import type { MediaFolder } from '@/api/media'
import type { SupportCaseStatus } from '@/api/types'
import type { UserRole } from '@/lib/auth'

/** The API rejects more than this many files on one message. */
export const MAX_CHAT_ATTACHMENTS = 5

/** Client-side cap so a huge upload fails fast instead of timing out. */
export const MAX_CHAT_FILE_BYTES = 15 * 1024 * 1024

/** Photos and PDFs — what the chat-image / chat-document folders are for. */
export const CHAT_FILE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,application/pdf'

/** Messages returned per page; a full page means older ones may exist. */
export const CHAT_PAGE_SIZE = 50

export type ChatViewerRole = ParticipantRole

/** Superadmins chat as admins — the API treats them the same way. */
export function chatViewerRole(role: UserRole | null): ChatViewerRole | null {
  if (role === 'customer' || role === 'seller') return role
  if (role === 'admin' || role === 'superadmin') return 'admin'
  return null
}

export const CONVERSATION_TYPE_LABEL: Record<ConversationType, string> = {
  product_inquiry: 'Product question',
  order: 'Order',
  support: 'Support',
}

export const SUPPORT_PRIORITIES: SupportPriority[] = ['low', 'normal', 'high', 'urgent']

export const SUPPORT_PRIORITY_LABEL: Record<SupportPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
}

export const SUPPORT_STATUS_LABEL: Record<SupportCaseStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  closed: 'Closed',
}

/** Whoever you're talking to — the first participant who isn't you. */
export function counterpartOf(
  participants: ConversationParticipant[] | undefined,
  userId: string | null,
): ConversationParticipant | null {
  return participants?.find((participant) => participant.user_id !== userId) ?? null
}

export function attachmentsOf(message: ChatMessage): MessageAttachment[] {
  return message.attachments ?? []
}

function timeOf(iso: string): number {
  const value = Date.parse(iso)
  return Number.isNaN(value) ? 0 : value
}

/**
 * Folds a freshly fetched page into what's on screen, oldest first.
 *
 * Polling returns the newest page again and again; merging by id keeps older
 * pages the viewer loaded and never duplicates a bubble we already appended
 * after sending.
 */
export function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  if (incoming.length === 0) return current
  const byId = new Map(current.map((message) => [message.id, message]))
  for (const message of incoming) byId.set(message.id, message)
  return [...byId.values()].sort(
    (a, b) => timeOf(a.created_at) - timeOf(b.created_at) || a.id.localeCompare(b.id),
  )
}

export function isImageAttachment(attachment: Pick<MessageAttachment, 'asset_type' | 'mime_type'>) {
  return attachment.asset_type === 'image' || attachment.mime_type.startsWith('image/')
}

const UPLOAD_PREFIX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i

/** Presign keys look like `public/chat/documents/<uuid>-invoice.pdf`; show just `invoice.pdf`. */
export function attachmentFileName(attachment: Pick<MessageAttachment, 'object_path'>): string {
  const last = attachment.object_path.split('/').pop() ?? attachment.object_path
  return last.replace(UPLOAD_PREFIX, '') || last
}

function chatMimeType(file: File): string {
  if (file.type) return file.type
  return file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : ''
}

export function chatFolderFor(file: File): MediaFolder {
  return chatMimeType(file).startsWith('image/') ? 'chat-image' : 'chat-document'
}

/** Why a picked file can't be sent, or null when it's fine. */
export function chatFileProblem(file: File): string | null {
  const type = chatMimeType(file)
  if (!type.startsWith('image/') && type !== 'application/pdf') {
    return `${file.name} isn't a photo or PDF.`
  }
  if (file.size > MAX_CHAT_FILE_BYTES) {
    return `${file.name} is larger than ${formatFileSize(MAX_CHAT_FILE_BYTES)}.`
  }
  return null
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function daysAgo(date: Date): number {
  return Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000)
}

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short' })
const shortDateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' })
const longDateFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

/** Inbox-row timestamp: a time today, a weekday this week, a date otherwise. */
export function formatInboxTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const ago = daysAgo(date)
  if (ago <= 0) return timeFormat.format(date)
  if (ago === 1) return 'Yesterday'
  if (ago < 7) return weekdayFormat.format(date)
  return shortDateFormat.format(date)
}

export function formatBubbleTime(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : timeFormat.format(date)
}

/** Separator between days in a thread. */
export function formatDayLabel(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const ago = daysAgo(date)
  if (ago <= 0) return 'Today'
  if (ago === 1) return 'Yesterday'
  return longDateFormat.format(date)
}

export function dayKey(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? ''
    : `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

export function shortId(id: string): string {
  return id.slice(0, 8)
}

export function capitalize(value: string): string {
  return value ? value[0].toUpperCase() + value.slice(1) : value
}
