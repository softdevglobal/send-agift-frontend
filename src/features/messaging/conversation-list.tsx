import type { ReactNode } from 'react'
import { ChevronRight, Gift, LifeBuoy, Package, type LucideIcon } from 'lucide-react'

import type { ConversationSummary, ConversationType } from '@/api/messaging'
import { cn } from '@/lib/utils'

import { ChatAvatar } from './chat-avatar'
import { useConversationLabel } from './conversation-label'
import { formatInboxTime, SUPPORT_PRIORITY_LABEL, type ChatViewerRole } from './messaging-utils'

const TYPE_META: Record<ConversationType, { label: string; icon: LucideIcon; className: string }> = {
  product_inquiry: {
    label: 'Buyer question',
    icon: Gift,
    className: 'bg-accent text-accent-foreground',
  },
  order: {
    label: 'Order',
    icon: Package,
    className: 'bg-brand-teal/12 text-[oklch(0.45_0.09_195)]',
  },
  support: {
    label: 'Support',
    icon: LifeBuoy,
    className: 'bg-muted text-muted-foreground',
  },
}

type ConversationListProps = {
  conversations: ConversationSummary[]
  viewer: ChatViewerRole
  selectedId?: string | null
  onSelect: (conversation: ConversationSummary) => void
}

/**
 * The seller and admin inbox list: who wrote in, what it's about, and
 * anything unread pulled into its own section at the top — same shape as the
 * customer's conversation list, mirrored so the person comes first here (a
 * seller cares who's asking before what gift it's about).
 */
export function ConversationList({
  conversations,
  viewer,
  selectedId,
  onSelect,
}: ConversationListProps) {
  const fresh = conversations.filter((item) => item.unread_count > 0)
  const earlier = conversations.filter((item) => item.unread_count === 0)

  return (
    <div className="space-y-5 p-3">
      {fresh.length ? (
        <Section title="New" count={fresh.length} highlight>
          {fresh.map((conversation, index) => (
            <ConversationRow
              key={conversation.id}
              conversation={conversation}
              viewer={viewer}
              selected={conversation.id === selectedId}
              onSelect={onSelect}
              index={index}
            />
          ))}
        </Section>
      ) : null}
      {earlier.length ? (
        <Section title={fresh.length ? 'Earlier' : 'Conversations'}>
          {earlier.map((conversation, index) => (
            <ConversationRow
              key={conversation.id}
              conversation={conversation}
              viewer={viewer}
              selected={conversation.id === selectedId}
              onSelect={onSelect}
              index={fresh.length + index}
            />
          ))}
        </Section>
      ) : null}
    </div>
  )
}

function Section({
  title,
  count,
  highlight = false,
  children,
}: {
  title: string
  count?: number
  highlight?: boolean
  children: ReactNode
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 px-1">
        {highlight ? (
          <span aria-hidden className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-teal opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-brand-teal" />
          </span>
        ) : null}
        <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          {title}
        </p>
        {count ? <span className="text-[10px] font-semibold text-primary">{count}</span> : null}
        <span aria-hidden className="h-px flex-1 bg-border/60" />
      </div>
      <ul className="space-y-2">{children}</ul>
    </section>
  )
}

function ConversationRow({
  conversation,
  viewer,
  selected,
  onSelect,
  index,
}: {
  conversation: ConversationSummary
  viewer: ChatViewerRole
  selected: boolean
  onSelect: (conversation: ConversationSummary) => void
  index: number
}) {
  const label = useConversationLabel(conversation, viewer)
  const unread = conversation.unread_count
  const priority = viewer === 'admin' ? conversation.support_case?.priority : undefined
  const flagged = priority === 'high' || priority === 'urgent'
  const type = TYPE_META[conversation.type]
  // A gift/order thumbnail badges the person's avatar — a seller cares who's
  // writing first, what it's about second.
  const badgeImage = label.context?.imageUrl ?? null

  return (
    <li
      className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:fill-mode-both motion-safe:duration-300"
      style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
    >
      <button
        type="button"
        onClick={() => onSelect(conversation)}
        aria-current={selected ? 'true' : undefined}
        className={cn(
          'group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl bg-card p-2.5 pl-3.5 text-left ring-1 transition-all duration-200 hover:-translate-y-0.5',
          selected
            ? 'shadow-[0_10px_26px_rgba(109,40,217,0.16)] ring-primary/40'
            : unread
              ? 'shadow-[0_10px_26px_rgba(109,40,217,0.10)] ring-primary/25 hover:shadow-[0_14px_32px_rgba(109,40,217,0.16)]'
              : 'shadow-sm ring-border/60 hover:shadow-[0_12px_28px_rgba(20,20,55,0.08)]',
        )}
      >
        {selected || unread ? (
          <span aria-hidden className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-primary" />
        ) : null}

        <span className="relative shrink-0">
          <ChatAvatar
            kind={label.kind}
            imageUrl={label.imageUrl}
            name={label.avatarName}
            className="size-12"
          />
          {badgeImage ? (
            <img
              src={badgeImage}
              alt=""
              className="absolute -right-1.5 -bottom-1.5 size-6 rounded-lg object-cover ring-2 ring-card"
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
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {label.context?.name ?? label.subtitle}
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                type.className,
              )}
            >
              <type.icon className="size-3" />
              {type.label}
            </span>
            {conversation.status === 'closed' ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                Closed
              </span>
            ) : null}
            {flagged && priority ? (
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                {SUPPORT_PRIORITY_LABEL[priority]}
              </span>
            ) : null}
            {unread ? (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                {unread === 1 ? 'New' : `${unread > 99 ? '99+' : unread} new`}
              </span>
            ) : null}
          </span>
        </span>

        <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
      </button>
    </li>
  )
}
