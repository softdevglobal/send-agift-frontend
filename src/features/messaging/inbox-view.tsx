import type { ReactNode } from 'react'
import { Inbox, LoaderCircle, MessageSquare } from 'lucide-react'

import type {
  ConversationDetails,
  ConversationSummary,
} from '@/api/messaging'
import { cn } from '@/lib/utils'

import { ChatThread, type ChatDraft } from './chat-thread'
import { ConversationList } from './conversation-list'
import type { ChatViewerRole } from './messaging-utils'
import { useResolvedConversation } from './use-inbox'

type EmptyCopy = { title: string; description: string }

type InboxViewProps = {
  viewer: ChatViewerRole
  conversations: ConversationSummary[]
  loaded: boolean
  error: string | null
  selectedId: string | null
  onSelect: (id: string | null) => void
  draft?: ChatDraft | null
  draftHint?: string
  /** Starter messages offered in an empty draft thread. */
  draftSuggestions?: string[]
  onDraftStarted?: (conversation: ConversationDetails) => void
  onDraftCancel?: () => void
  onChanged: () => void
  threadActions?: (conversation: ConversationSummary | ConversationDetails) => ReactNode
  emptyList: EmptyCopy
  emptyThread: EmptyCopy
  className?: string
}

/**
 * The two-pane inbox for the seller and admin portals: conversations on the
 * left, the open thread on the right. Below `lg` it's one pane at a time, with
 * a back button in the thread header.
 */
export function InboxView({
  viewer,
  conversations,
  loaded,
  error,
  selectedId,
  onSelect,
  draft,
  draftHint,
  draftSuggestions,
  onDraftStarted,
  onDraftCancel,
  onChanged,
  threadActions,
  emptyList,
  emptyThread,
  className,
}: InboxViewProps) {
  const selected = useResolvedConversation(selectedId, conversations)
  const showDraft = !selected && Boolean(draft)
  const threadVisible = Boolean(selected) || showDraft

  return (
    <div
      className={cn(
        'grid h-[calc(100svh-17rem)] min-h-[32rem] overflow-hidden rounded-2xl bg-card shadow-[0_10px_36px_rgba(40,50,30,0.05)] ring-1 ring-border/50 lg:grid-cols-[21rem_minmax(0,1fr)]',
        className,
      )}
    >
      <aside
        className={cn(
          'min-h-0 flex-col border-border/60 lg:flex lg:border-r',
          threadVisible ? 'hidden' : 'flex',
        )}
      >
        <div className="min-h-0 flex-1 overflow-y-auto bg-surface">
          {!loaded && !error ? (
            <div className="flex justify-center py-16">
              <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : error && conversations.length === 0 ? (
            <p role="alert" className="m-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : conversations.length === 0 ? (
            <EmptyPane icon={Inbox} {...emptyList} />
          ) : (
            <ConversationList
              conversations={conversations}
              viewer={viewer}
              selectedId={selectedId}
              onSelect={(conversation) => onSelect(conversation.id)}
            />
          )}
        </div>
      </aside>

      {/*
        Below `lg` an open thread takes the whole screen — a chat squeezed into
        this panel's own scroll area, under the portal's header, reads as
        broken on a phone. `fixed inset-0` lifts it out of that layout
        entirely; `lg:` reverts it to an ordinary grid cell alongside the list.
      */}
      <div
        className={cn(
          'min-h-0',
          threadVisible
            ? 'fixed inset-0 z-[60] bg-card lg:static lg:inset-auto lg:z-auto lg:block'
            : 'hidden lg:block',
        )}
      >
        {selected ? (
          <ChatThread
            key={selected.id}
            conversation={selected}
            viewer={viewer}
            onChanged={onChanged}
            onBack={() => onSelect(null)}
            backClassName="lg:hidden"
            actions={threadActions?.(selected)}
          />
        ) : showDraft && draft ? (
          <ChatThread
            key="draft"
            conversation={null}
            viewer={viewer}
            draft={draft}
            emptyHint={draftHint}
            suggestions={draftSuggestions}
            onStarted={onDraftStarted}
            onChanged={onChanged}
            onBack={onDraftCancel}
            backClassName="lg:hidden"
          />
        ) : (
          <EmptyPane icon={MessageSquare} {...emptyThread} />
        )}
      </div>
    </div>
  )
}

function EmptyPane({
  icon: Icon,
  title,
  description,
}: EmptyCopy & { icon: typeof Inbox }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
      <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground ring-1 ring-primary/10">
        <Icon className="size-5" />
      </span>
      <p className="font-display text-lg tracking-tight">{title}</p>
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  )
}
