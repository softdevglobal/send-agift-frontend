import { useCallback, useEffect, useMemo, useState } from 'react'
import { LifeBuoy, MessageSquare } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import { startConversationWithMessage, type ConversationSummary } from '@/api/messaging'
import { Toast } from '@/components/common/toast'
import { Button } from '@/components/ui/button'
import { InboxView, useSharedInbox, type ChatDraft } from '@/features/messaging'
import { SellerSupportDialog } from '@/features/messaging/support-dialogs'
import { SellerPageHeader } from '@/features/seller'
import { cn } from '@/lib/utils'

type InboxFilter = 'all' | 'buyers' | 'support'

const FILTERS: { id: InboxFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'buyers', label: 'Buyers' },
  { id: 'support', label: 'SendAGift support' },
]

function inFilter(conversation: ConversationSummary, filter: InboxFilter): boolean {
  if (filter === 'support') return conversation.type === 'support'
  if (filter === 'buyers') return conversation.type !== 'support'
  return true
}

export function SellerInboxPage() {
  const inbox = useSharedInbox()
  const [params, setParams] = useSearchParams()
  const selectedId = params.get('c')
  const orderItemId = params.get('orderItem')
  const [filter, setFilter] = useState<InboxFilter>('all')
  const [supportOpen, setSupportOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const { conversations, refresh } = inbox

  const select = useCallback(
    (id: string | null) => setParams(id ? { c: id } : {}),
    [setParams],
  )

  const visible = useMemo(
    () => conversations.filter((conversation) => inFilter(conversation, filter)),
    [conversations, filter],
  )

  const unreadByFilter = useMemo(() => {
    const totals: Record<InboxFilter, number> = { all: 0, buyers: 0, support: 0 }
    for (const conversation of conversations) {
      for (const { id } of FILTERS) {
        if (inFilter(conversation, id)) totals[id] += conversation.unread_count
      }
    }
    return totals
  }, [conversations])

  // "Message the customer" on an order item lands here with ?orderItem= —
  // open that item's thread, or draft one if nobody has written yet.
  const existingOrderThreadId = orderItemId
    ? conversations.find(
        (conversation) =>
          conversation.type === 'order' && conversation.order_item_id === orderItemId,
      )?.id
    : undefined

  useEffect(() => {
    if (existingOrderThreadId) setParams({ c: existingOrderThreadId }, { replace: true })
  }, [existingOrderThreadId, setParams])

  const draft = useMemo<ChatDraft | null>(
    () =>
      orderItemId && inbox.loaded && !existingOrderThreadId && !selectedId
        ? {
            source: { type: 'order', order_item_id: orderItemId },
            start: (first) =>
              startConversationWithMessage({ type: 'order', order_item_id: orderItemId }, first),
          }
        : null,
    [orderItemId, inbox.loaded, existingOrderThreadId, selectedId],
  )

  const openSupportThread = conversations.find(
    (conversation) => conversation.type === 'support' && conversation.status === 'open',
  )

  function handleContactSupport() {
    if (openSupportThread) {
      if (!inFilter(openSupportThread, filter)) setFilter('all')
      select(openSupportThread.id)
      return
    }
    setSupportOpen(true)
  }

  return (
    <div className="space-y-6">
      <SellerPageHeader
        icon={MessageSquare}
        tone="navy"
        title="Inbox"
        description="Questions from buyers about your gifts and orders, and your conversations with SendAGift support."
        action={
          <Button
            type="button"
            variant="secondary"
            className="h-10 rounded-full px-4"
            onClick={handleContactSupport}
          >
            <LifeBuoy className="size-4" />
            Contact support
          </Button>
        }
      >
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter conversations">
          {FILTERS.map((item) => {
            const active = filter === item.id
            const unread = unreadByFilter[item.id]
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(item.id)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                  active ? 'bg-white text-brand-ink' : 'text-white/70 hover:bg-white/10 hover:text-white',
                )}
              >
                {item.label}
                {unread > 0 ? (
                  <span
                    className={cn(
                      'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold',
                      active ? 'bg-primary text-primary-foreground' : 'bg-white/15 text-white',
                    )}
                  >
                    {unread > 99 ? '99+' : unread}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </SellerPageHeader>

      <InboxView
        viewer="seller"
        conversations={visible}
        loaded={inbox.loaded}
        error={inbox.error}
        selectedId={selectedId}
        onSelect={select}
        draft={draft}
        draftHint="Send the first message about this order — the customer sees it in their messages."
        draftSuggestions={[
          'Your gift is being prepared and will ship soon.',
          'Could you confirm the delivery address?',
          'Would you like a gift note included?',
        ]}
        onDraftStarted={(conversation) => {
          void refresh()
          setParams({ c: conversation.id }, { replace: true })
        }}
        onDraftCancel={() => setParams({})}
        onChanged={() => void refresh()}
        emptyList={
          filter === 'support'
            ? {
                title: 'No support conversations',
                description: 'Use “Contact support” to ask SendAGift about payouts, orders, or your shop.',
              }
            : {
                title: 'No messages yet',
                description:
                  'When buyers ask about a gift or an order, their conversations land here so you can reply.',
              }
        }
        emptyThread={{
          title: 'Pick a conversation',
          description: 'Choose a conversation on the left to read it and reply. You can attach photos and PDFs.',
        }}
      />

      <SellerSupportDialog
        open={supportOpen}
        onOpenChange={setSupportOpen}
        onCreated={(conversation) => {
          void refresh()
          setFilter('all')
          select(conversation.id)
          setToast('Your message was sent to SendAGift support.')
        }}
      />

      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
    </div>
  )
}
