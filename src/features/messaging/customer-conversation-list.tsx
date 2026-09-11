import type { ReactNode } from 'react'
import { ChevronRight, Gift, LifeBuoy, Package, type LucideIcon } from 'lucide-react'

import type { ConversationSummary, ConversationType } from '@/api/messaging'
import { cn } from '@/lib/utils'

import { ChatAvatar } from './chat-avatar'
import { useConversationLabel } from './conversation-label'
import { formatInboxTime } from './messaging-utils'

const TYPE_META: Record<ConversationType, { label: string; icon: LucideIcon; className: string }> = {
  product_inquiry: {
    label: 'Gift question',
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

type CustomerConversationListProps = {
  conversations: ConversationSummary[]
  onSelect: (conversation: ConversationSummary) => void
}

/**
 * The customer's chats as gift cards rather than a plain list: each shows the
 * gift it's about with the shop's badge on its corner, and threads with
 * unread replies are pulled into their own section at the top.
 */
export function CustomerConversationList({
  conversations,
  onSelect,
}: CustomerConversationListProps) {
  const fresh = conversations.filter((item) => item.unread_count > 0)
  const earlier = conversations.filter((item) => item.unread_count === 0)

  return (
    <div className="space-y-6 px-3 pt-4 pb-6">
      {fresh.length ? (
        <Section title="New replies" count={fresh.length} highlight>
          {fresh.map((conversation, index) => (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
              index={index}
              onSelect={onSelect}
            />
          ))}
        </Section>
      ) : null}
      {earlier.length ? (
        <Section title={fresh.length ? 'Earlier' : 'Your conversations'}>
          {earlier.map((conversation, index) => (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
              index={fresh.length + index}
              onSelect={onSelect}
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
      <div className="mb-2.5 flex items-center gap-2 px-1">
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
      <ul className="space-y-2.5">{children}</ul>
    </section>
  )
}

function ConversationCard({
  conversation,
  index,
  onSelect,
}: {
  conversation: ConversationSummary
  index: number
  onSelect: (conversation: ConversationSummary) => void
}) {
  const label = useConversationLabel(conversation, 'customer')
  const unread = conversation.unread_count
  const isSupport = conversation.type === 'support'
  const giftImage = label.context?.imageUrl ?? null
  // The label falls back to the gift photo when the shop has none; the badge
  // then shows the shop icon instead of repeating the gift.
  const shopImage = label.imageUrl && label.imageUrl !== giftImage ? label.imageUrl : null
  const type = TYPE_META[conversation.type]

  return (
    <li
      className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:fill-mode-both motion-safe:duration-300"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <button
        type="button"
        onClick={() => onSelect(conversation)}
        className={cn(
          'group relative flex w-full items-center gap-3.5 overflow-hidden rounded-2xl bg-card p-3 pl-3.5 text-left ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(20,20,55,0.10)]',
          unread
            ? 'shadow-[0_10px_28px_rgba(109,40,217,0.12)] ring-primary/30'
            : 'shadow-sm ring-border/60',
        )}
      >
        {unread ? (
          <span aria-hidden className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-primary" />
        ) : null}

        <span className="relative shrink-0">
          {isSupport ? (
            <ChatAvatar kind="support" className="size-14 rounded-2xl" />
          ) : giftImage ? (
            <img
              src={giftImage}
              alt=""
              className="size-14 rounded-2xl object-cover ring-1 ring-border/60 transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <Gift className="size-6" />
            </span>
          )}
          {isSupport ? null : (
            <ChatAvatar
              kind="shop"
              imageUrl={shopImage}
              size="xs"
              className="absolute -right-1.5 -bottom-1.5 ring-2 ring-card"
            />
          )}
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
            {isSupport ? label.subtitle : (label.context?.name ?? label.subtitle)}
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-1.5">
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
            {unread ? (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                {unread === 1 ? 'New reply' : `${unread > 99 ? '99+' : unread} new replies`}
              </span>
            ) : null}
          </span>
        </span>

        <ChevronRight className="size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
      </button>
    </li>
  )
}
