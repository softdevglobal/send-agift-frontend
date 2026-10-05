import { api } from '@/lib/api'
import type {
  LocalDeliveryInput,
  OrderItem,
  SellerOrderItemDetails,
  SellerOrderItemSummary,
  Shipment,
} from '@/api/types'

export type {
  LocalDeliveryInput,
  OrderItem,
  SellerOrderItemDetails,
  SellerOrderItemSummary,
  Shipment,
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
 * No request body. Call only after POST .../shipping/local.
 */
export function completeLocalDelivery(parcel: ShopParcel) {
  return api<Shipment>(`${shippingPath(parcel)}/local/delivered`, {
    method: 'POST',
  })
}

