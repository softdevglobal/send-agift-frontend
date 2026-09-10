import { Gift, LifeBuoy, Package, type LucideIcon } from 'lucide-react'

import type { ConversationSummary, ConversationType } from '@/api/messaging'
import { cn } from '@/lib/utils'

import { ChatAvatar } from './chat-avatar'
import { useConversationLabel } from './conversation-label'
import { formatInboxTime, SUPPORT_PRIORITY_LABEL, type ChatViewerRole } from './messaging-utils'

const TYPE_ICONS: Record<ConversationType, LucideIcon> = {
  product_inquiry: Gift,
  order: Package,
  support: LifeBuoy,
}

type ConversationListProps = {
  conversations: ConversationSummary[]
  viewer: ChatViewerRole
  selectedId?: string | null
  onSelect: (conversation: ConversationSummary) => void
}

export function ConversationList({
  conversations,
  viewer,
  selectedId,
  onSelect,
}: ConversationListProps) {
  return (
    <ul className="space-y-1 p-2">
      {conversations.map((conversation, index) => (
        <li
          key={conversation.id}
          className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:fill-mode-both"
          style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
        >
          <ConversationRow
            conversation={conversation}
            viewer={viewer}
            selected={conversation.id === selectedId}
            onSelect={onSelect}
          />
        </li>
      ))}
    </ul>
  )
}

function ConversationRow({
  conversation,
  viewer,
  selected,
  onSelect,
}: {
  conversation: ConversationSummary
  viewer: ChatViewerRole
  selected: boolean
  onSelect: (conversation: ConversationSummary) => void
}) {
  const label = useConversationLabel(conversation, viewer)
  const unread = conversation.unread_count > 0
  const priority = viewer === 'admin' ? conversation.support_case?.priority : undefined
  const flagged = priority === 'high' || priority === 'urgent'
  const TypeIcon = TYPE_ICONS[conversation.type]

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation)}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all',
        selected
          ? 'bg-accent shadow-sm ring-1 ring-primary/15'
          : unread
            ? 'bg-accent/35 hover:bg-accent/60'
            : 'hover:bg-muted/70',
      )}
    >
      <span className="relative shrink-0">
        <ChatAvatar kind={label.kind} imageUrl={label.imageUrl} name={label.avatarName} />
        {unread ? (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-brand-teal ring-2 ring-card"
          />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-sm',
              unread ? 'font-semibold text-foreground' : 'font-medium',
            )}
          >
            {label.title}
          </span>
          <span
            className={cn(
              'shrink-0 text-[11px]',
              unread ? 'font-semibold text-primary' : 'text-muted-foreground',
            )}
          >
            {formatInboxTime(conversation.last_message_at ?? conversation.created_at)}
          </span>
        </span>
        <span className="mt-0.5 flex items-center gap-1.5">
          <TypeIcon className="size-3.5 shrink-0 text-muted-foreground/80" aria-hidden />
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-xs',
              unread ? 'text-foreground/80' : 'text-muted-foreground',
            )}
          >
            {label.subtitle}
          </span>
          {conversation.status === 'closed' ? (
            <span className="shrink-0 rounded-full bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground">
              Closed
            </span>
          ) : null}
          {flagged && priority ? (
            <span className="shrink-0 rounded-full bg-destructive/10 px-1.5 py-px text-[10px] font-medium text-destructive">
              {SUPPORT_PRIORITY_LABEL[priority]}
            </span>
          ) : null}
          {unread ? (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-violet to-brand-navy px-1.5 text-[10px] font-semibold text-white">
              <span className="sr-only">Unread messages: </span>
              {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
            </span>
          ) : null}
        </span>
      </span>
    </button>
  )
}
