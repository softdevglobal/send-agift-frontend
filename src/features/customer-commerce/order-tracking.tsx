import { Check, X } from 'lucide-react'

import {
  getOrderTrackingProgress,
  orderStatusDescription,
  orderStatusLabel,
} from '@/features/customer-commerce/order-display'
import { cn } from '@/lib/utils'

const STATUS_TONE_CLASS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending_payment: 'bg-muted text-muted-foreground',
  paid: 'bg-primary/10 text-primary',
  accepted: 'bg-primary/10 text-primary',
  preparing: 'bg-primary/10 text-primary',
  dispatched: 'bg-primary/10 text-primary',
  delivered: 'bg-accent text-accent-foreground',
  cancelled: 'bg-destructive/10 text-destructive',
  refunded: 'bg-destructive/10 text-destructive',
}

export function OrderStatusBadge({
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
        STATUS_TONE_CLASS[status] ?? 'bg-muted text-muted-foreground',
        className,
      )}
    >
      {orderStatusLabel(status)}
    </span>
  )
}

export function OrderTrackingProgressBar({
  status,
  className,
}: {
  status: string
  className?: string
}) {
  const progress = getOrderTrackingProgress(status)
  const total = progress.steps.length
  const value = progress.terminal ? 0 : Math.max(progress.completedCount, 1)
  const percent = progress.terminal ? 0 : Math.round((value / total) * 100)
  const current =
    progress.steps.find((step) => step.state === 'current') ?? progress.steps[0]

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-3 text-xs">
        <p className="font-medium text-foreground">
          {progress.terminal ? progress.terminal.label : current?.label}
        </p>
        {progress.terminal ? null : (
          <p className="shrink-0 text-muted-foreground">
            Step {value} of {total}
          </p>
        )}
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={progress.terminal ? 0 : value}
        aria-label="Order progress"
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width]',
            progress.terminal ? 'bg-destructive/70' : 'bg-primary',
          )}
          style={{ width: progress.terminal ? '100%' : `${percent}%` }}
        />
      </div>
    </div>
  )
}

export function OrderTrackingTimeline({
  status,
  placedAt,
  updatedAt,
}: {
  status: string
  placedAt?: string
  updatedAt?: string
}) {
  const progress = getOrderTrackingProgress(status)
  const items = progress.terminal
    ? [...progress.steps.filter((step) => step.state === 'complete'), progress.terminal]
    : progress.steps

  return (
    <div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {orderStatusDescription(status)}
      </p>
      <ol className="mt-5">
        {items.map((step, index) => {
          const isLast = index === items.length - 1
          const timeLabel =
            step.key === 'placed' && placedAt
              ? placedAt
              : step.state === 'current' || step.state === 'cancelled'
                ? updatedAt
                : null

          return (
            <li key={step.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    'flex size-7 items-center justify-center rounded-full ring-4 ring-card',
                    step.state === 'complete' && 'bg-primary text-primary-foreground',
                    step.state === 'current' &&
                      'bg-primary text-primary-foreground ring-primary/15',
                    step.state === 'upcoming' &&
                      'bg-muted text-muted-foreground ring-transparent',
                    step.state === 'cancelled' &&
                      'bg-destructive text-primary-foreground ring-destructive/15',
                  )}
                >
                  {step.state === 'complete' ? (
                    <Check className="size-3.5" strokeWidth={2.5} />
                  ) : step.state === 'cancelled' ? (
                    <X className="size-3.5" strokeWidth={2.5} />
                  ) : (
                    <span className="size-2 rounded-full bg-current" />
                  )}
                </span>
                {isLast ? null : (
                  <span
                    className={cn(
                      'mt-1 mb-1 w-px flex-1 min-h-6',
                      step.state === 'complete' ? 'bg-primary/40' : 'bg-border',
                    )}
                  />
                )}
              </div>
              <div className={cn('min-w-0 pt-0.5', isLast ? 'pb-0' : 'pb-5')}>
                <p
                  className={cn(
                    'text-sm font-medium',
                    step.state === 'upcoming' && 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
                {timeLabel ? (
                  <p className="mt-1 text-xs text-muted-foreground">{timeLabel}</p>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
