import { useState } from 'react'
import { Check, Copy, ExternalLink, PackageCheck, Truck } from 'lucide-react'

import type { OrderItemTracking } from '@/api/types'
import { Button } from '@/components/ui/button'
import { SimulateDeliveryButton } from '@/features/customer-commerce/simulate-delivery-button'
import { cn } from '@/lib/utils'

/** Plain-English progress, so the customer never reads a raw enum. */
const STATUS_COPY: Record<string, { label: string; hint: string }> = {
  label_created: {
    label: 'Ready to collect',
    hint: 'The shop has printed the label. The courier collects it next.',
  },
  collected: {
    label: 'Picked up',
    hint: 'The courier has the parcel.',
  },
  in_transit: {
    label: 'On its way',
    hint: 'The parcel is moving through the courier network.',
  },
  delivered: {
    label: 'Delivered',
    hint: 'The courier marked this parcel as delivered.',
  },
  failed: {
    label: 'Delivery problem',
    hint: 'The courier could not complete delivery. Message the shop below.',
  },
  returned: {
    label: 'Returned to sender',
    hint: 'The parcel is on its way back to the shop.',
  },
}

function formatShippedAt(iso: string): string | null {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** Copies the tracking number, since it is the thing people paste elsewhere. */
function CopyNumber({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard blocked (insecure origin, denied permission) — the number is
      // on screen and selectable, so there is nothing to recover from.
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="group inline-flex items-center gap-1.5 rounded-md font-mono text-sm font-medium tracking-tight hover:text-primary"
      title="Copy tracking number"
    >
      {value}
      {copied ? (
        <Check className="size-3.5 text-emerald-600" />
      ) : (
        <Copy className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  )
}

/**
 * The parcel-tracking block on a customer's order.
 *
 * Tracking is per line, not per order: an order can span several shops, each
 * shipping its own parcel with its own courier and number.
 */
export function ParcelTracking({
  tracking,
  className,
  /** DEV: after simulating Shippo DELIVERED, reload the order for reviews. */
  onSimulatedDelivery,
}: {
  tracking: OrderItemTracking
  className?: string
  onSimulatedDelivery?: () => void | Promise<void>
}) {
  const copy = STATUS_COPY[tracking.status] ?? {
    label: 'Shipped',
    hint: 'This parcel is on its way.',
  }
  const delivered = tracking.status === 'delivered'
  const shippedAt = formatShippedAt(tracking.shipped_at)
  const sellerManaged = tracking.delivery_mode === 'seller_managed'
  const trackingNumber = tracking.tracking_number?.trim() ?? ''

  return (
    <div
      className={cn(
        'rounded-xl border border-border/60 bg-muted/30 p-3.5',
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full',
            delivered
              ? 'bg-emerald-500/15 text-emerald-600'
              : 'bg-primary/10 text-primary',
          )}
        >
          {delivered ? (
            <PackageCheck className="size-4" />
          ) : (
            <Truck className="size-4" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <p className="text-sm font-medium">{copy.label}</p>
            {tracking.courier_provider ? (
              <span className="text-sm text-muted-foreground">
                · {tracking.courier_provider}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
            {copy.hint}
          </p>

          {trackingNumber ? (
            <div className="mt-2">
              <p className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                Tracking number
              </p>
              <CopyNumber value={trackingNumber} />
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {tracking.tracking_url ? (
              <Button
                asChild
                size="sm"
                variant={delivered ? 'outline' : 'default'}
                className="h-8 rounded-full"
              >
                <a href={tracking.tracking_url} target="_blank" rel="noreferrer">
                  Track parcel
                  <ExternalLink className="size-3.5" />
                </a>
              </Button>
            ) : null}
            {shippedAt ? (
              <span className="text-xs text-muted-foreground">
                Shipped {shippedAt}
              </span>
            ) : null}
          </div>

          {sellerManaged && !tracking.tracking_url ? (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              The shop is delivering this one themselves. Use the number above
              with {tracking.courier_provider || 'their courier'}, or message the
              shop if you need an update.
            </p>
          ) : null}

          {!delivered && trackingNumber && onSimulatedDelivery ? (
            <SimulateDeliveryButton
              trackingNumber={trackingNumber}
              onSimulated={onSimulatedDelivery}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
