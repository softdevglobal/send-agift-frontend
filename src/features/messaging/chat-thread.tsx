import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ArrowLeft, LoaderCircle, Lock, MessageSquare } from 'lucide-react'

import {
  reopenConversation,
  type ChatMessage,
  type ConversationDetails,
  type ConversationSummary,
  type FirstMessage,
} from '@/api/messaging'
import type { ConversationStatus } from '@/api/types'
import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/lib/api'
import { getTokenSubject } from '@/lib/auth'
import { cn } from '@/lib/utils'

import { ChatAvatar } from './chat-avatar'
import { ChatComposer, type ComposerPrefill } from './chat-composer'
import {
  useConversationLabel,
  type ConversationContext,
  type ConversationLabel,
  type ConversationLabelSource,
} from './conversation-label'
import { MessageBubble, type MessageDelivery } from './message-bubble'
import {
  capitalize,
  dayKey,
  formatDayLabel,
  SUPPORT_PRIORITY_LABEL,
  SUPPORT_STATUS_LABEL,
  type ChatViewerRole,
} from './messaging-utils'
import { uploadChatFiles, useThread } from './use-thread'

export type ChatDraft = {
  /** What the thread will be about — used for its header before it exists. */
  source: ConversationLabelSource
  /**
   * Creates (or reuses) the conversation on the first send, carrying that
   * first message in the start request itself.
   */
  start: (first: FirstMessage) => Promise<ConversationDetails>
}

type ChatThreadProps = {
  conversation: ConversationSummary | ConversationDetails | null
  viewer: ChatViewerRole
  /** Shown when there's no conversation yet; the first send creates it. */
  draft?: ChatDraft | null
  onStarted?: (conversation: ConversationDetails) => void
  /** Something the inbox should reflect changed — a send, a read, a reopen. */
  onChanged?: () => void
  onBack?: () => void
  backClassName?: string
  actions?: ReactNode
  emptyHint?: string
  /** Starter questions offered while the thread is still empty. */
  suggestions?: string[]
  /** `brand` puts the header on the dark brand gradient (the storefront panel). */
  tone?: 'default' | 'brand'
  className?: string
}

/** Messages this close together from one sender read as one run of bubbles. */
const GROUP_GAP_MS = 5 * 60_000

function sameRun(a: ChatMessage, b: ChatMessage): boolean {
  return (
    a.sender_user_id === b.sender_user_id &&
    dayKey(a.created_at) === dayKey(b.created_at) &&
    Math.abs(Date.parse(b.created_at) - Date.parse(a.created_at)) < GROUP_GAP_MS
  )
}

