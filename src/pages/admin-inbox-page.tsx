import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, LoaderCircle, SquarePen } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import {
  closeConversation,
  type ConversationDetails,
  type ConversationSummary,
} from '@/api/messaging'
import { FormAlert } from '@/components/common/form-alert'
import { Toast } from '@/components/common/toast'
import { Button } from '@/components/ui/button'
import { AdminPageHeader } from '@/features/admin'
import { InboxView, useSharedInbox } from '@/features/messaging'
import { AdminMessageSellerDialog } from '@/features/messaging/support-dialogs'
import { getErrorMessage } from '@/lib/api'
import { loadMarketplaceIntoCatalog } from '@/lib/marketplace'
import { subscribePublicSellers } from '@/lib/public-sellers'
import { cn } from '@/lib/utils'

type StatusFilter = 'open' | 'closed' | 'all'

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'closed', label: 'Resolved' },
  { id: 'all', label: 'All' },
]

function inFilter(conversation: ConversationSummary, filter: StatusFilter): boolean {
  return filter === 'all' || conversation.status === filter
}

export function AdminInboxPage() {
  const inbox = useSharedInbox()
  const [params, setParams] = useSearchParams()
  const selectedId = params.get('c')
  const [filter, setFilter] = useState<StatusFilter>('open')
  const [composeOpen, setComposeOpen] = useState(false)
  const [closingId, setClosingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const { conversations, refresh } = inbox
  const [, setDirectoryVersion] = useState(0)

  // Thread labels name each seller from the public shop directory.
  useEffect(() => {
    const bump = () => setDirectoryVersion((version) => version + 1)
    void loadMarketplaceIntoCatalog().then(bump).catch(() => undefined)
    return subscribePublicSellers(bump)
  }, [])

  const select = useCallback(
    (id: string | null) => setParams(id ? { c: id } : {}),
    [setParams],
  )

  const visible = useMemo(
    () => conversations.filter((conversation) => inFilter(conversation, filter)),
    [conversations, filter],
  )

  const counts = useMemo(() => {
    const totals: Record<StatusFilter, number> = { open: 0, closed: 0, all: 0 }
    for (const conversation of conversations) {
      for (const { id } of FILTERS) {
        if (inFilter(conversation, id)) totals[id] += 1
      }
    }
    return totals
  }, [conversations])

  async function handleResolve(id: string) {
    setClosingId(id)
    setError(null)
    try {
      await closeConversation(id)
      await refresh()
      setToast('Conversation resolved.')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not resolve this conversation.'))
    } finally {
      setClosingId(null)
    }
  }

  function threadActions(conversation: ConversationSummary | ConversationDetails) {
    if (conversation.status !== 'open') return null
    const closing = closingId === conversation.id
    return (
      <Button
        type="button"
        variant="outline"
        className="h-8 rounded-full px-3"
        disabled={closing}
        onClick={() => void handleResolve(conversation.id)}
      >
        {closing ? <LoaderCircle className="animate-spin" /> : <CheckCircle2 className="size-4" />}
        <span className="hidden sm:inline">Resolve</span>
      </Button>
    )
  }

  return (
    <div>
      <AdminPageHeader
        title="Inbox"
        description="Support conversations with sellers. Requests sellers send to support are assigned to an admin automatically — the ones assigned to you appear here."
        action={
          <Button type="button" className="h-10 rounded-full px-4" onClick={() => setComposeOpen(true)}>
            <SquarePen className="size-4" />
            Message a seller
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Filter conversations">
        {FILTERS.map((item) => {
          const active = filter === item.id
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(item.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 transition-colors',
                active
                  ? 'bg-primary text-primary-foreground ring-primary'
                  : 'bg-card text-muted-foreground ring-border/60 hover:text-foreground',
              )}
            >
              {item.label}
              <span className={cn('text-xs', active ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                {counts[item.id]}
              </span>
            </button>
          )
        })}
      </div>

      <FormAlert error={error} className="mb-4" />

      <InboxView
        viewer="admin"
        className="h-[calc(100svh-19rem)]"
        conversations={visible}
        loaded={inbox.loaded}
        error={inbox.error}
        selectedId={selectedId}
        onSelect={select}
        onChanged={() => void refresh()}
        threadActions={threadActions}
        emptyList={
          filter === 'closed'
            ? { title: 'Nothing resolved yet', description: 'Conversations you resolve move here.' }
            : {
                title: 'No open conversations',
                description: 'When a seller contacts support, or you message a seller, the conversation shows up here.',
              }
        }
        emptyThread={{
          title: 'Pick a conversation',
          description: 'Choose a conversation to read it, reply, or resolve it once the seller is sorted.',
        }}
      />

      <AdminMessageSellerDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        onCreated={(conversation) => {
          void refresh()
          setFilter('open')
          select(conversation.id)
          setToast('Message sent to the seller.')
        }}
      />

      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
    </div>
  )
}
