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
  ArrowRight,
  Gift,
  LoaderCircle,
  MessagesSquare,
  Package,
  Paperclip,
  Search,
  Store,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import {
  startConversationWithMessage,
  type ConversationDetails,
  type ConversationSummary,
  type ConversationType,
} from '@/api/messaging'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useAuth } from '@/features/auth/auth-context'
import { getCatalogProduct } from '@/features/customer-commerce'
import { returnToState } from '@/lib/auth'
import { loadMarketplaceIntoCatalog } from '@/lib/marketplace'
import { subscribePublishedCatalog } from '@/lib/published-catalog'
import { subscribePublicSellers } from '@/lib/public-sellers'
import { cn } from '@/lib/utils'

import { ChatAvatar } from './chat-avatar'
import { ChatThread, type ChatDraft } from './chat-thread'
import { customerConversationText, useConversationLabel } from './conversation-label'
import { CustomerConversationList } from './customer-conversation-list'
import { useInbox, useResolvedConversation } from './use-inbox'

type CustomerMessagesContextValue = {
  unreadCount: number
  /** The customer's threads — for "continue a conversation" shortcuts. */
  conversations: ConversationSummary[]
  /** Opens the messages panel — on one thread when an id is given. */
  openMessages: (conversationId?: string) => void
  /** Opens the thread about a gift, or a fresh one to ask the shop about it. */
  askAboutProduct: (productId: string) => void
  /** Opens the thread about one item of an order, or starts one. */
  messageAboutOrderItem: (orderItemId: string, productId?: string) => void
}

type PanelView =
  | { kind: 'list' }
  | { kind: 'loading' }
  | { kind: 'thread'; id: string }
  | { kind: 'draft'; draft: ChatDraft; hint: string }

type PanelFilter = 'all' | ConversationType

const PANEL_FILTERS: { id: PanelFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'product_inquiry', label: 'Gift questions' },
  { id: 'order', label: 'Orders' },
  { id: 'support', label: 'Support' },
]

/** Starter questions, so an empty thread isn't a blank box. */
const SUGGESTIONS: Record<ConversationType, string[]> = {
  product_inquiry: [
    'Can this be delivered this week?',
    'Can you add a personal message?',
    'Is it available in other colours or sizes?',
  ],
  order: [
    'When will my gift be dispatched?',
    'Can I change the delivery date?',
    'My gift arrived damaged',
  ],
  support: [],
}

const CustomerMessagesContext = createContext<CustomerMessagesContextValue | null>(null)

/**
 * Customer ↔ shop chat for the storefront.
 *
 * Messages live in a side panel rather than a page so a customer can ask a
 * question without leaving the gift or order they're looking at. The panel is
 * opened from the account menu, a product page, or an order.
 */
