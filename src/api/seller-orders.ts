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

/**
 * One shop's products on one order: they ship as a single parcel, so every
 * shipping call is addressed to the order + shop, not to one product.
 */
export type ShopParcel = { orderId: string; shopId: string }

function shippingPath(parcel: ShopParcel) {
  return `/sellers/me/orders/${parcel.orderId}/shops/${parcel.shopId}/shipping`
}

export function getShippingRates(parcel: ShopParcel, body?: ShippingShipmentInput) {
  const hasPayload = Boolean(body?.parcel || body?.customs_declaration)
  return api<ShippingRatesResult>(
    `${shippingPath(parcel)}/rates`,
    hasPayload ? { method: 'POST', body } : { method: 'POST' },
  )
}

/**
 * A fresh download link for the label already bought for this parcel.
 *
 * Fetched on demand rather than stored with the item: the link expires, so one
 * held from page load would be dead by the time a seller clicked it.
 */
export function getShippingLabelLink(parcel: ShopParcel) {
  return api<ShippingLabelLink>(`${shippingPath(parcel)}/label`)
}

export function buyShippingLabel(parcel: ShopParcel, body: BuyLabelInput) {
  return api<Shipment>(`${shippingPath(parcel)}/labels`, {
    method: 'POST',
    body,
  })
}

/**
 * Starts a delivery the seller is making personally: no courier, no tracking
 * number. Dispatches every product in the parcel straight away.
 */
export function startLocalDelivery(parcel: ShopParcel, body?: LocalDeliveryInput) {
  return api<Shipment>(`${shippingPath(parcel)}/local`, {
    method: 'POST',
    ...(body && Object.keys(body).length > 0 ? { body } : {}),
  })
}

/**
 * Confirms the seller handed the gift over. Marks the parcel's products
 * delivered, and the whole order too once nothing on it is still open.
 *
 * No request body — call only after POST .../shipping/local.
 */
export function completeLocalDelivery(parcel: ShopParcel) {
  return api<Shipment>(`${shippingPath(parcel)}/local/delivered`, {
    method: 'POST',
  })
}

/**
 * Records a seller-arranged shipment and dispatches the parcel — no Shippo
 * label, no carrier rate. The fallback for when GetRates has no rates to
 * offer because no connected carrier serves the lane at all.
 */
export function markShippingManual(parcel: ShopParcel, body: ManualShipmentInput) {
  return api<Shipment>(`${shippingPath(parcel)}/manual`, {
    method: 'POST',
    body,
  })
}
