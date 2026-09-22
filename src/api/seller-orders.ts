import { api } from '@/lib/api'
import type {
  BuyLabelInput,
  LocalDeliveryInput,
  ManualShipmentInput,
  OrderItem,
  SellerOrderItemDetails,
  SellerOrderItemSummary,
  Shipment,
  ShippingLabelLink,
  ShippingRatesResult,
  ShippingShipmentInput,
} from '@/api/types'

export type {
  BuyLabelInput,
  CustomsDeclarationInput,
  CustomsItemInput,
  LocalDeliveryInput,
  ManualShipmentInput,
  OrderItem,
  ParcelInput,
  SellerOrderItemDetails,
  SellerOrderItemSummary,
  Shipment,
  ShippingLabelLink,
  ShippingRatesResult,
  ShippingShipmentInput,
  ShippoRate,
} from '@/api/types'

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

/**
 * A fresh download link for the label already bought on this order item.
 *
 * Fetched on demand rather than stored with the item: the link expires, so one
 * held from page load would be dead by the time a seller clicked it.
 */
export function getShippingLabelLink(orderItemID: string) {
  return api<ShippingLabelLink>(
    `/sellers/me/order-items/${orderItemID}/shipping/label`,
  )
}

export function buyShippingLabel(orderItemID: string, body: BuyLabelInput) {
  return api<Shipment>(`/sellers/me/order-items/${orderItemID}/shipping/labels`, {
    method: 'POST',
    body,
  })
}

/**
 * Starts a delivery the seller is making personally: no courier, no tracking
 * number. Dispatches the item straight away.
 */
export function startLocalDelivery(orderItemID: string, body?: LocalDeliveryInput) {
  return api<Shipment>(`/sellers/me/order-items/${orderItemID}/shipping/local`, {
    method: 'POST',
    ...(body && Object.keys(body).length > 0 ? { body } : {}),
  })
}

/**
 * Confirms the seller handed the gift over. Marks the shipment and the item
 * delivered, and the whole order too once nothing on it is still open.
 *
 * No request body — call only after POST .../shipping/local.
 */
export function completeLocalDelivery(orderItemID: string) {
  return api<Shipment>(
    `/sellers/me/order-items/${orderItemID}/shipping/local/delivered`,
    { method: 'POST' },
  )
}

/**
 * Records a seller-arranged shipment and dispatches the item — no Shippo
 * label, no carrier rate. The fallback for when GetRates has no rates to
 * offer because no connected carrier serves the lane at all.
 */
export function markShippingManual(orderItemID: string, body: ManualShipmentInput) {
  return api<Shipment>(`/sellers/me/order-items/${orderItemID}/shipping/manual`, {
    method: 'POST',
    body,
  })
}