export function CustomerMessagesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, role } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isCustomer = isAuthenticated && role === 'customer'
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<PanelView>({ kind: 'list' })
  const [filter, setFilter] = useState<PanelFilter>('all')
  // Polls often while the panel is open; otherwise often enough that a shop's
  // reply lights up the header badge within seconds.
  const inbox = useInbox({ enabled: isCustomer, intervalMs: open ? 10_000 : 20_000 })
  const [, setCatalogVersion] = useState(0)
  /** The thread a "New message" pop-up is announcing, if any. */
  const [noticeId, setNoticeId] = useState<string | null>(null)

  useEffect(() => {
    if (!isCustomer) {
      setOpen(false)
      setNoticeId(null)
    }
  }, [isCustomer])

  useEffect(() => {
    if (open) setNoticeId(null)
  }, [open])

  // Thread names come from the storefront catalog (shop and gift names), which
  // may not be loaded on whatever page the panel or a pop-up appears on.
  const wantsLabels = open || noticeId !== null
  useEffect(() => {
    if (!wantsLabels) return
    let cancelled = false
    const bump = () => {
      if (!cancelled) setCatalogVersion((version) => version + 1)
    }
    void loadMarketplaceIntoCatalog().then(bump).catch(() => undefined)
    const unsubscribeCatalog = subscribePublishedCatalog(bump)
    const unsubscribeSellers = subscribePublicSellers(bump)
    return () => {
      cancelled = true
      unsubscribeCatalog()
      unsubscribeSellers()
    }
  }, [wantsLabels])

  const requireCustomer = useCallback(() => {
    if (isCustomer) return true
    navigate('/login', { state: returnToState(location.pathname, location.search) })
    return false
  }, [isCustomer, navigate, location.pathname, location.search])

  const openMessages = useCallback(
    (conversationId?: string) => {
      if (!requireCustomer()) return
      setView(conversationId ? { kind: 'thread', id: conversationId } : { kind: 'list' })
      setOpen(true)
    },
    [requireCustomer],
  )

  const { refresh, conversations } = inbox

  // Compare each poll with the last one: a thread whose unread count went up
  // just got a reply. The first load only records a baseline, so opening the
  // site never pops up old messages.
  const lastUnread = useRef<Map<string, number> | null>(null)
  useEffect(() => {
    if (!inbox.loaded) {
      lastUnread.current = null
      return
    }
    const previous = lastUnread.current
    lastUnread.current = new Map(conversations.map((item) => [item.id, item.unread_count]))
    // With the panel open the reply is already on screen.
    if (!previous || open) return
    const replied = conversations.find(
      (item) => item.unread_count > (previous.get(item.id) ?? 0),
    )
    if (replied) setNoticeId(replied.id)
  }, [conversations, inbox.loaded, open])

  // "(2) Send A Gift" — unread replies show on the tab even when it's in the background.
  const unreadTotal = inbox.unreadTotal
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\+?\)\s*/, '')
    document.title =
      isCustomer && unreadTotal > 0 ? `(${unreadTotal > 99 ? '99+' : unreadTotal}) ${base}` : base
  }, [isCustomer, unreadTotal])

  /** Reuse the thread the customer already has about this; otherwise draft a new one. */
  const openExistingOrDraft = useCallback(
    async (matches: (item: ConversationSummary) => boolean, draft: ChatDraft, hint: string) => {
      if (!requireCustomer()) return
      setView({ kind: 'loading' })
      setOpen(true)
      const list = (await refresh()) ?? conversations
      const existing = list.find(matches)
      setView(existing ? { kind: 'thread', id: existing.id } : { kind: 'draft', draft, hint })
    },
    [requireCustomer, refresh, conversations],
  )

  const askAboutProduct = useCallback(
    (productId: string) => {
      const product = getCatalogProduct(productId)
      void openExistingOrDraft(
        (item) =>
          item.type === 'product_inquiry' && item.product_id === productId && item.status === 'open',
        {
          source: { type: 'product_inquiry', product_id: productId, shop_id: product?.shopId },
          start: (first) =>
            startConversationWithMessage({ type: 'product_inquiry', product_id: productId }, first),
        },
        'Ask about sizes, delivery dates, or personalising this gift. The shop replies right here.',
      )
    },
    [openExistingOrDraft],
  )

  const messageAboutOrderItem = useCallback(
    (orderItemId: string, productId?: string) => {
      void openExistingOrDraft(
        (item) => item.type === 'order' && item.order_item_id === orderItemId,
        {
          source: { type: 'order', order_item_id: orderItemId, product_id: productId },
          start: (first) =>
            startConversationWithMessage({ type: 'order', order_item_id: orderItemId }, first),
        },
        'Message the shop about delivery, changes, or a problem with the gift — you can attach photos.',
      )
    },
    [openExistingOrDraft],
  )

  const value = useMemo<CustomerMessagesContextValue>(
    () => ({
      unreadCount: inbox.unreadTotal,
      conversations,
      openMessages,
      askAboutProduct,
      messageAboutOrderItem,
    }),
    [inbox.unreadTotal, conversations, openMessages, askAboutProduct, messageAboutOrderItem],
  )

  const refreshInbox = useCallback(() => {
    void refresh()
  }, [refresh])

  const backToList = () => setView({ kind: 'list' })

  const dismissNotice = useCallback(() => setNoticeId(null), [])
  const noticeConversation = noticeId
    ? (conversations.find((item) => item.id === noticeId) ?? null)
    : null

  return (
    <CustomerMessagesContext.Provider value={value}>
      {children}
      {isCustomer ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            showCloseButton={false}
            aria-describedby={undefined}
            className="gap-0 overflow-hidden p-0 sm:max-w-lg"
          >
            <SheetTitle className="sr-only">Messages</SheetTitle>
            {view.kind === 'loading' ? (
              <div className="flex flex-1 items-center justify-center">
                <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : view.kind === 'thread' ? (
              <PanelThread
                id={view.id}
                conversations={conversations}
                onBack={backToList}
                onChanged={refreshInbox}
              />
            ) : view.kind === 'draft' ? (
              <ChatThread
                key="draft"
                tone="brand"
                conversation={null}
                viewer="customer"
                draft={view.draft}
                emptyHint={view.hint}
                suggestions={SUGGESTIONS[view.draft.source.type]}
                onStarted={(conversation: ConversationDetails) =>
                  setView({ kind: 'thread', id: conversation.id })
                }
                onChanged={refreshInbox}
                onBack={backToList}
                actions={<PanelClose onDark />}
              />
            ) : (
              <PanelList
                conversations={conversations}
                loaded={inbox.loaded}
                error={inbox.error}
                unreadTotal={inbox.unreadTotal}
                filter={filter}
                onFilterChange={setFilter}
                onSelect={(id) => setView({ kind: 'thread', id })}
              />
            )}
          </SheetContent>
        </Sheet>
      ) : null}
      {isCustomer && !open && noticeConversation ? (
        <NewMessageNotice
          key={noticeConversation.id}
          conversation={noticeConversation}
          onOpen={() => {
            setNoticeId(null)
            openMessages(noticeConversation.id)
          }}
          onDismiss={dismissNotice}
        />
      ) : null}
    </CustomerMessagesContext.Provider>
  )
}

