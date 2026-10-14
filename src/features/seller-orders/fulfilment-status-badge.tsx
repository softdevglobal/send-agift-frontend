import { fulfilmentStatusLabel } from '@/features/customer-commerce/order-display'
import { cn } from '@/lib/utils'

const TONE_CLASS: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  accepted: 'bg-accent text-primary',
  preparing: 'bg-accent text-primary',
  ready: 'bg-accent text-primary',
  dispatched: 'bg-accent text-primary',
  delivered: 'bg-accent text-accent-foreground',
  cancelled: 'bg-destructive/10 text-destructive',
}

export function FulfilmentStatusBadge({
  status,
  className,
}: {
  status: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
        TONE_CLASS[status] ?? 'bg-muted text-muted-foreground',
        className,
      )}
    >
      {fulfilmentStatusLabel(status)}
    </span>
  )
}