export function ChatThread({
  conversation,
  viewer,
  draft,
  onStarted,
  onChanged,
  onBack,
  backClassName,
  actions,
  emptyHint = 'No messages yet. Say hello.',
  suggestions,
  tone = 'default',
  className,
}: ChatThreadProps) {
  const userId = useMemo(() => getTokenSubject(), [])
  const conversationId = conversation?.id ?? null
  const thread = useThread(conversationId)
  const label = useConversationLabel(conversation ?? draft?.source ?? null, viewer)
  const [statusOverride, setStatusOverride] = useState<ConversationStatus | null>(null)
  const [reopening, setReopening] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [prefill, setPrefill] = useState<ComposerPrefill | null>(null)
  const onDark = tone === 'brand'

  const status = statusOverride ?? conversation?.status ?? 'open'
  const participants = conversation?.participants ?? []
  const supportCase = conversation?.support_case ?? null
  const unread = conversation && 'unread_count' in conversation ? conversation.unread_count : 0

  useEffect(() => {
    setStatusOverride(null)
  }, [conversation?.status])

  // Opening the thread marked it read server-side; tell the inbox once so its badge clears.
  const readReported = useRef(false)
  useEffect(() => {
    if (unread === 0) {
      readReported.current = false
      return
    }
    if (thread.loaded && !readReported.current) {
      readReported.current = true
      onChanged?.()
    }
  }, [thread.loaded, unread, onChanged])

  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)
  const restoreFromBottom = useRef<number | null>(null)
  const firstMessageId = thread.messages[0]?.id
  const lastMessageId = thread.messages.at(-1)?.id

  // Follow new messages when the viewer is already at the bottom; leave them be
  // when they've scrolled up to read something older.
  useLayoutEffect(() => {
    const scroller = scrollRef.current
    if (scroller && stickToBottom.current) scroller.scrollTop = scroller.scrollHeight
  }, [lastMessageId, thread.loaded])

  // Loading older messages prepends them — keep the viewer's place.
  useLayoutEffect(() => {
    const scroller = scrollRef.current
    if (!scroller || restoreFromBottom.current === null) return
    scroller.scrollTop = scroller.scrollHeight - restoreFromBottom.current
    restoreFromBottom.current = null
  }, [firstMessageId])

  // Photos finish loading after the scroll; keep the bottom pinned as they grow.
  useEffect(() => {
    const scroller = scrollRef.current
    const content = contentRef.current
    if (!scroller || !content || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      if (stickToBottom.current) scroller.scrollTop = scroller.scrollHeight
    })
    observer.observe(content)
    return () => observer.disconnect()
  }, [])

  function handleScroll() {
    const scroller = scrollRef.current
    if (!scroller) return
    stickToBottom.current =
      scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 80
  }

  function handleLoadOlder() {
    const scroller = scrollRef.current
    if (scroller) restoreFromBottom.current = scroller.scrollHeight - scroller.scrollTop
    void thread.loadOlder()
  }

  async function handleSend(body: string, files: File[]) {
    stickToBottom.current = true
    if (!conversationId && draft) {
      // A new thread goes out with its first message in the start request.
      const attachments = await uploadChatFiles(files)
      const conversation = await draft.start({ body, attachments })
      onStarted?.(conversation)
      onChanged?.()
      return
    }
    await thread.send(body, files)
    onChanged?.()
  }

  async function handleReopen() {
    if (!conversationId) return
    setReopening(true)
    setActionError(null)
    try {
      const updated = await reopenConversation(conversationId)
      setStatusOverride(updated.status)
      onChanged?.()
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not reopen this conversation.'))
    } finally {
      setReopening(false)
    }
  }

  function senderLabel(senderId: string): string | null {
    // Two-person threads don't need names on every run.
    if (participants.length <= 2) return null
    const sender = participants.find((participant) => participant.user_id === senderId)
    if (!sender) return null
    if (sender.display_name) return sender.display_name
    return sender.role === 'admin' ? 'SendAGift Support' : capitalize(sender.role)
  }

  const messages = thread.messages

  // "Seen" once anyone else's read marker has passed your latest message.
  const othersReadAt = participants
    .filter((participant) => participant.user_id !== userId && participant.last_read_at)
    .reduce((latest, participant) => Math.max(latest, Date.parse(participant.last_read_at!)), 0)
  let lastOwnIndex = -1
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].sender_user_id === userId) {
      lastOwnIndex = index
      break
    }
  }
  const lastOwnDelivery: MessageDelivery | null =
    lastOwnIndex === -1
      ? null
      : othersReadAt >= Date.parse(messages[lastOwnIndex].created_at)
        ? 'seen'
        : 'sent'

  const isOpen = status === 'open'

  return (
    <section className={cn('flex h-full min-h-0 flex-col bg-card', className)}>
      <header
        className={cn(
          'relative overflow-hidden px-3 py-3 sm:px-4',
          onDark
            ? 'bg-gradient-to-br from-brand-navy via-brand-ink to-brand-navy text-white'
            : 'border-b border-border/60 bg-card',
        )}
      >
        {onDark ? (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute -top-16 -right-12 size-44 rounded-full bg-brand-violet/45 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-20 left-10 size-36 rounded-full bg-brand-teal/20 blur-3xl"
            />
          </>
        ) : null}
        <div className="relative flex items-center gap-3">
          {onBack ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                '-ml-1 shrink-0 rounded-full',
                onDark && 'text-white/80 hover:bg-white/10 hover:text-white',
                backClassName,
              )}
              aria-label="Back to conversations"
              onClick={onBack}
            >
              <ArrowLeft className="size-4.5" />
            </Button>
          ) : null}
          <ChatAvatar
            kind={label.kind}
            imageUrl={label.imageUrl}
            name={label.avatarName}
            className={onDark ? 'ring-2 ring-white/25' : undefined}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{label.title}</p>
            {label.subtitle ? (
              <p className={cn('truncate text-xs', onDark ? 'text-white/60' : 'text-muted-foreground')}>
                {label.subtitle}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {viewer === 'admin' && supportCase ? (
              <>
                <span
                  className={cn(
                    'hidden rounded-full px-2 py-0.5 text-[11px] font-medium sm:inline',
                    supportCase.priority === 'urgent' || supportCase.priority === 'high'
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {SUPPORT_PRIORITY_LABEL[supportCase.priority]}
                </span>
                <span className="hidden rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground sm:inline">
                  {status === 'closed' ? 'Closed' : SUPPORT_STATUS_LABEL[supportCase.status]}
                </span>
              </>
            ) : status === 'closed' ? (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] font-medium',
                  onDark ? 'bg-white/12 text-white/80' : 'bg-muted text-muted-foreground',
                )}
              >
                Closed
              </span>
            ) : null}
            {actions}
          </div>
        </div>
      </header>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto bg-surface [background-image:radial-gradient(color-mix(in_oklch,var(--primary),transparent_86%)_1px,transparent_1px)] [background-size:20px_20px] px-3 py-4 sm:px-5"
      >
        <div ref={contentRef} className="flex min-h-full flex-col">
          {!thread.loaded ? (
            <div className="flex flex-1 items-center justify-center py-16">
              <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <ThreadWelcome
              label={label}
              hint={emptyHint}
              error={thread.error}
              suggestions={isOpen ? suggestions : undefined}
              onSuggest={(text) => setPrefill({ text, key: Date.now() })}
            />
          ) : (
            <div className="mt-auto">
              {thread.hasOlder ? (
                <div className="mb-3 flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full bg-card text-muted-foreground"
                    disabled={thread.loadingOlder}
                    onClick={handleLoadOlder}
                  >
                    {thread.loadingOlder ? <LoaderCircle className="animate-spin" /> : null}
                    Load earlier messages
                  </Button>
                </div>
              ) : null}
              {messages.map((message, index) => {
                const previous = messages[index - 1]
                const next = messages[index + 1]
                const newDay = !previous || dayKey(previous.created_at) !== dayKey(message.created_at)
                const startsRun = !previous || !sameRun(previous, message)
                const endsRun = !next || !sameRun(message, next)
                const own = message.sender_user_id === userId
                return (
                  <Fragment key={message.id}>
                    {newDay ? (
                      <div className="my-4 flex justify-center first:mt-0" role="separator">
                        <span className="rounded-full bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm ring-1 ring-border/60">
                          {formatDayLabel(message.created_at)}
                        </span>
                      </div>
                    ) : null}
                    <div className={startsRun && !newDay ? 'mt-4' : 'mt-1'}>
                      <MessageBubble
                        message={message}
                        own={own}
                        senderLabel={!own && startsRun ? senderLabel(message.sender_user_id) : null}
                        avatar={
                          !own && endsRun ? (
                            <ChatAvatar
                              kind={label.kind}
                              imageUrl={label.imageUrl}
                              name={label.avatarName}
                              size="xs"
                            />
                          ) : null
                        }
                        endsGroup={endsRun}
                        delivery={index === lastOwnIndex ? lastOwnDelivery : null}
                      />
                    </div>
                  </Fragment>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {thread.error && messages.length ? (
        <p className="border-t border-border/60 bg-muted/40 px-4 py-1.5 text-center text-xs text-muted-foreground">
          Trouble reaching messages — retrying…
        </p>
      ) : null}

      {isOpen ? (
        <ChatComposer onSend={handleSend} autoFocus={Boolean(draft)} prefill={prefill} />
      ) : (
        <div className="border-t border-border/60 bg-card px-4 py-3">
          {actionError ? <p className="mb-2 text-xs text-destructive">{actionError}</p> : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="size-4" />
              This conversation is closed.
            </p>
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-full px-4"
              disabled={reopening}
              onClick={handleReopen}
            >
              {reopening ? <LoaderCircle className="animate-spin" /> : null}
              Reopen
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}

/** The empty thread: what it's about, a nudge, and a few questions to start with. */
function ThreadWelcome({
  label,
  hint,
  error,
  suggestions,
  onSuggest,
}: {
  label: ConversationLabel
  hint: string
  error: string | null
  suggestions?: string[]
  onSuggest: (text: string) => void
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-2 py-8 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
      {label.context ? (
        <ContextCard context={label.context} />
      ) : (
        <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-violet to-brand-navy text-white shadow-[0_12px_28px_rgba(76,29,149,0.3)]">
          <MessageSquare className="size-6" />
        </span>
      )}
      <p className="mt-6 font-display text-xl tracking-tight">Start the conversation</p>
      {error ? (
        <p className="mt-2 max-w-xs text-sm text-destructive">{error}</p>
      ) : (
        <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted-foreground">{hint}</p>
      )}
      {suggestions?.length ? (
        <div className="mt-6 w-full max-w-sm">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            Try asking
          </p>
          <div className="mt-2.5 flex flex-wrap justify-center gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onSuggest(suggestion)}
                className="rounded-full bg-card px-3.5 py-1.5 text-xs font-medium text-foreground shadow-sm ring-1 ring-border/70 transition-all hover:-translate-y-px hover:text-primary hover:ring-primary/40"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ContextCard({ context }: { context: ConversationContext }) {
  return (
    <div className="w-full max-w-[17rem] overflow-hidden rounded-2xl bg-card text-left shadow-[0_18px_44px_rgba(20,20,55,0.12)] ring-1 ring-border/60">
      {context.imageUrl ? (
        <div className="relative">
          <img src={context.imageUrl} alt="" className="aspect-[16/10] w-full object-cover" />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent"
          />
          <span className="absolute top-2.5 left-2.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white backdrop-blur">
            {context.caption}
          </span>
        </div>
      ) : null}
      <div className="px-3.5 py-3">
        {context.imageUrl ? null : (
          <p className="text-[10px] font-semibold tracking-[0.14em] text-primary uppercase">
            {context.caption}
          </p>
        )}
        <p className="truncate text-sm font-semibold">{context.name}</p>
        {context.meta ? (
          <p className="truncate text-xs text-muted-foreground">{context.meta}</p>
        ) : null}
      </div>
    </div>
  )
}