export function useCustomerMessages(): CustomerMessagesContextValue {
  const context = useContext(CustomerMessagesContext)
  if (!context) {
    throw new Error('useCustomerMessages must be used within CustomerMessagesProvider')
  }
  return context
}

function PanelClose({ onDark = false }: { onDark?: boolean }) {
  return (
    <SheetClose asChild>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn('rounded-full', onDark && 'text-white/80 hover:bg-white/10 hover:text-white')}
        aria-label="Close messages"
      >
        <X className="size-4.5" />
      </Button>
    </SheetClose>
  )
}

function PanelList({
  conversations,
  loaded,
  error,
  unreadTotal,
  filter,
  onFilterChange,
  onSelect,
}: {
  conversations: ConversationSummary[]
  loaded: boolean
  error: string | null
  unreadTotal: number
  filter: PanelFilter
  onFilterChange: (filter: PanelFilter) => void
  onSelect: (id: string) => void
}) {
  const counts = useMemo(() => {
    const totals: Record<PanelFilter, number> = { all: 0, product_inquiry: 0, order: 0, support: 0 }
    for (const conversation of conversations) {
      totals.all += 1
      totals[conversation.type] += 1
    }
    return totals
  }, [conversations])

  const [query, setQuery] = useState('')

  // Support only appears as a tab if the customer actually has a support thread.
  const tabs = PANEL_FILTERS.filter((tab) => tab.id !== 'support' || counts.support > 0)
  const needle = query.trim().toLowerCase()
  const visible = conversations.filter(
    (item) =>
      (filter === 'all' || item.type === filter) &&
      (!needle || customerConversationText(item).includes(needle)),
  )

  return (
    <>
      <header className="relative overflow-hidden bg-gradient-to-br from-brand-navy via-brand-ink to-brand-navy px-5 pt-5 pb-4 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-12 size-56 rounded-full bg-brand-violet/45 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-8 size-44 rounded-full bg-brand-teal/25 blur-3xl"
        />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-white/12 shadow-sm ring-1 ring-white/15 backdrop-blur-sm">
              <MessagesSquare className="size-5" />
            </span>
            <div>
              <p className="font-display text-2xl tracking-tight">Messages</p>
              <p className="text-xs text-white/60">
                {unreadTotal > 0
                  ? `${unreadTotal} unread ${unreadTotal === 1 ? 'message' : 'messages'}`
                  : conversations.length > 0
                    ? 'You’re all caught up'
                    : 'Chat with shops about gifts and orders'}
              </p>
            </div>
          </div>
          <PanelClose onDark />
        </div>

        {conversations.length > 0 ? (
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-white/50" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search shops or gifts"
              aria-label="Search conversations"
              className="h-10 w-full rounded-full bg-white/10 pr-4 pl-10 text-sm text-white ring-1 ring-white/15 outline-none placeholder:text-white/50 focus-visible:bg-white/15 focus-visible:ring-white/35"
            />
          </div>
        ) : null}

        {conversations.length > 0 ? (
          <div className="relative mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Filter conversations">
            {tabs.map((tab) => {
              const active = filter === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onFilterChange(tab.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    active ? 'bg-white text-brand-ink' : 'text-white/70 hover:bg-white/10 hover:text-white',
                  )}
                >
                  {tab.label}
                  <span className={active ? 'text-brand-ink/50' : 'text-white/45'}>
                    {counts[tab.id]}
                  </span>
                </button>
              )
            })}
          </div>
        ) : null}
      </header>

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
          <MessagesWelcome />
        ) : visible.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-muted-foreground">
            {needle ? `No chats match “${query.trim()}”.` : 'Nothing here yet.'}
          </p>
        ) : (
          <CustomerConversationList
            conversations={visible}
            onSelect={(conversation) => onSelect(conversation.id)}
          />
        )}
      </div>
    </>
  )
}

const WELCOME_STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Gift,
    title: 'Ask about any gift',
    body: 'Tap “Ask the shop a question” on a gift’s page.',
  },
  {
    icon: Package,
    title: 'Or about an order',
    body: 'Use “Message the shop” beside any item you’ve ordered.',
  },
  {
    icon: Paperclip,
    title: 'Show, don’t just tell',
    body: 'Attach photos or PDFs — up to five per message.',
  },
]

