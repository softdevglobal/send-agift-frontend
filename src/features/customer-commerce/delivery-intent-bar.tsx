import { MapPin, X } from 'lucide-react'
import { Link } from 'react-router-dom'

import {
  describeIntent,
  useDeliveryIntent,
} from '@/features/customer-commerce/delivery-intent-context'
import { cn } from '@/lib/utils'

/**
 * A reminder, while browsing, of where the gift is going and when it is
 * wanted — so the answers given on the home page are visibly still in hand
 * rather than quietly forgotten before checkout.
 */
export function DeliveryIntentBar({ className }: { className?: string }) {
  const { intent, clearIntent } = useDeliveryIntent()
  if (!intent) return null

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-border/70',
        'bg-surface px-4 py-2.5 text-sm',
        className,
      )}
    >
      <MapPin className="size-4 shrink-0 text-primary" />
      <span className="min-w-0 flex-1">
        <span className="text-muted-foreground">Delivering to </span>
        <span className="font-medium">{describeIntent(intent)}</span>
      </span>
      <Link
        to="/"
        className="font-medium text-primary hover:underline"
      >
        Change
      </Link>
      <button
        type="button"
        onClick={clearIntent}
        aria-label="Forget this delivery address and date"
        className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
