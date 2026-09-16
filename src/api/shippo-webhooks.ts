import { api } from '@/lib/api'

/**
 * Shippo tracking webhook payload (subset we use for local testing).
 * In production Shippo POSTs this; locally the customer app can simulate it.
 */
export type ShippoTrackUpdatedPayload = {
  event: 'track_updated'
  data: {
    tracking_number: string
    tracking_status: {
      status: string
      status_date: string
    }
  }
}

/** True in Vite dev, or when explicitly enabled for staging/test builds. */
export function shippingTestToolsEnabled(): boolean {
  return (
    import.meta.env.DEV ||
    import.meta.env.VITE_ENABLE_SHIPPING_TEST_TOOLS === 'true'
  )
}

/**
 * POST /webhooks/shippo/tracking — same path Shippo hits in production.
 * No auth: the webhook is public (Shippo cannot send your JWT).
 */
export function postShippoTrackingWebhook(body: ShippoTrackUpdatedPayload) {
  return api<unknown>('/webhooks/shippo/tracking', {
    method: 'POST',
    body,
    auth: false,
  })
}

/** Local-only helper: pretend the carrier marked this tracking number DELIVERED. */
export function simulateShippoDelivered(trackingNumber: string) {
  const number = trackingNumber.trim()
  if (!number) {
    return Promise.reject(new Error('Tracking number is required.'))
  }
  return postShippoTrackingWebhook({
    event: 'track_updated',
    data: {
      tracking_number: number,
      tracking_status: {
        status: 'DELIVERED',
        status_date: new Date().toISOString(),
      },
    },
  })
}