/** First-visit state: a little scene, then how chatting with shops works. */
function MessagesWelcome() {
  return (
    <div className="flex flex-col items-center px-6 pt-10 pb-10 text-center">
      <ChatScene />
      <p className="mt-7 font-display text-2xl tracking-tight motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700">
        Start a conversation
      </p>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
        Got a question about a gift or an order? Shops reply right here.
      </p>

      <ol className="mt-7 w-full max-w-sm space-y-2 text-left">
        {WELCOME_STEPS.map((step, index) => (
          <li
            key={step.title}
            className="flex items-start gap-3 rounded-2xl bg-surface p-3 ring-1 ring-border/60 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-both motion-safe:duration-500"
            style={{ animationDelay: `${200 + index * 90}ms` }}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <step.icon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{step.title}</span>
              <span className="block text-xs leading-relaxed text-muted-foreground">{step.body}</span>
            </span>
          </li>
        ))}
      </ol>

      <SheetClose asChild>
        <Button asChild className="mt-7 h-11 rounded-full px-6">
          <Link to="/products">
            Browse gifts
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </SheetClose>
    </div>
  )
}

/** Two chat bubbles and a gift tag, drawn in CSS — no image to load. */
function ChatScene() {
  return (
    <div aria-hidden className="relative h-36 w-52">
      <div className="absolute inset-4 rounded-full bg-brand-violet/15 blur-2xl" />

      <div className="absolute top-3 left-0 w-36 rounded-2xl rounded-bl-md bg-card px-3 py-2.5 shadow-[0_12px_30px_rgba(20,20,55,0.12)] ring-1 ring-border/60 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-3 motion-safe:duration-700">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Store className="size-3" />
          </span>
          <span className="h-2 w-14 rounded-full bg-muted-foreground/20" />
        </div>
        <span className="mt-2 block h-2 w-24 rounded-full bg-muted-foreground/15" />
        <span className="mt-1.5 block h-2 w-16 rounded-full bg-muted-foreground/15" />
      </div>

      <div className="absolute right-0 bottom-3 w-32 rounded-2xl rounded-br-md bg-gradient-to-br from-brand-violet to-brand-navy px-3 py-2.5 shadow-[0_14px_30px_rgba(76,29,149,0.35)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-3 motion-safe:fill-mode-both motion-safe:duration-700 motion-safe:delay-150">
        <span className="block h-2 w-20 rounded-full bg-white/55" />
        <span className="mt-1.5 block h-2 w-12 rounded-full bg-white/35" />
      </div>

      <span className="absolute -top-1 right-7 flex size-10 rotate-12 items-center justify-center rounded-xl bg-brand-teal text-white shadow-[0_10px_22px_rgba(20,184,184,0.4)] motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:fill-mode-both motion-safe:duration-500 motion-safe:delay-300">
        <Gift className="size-5" />
      </span>
    </div>
  )
}

function PanelThread({
  id,
  conversations,
  onBack,
  onChanged,
}: {
  id: string
  conversations: ConversationSummary[]
  onBack: () => void
  onChanged: () => void
}) {
  const conversation = useResolvedConversation(id, conversations)

  if (!conversation) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <ChatThread
      key={conversation.id}
      tone="brand"
      conversation={conversation}
      viewer="customer"
      suggestions={SUGGESTIONS[conversation.type]}
      onBack={onBack}
      onChanged={onChanged}
      actions={<PanelClose onDark />}
    />
  )
}

/** Corner pop-up announcing a shop's reply, with a shortcut straight into it. */
function NewMessageNotice({
  conversation,
  onOpen,
  onDismiss,
}: {
  conversation: ConversationSummary
  onOpen: () => void
  onDismiss: () => void
}) {
  const label = useConversationLabel(conversation, 'customer')
  const count = conversation.unread_count

  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 8_000)
    return () => window.clearTimeout(timer)
  }, [onDismiss])

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 bottom-4 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl bg-card shadow-[0_18px_48px_rgba(20,20,55,0.22)] ring-1 ring-border/60 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-300"
    >
      <div aria-hidden className="h-1 bg-gradient-to-r from-brand-violet via-brand-teal to-brand-navy" />
      <div className="flex items-start gap-3 p-4">
        <span className="relative shrink-0">
          <ChatAvatar kind={label.kind} imageUrl={label.imageUrl} />
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 size-3 animate-pulse rounded-full bg-brand-teal ring-2 ring-card"
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-primary uppercase">
            {count > 1 ? `${count} new messages` : 'New message'}
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold">{label.title}</p>
          <p className="truncate text-xs text-muted-foreground">{label.subtitle}</p>
          <div className="mt-3 flex gap-2">
            <Button type="button" className="h-8 rounded-full px-3.5 text-xs" onClick={onOpen}>
              View message
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-8 rounded-full px-3 text-xs"
              onClick={onDismiss}
            >
              Later
            </Button>
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="-mt-1 -mr-1 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
