import { api } from '@/lib/api'
import type {
  BuyLabelInput,
  OrderItem,
  SellerOrderItemDetails,
  SellerOrderItemSummary,
  Shipment,
  ShippingRatesResult,
  ShippingShipmentInput,
} from '@/api/types'
import { resolveShipmentLabelUrl } from '@/api/types'

export type {
  BuyLabelInput,
  CustomsDeclarationInput,
  CustomsItemInput,
  OrderItem,
  ParcelInput,
  SellerOrderItemDetails,
  SellerOrderItemSummary,
  Shipment,
  ShipmentProviderMetadata,
  ShippingRatesResult,
  ShippingShipmentInput,
  ShippoRate,
} from '@/api/types'

export { resolveShipmentLabelUrl }

export function listSellerOrderItems() {
  return api<SellerOrderItemSummary[]>('/sellers/me/order-items')
}

export function getSellerOrderItem(id: string) {
  return api<SellerOrderItemDetails>(`/sellers/me/order-items/${id}`)
}

export function acceptSellerOrderItem(id: string) {
  return api<OrderItem>(`/sellers/me/order-items/${id}/accept`, {
    method: 'PATCH',
  })
}

export function getShippingRates(orderItemID: string, body?: ShippingShipmentInput) {
  const hasPayload = Boolean(body?.parcel || body?.customs_declaration)
  return api<ShippingRatesResult>(
    `/sellers/me/order-items/${orderItemID}/shipping/rates`,
    hasPayload ? { method: 'POST', body } : { method: 'POST' },
  )
}

export function buyShippingLabel(orderItemID: string, body: BuyLabelInput) {
  return api<Shipment>(`/sellers/me/order-items/${orderItemID}/shipping/labels`, {
    method: 'POST',
    body,
  })
}

function isShipment(value: unknown): value is Shipment {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Shipment).id === 'string' &&
    typeof (value as Shipment).tracking_number === 'string'
  )
}

/** Normalize GET /shipping/labels payloads (object, array, or wrapped). */
export function normalizeShippingLabelResponse(payload: unknown): Shipment | null {
  if (isShipment(payload)) return payload
  if (Array.isArray(payload)) {
    const first = payload.find(isShipment)
    return first ?? null
  }
  if (typeof payload === 'object' && payload !== null) {
    const record = payload as Record<string, unknown>
    if (isShipment(record.shipment)) return record.shipment
    if (isShipment(record.label)) return record.label
    if (Array.isArray(record.shipments)) {
      const first = record.shipments.find(isShipment)
      return first ?? null
    }
    if (Array.isArray(record.labels)) {
      const first = record.labels.find(isShipment)
      return first ?? null
    }
  }
  return null
}

/** Fetch an already-saved shipping label for this order item (call again to re-download). */
export async function getShippingLabel(orderItemID: string): Promise<Shipment | null> {
  const payload = await api<unknown>(
    `/sellers/me/order-items/${orderItemID}/shipping/labels`,
  )
  return normalizeShippingLabelResponse(payload)
}
