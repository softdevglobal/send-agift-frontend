import { api } from '@/lib/api'
import type {
  BuyLabelInput,
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
