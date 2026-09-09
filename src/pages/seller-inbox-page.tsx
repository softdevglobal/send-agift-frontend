import { HelpCircle, MessageSquare, PackageCheck, Star } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { SellerEmptyState, SellerPageHeader, sellerPanelClass } from '@/features/seller'
import { cn } from '@/lib/utils'

const lands: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: HelpCircle,
    title: 'Pre-order questions',
    body: 'Buyers asking about a gift before they send it.',
  },
  {
    icon: PackageCheck,
    title: 'Order updates',
    body: 'Messages tied to a specific order you’re fulfilling.',
  },
  {
    icon: Star,
    title: 'Feedback',
    body: 'Thank-yous and notes once a gift has been received.',
  },
]

export function SellerInboxPage() {
  return (
    <div className="space-y-6">
      <SellerPageHeader
        icon={MessageSquare}
        tone="navy"
        title="Inbox"
        description="Buyer messages, order questions, and support threads in one place."
      />

      <section className="grid gap-3 sm:grid-cols-3">
        {lands.map((item) => (
          <div key={item.title} className={cn(sellerPanelClass, 'p-4')}>
            <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-primary">
              <item.icon className="size-4" />
            </span>
            <p className="mt-3 text-sm font-medium">{item.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {item.body}
            </p>
          </div>
        ))}
      </section>

      <SellerEmptyState
        icon={MessageSquare}
        title="No messages yet"
        description="When buyers message you about a gift or order, conversations land here so you can reply from your seller account."
      />
    </div>
  )
}
