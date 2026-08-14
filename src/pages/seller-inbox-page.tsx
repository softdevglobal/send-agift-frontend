import { MessageSquare } from 'lucide-react'

import { SellerEmptyState, SellerPageHeader } from '@/features/seller'

export function SellerInboxPage() {
  return (
    <div>
      <SellerPageHeader
        title="Inbox"
        description="Buyer messages, order questions, and support threads in one place."
      />
      <SellerEmptyState
        icon={MessageSquare}
        title="No messages"
        description="When buyers message you about a gift or order, conversations will land here so you can reply from your seller account."
      />
    </div>
  )
}
