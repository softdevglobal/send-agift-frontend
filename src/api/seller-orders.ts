import { api } from '@/lib/api'
import type {
  LocalDeliveryInput,
  OrderItem,
  OrderStatus,
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


/** Someone who has ordered from this seller: name, region and what they
 *  bought here. No contact details or game entries. */
export type SellerCustomer = {
  customer_id: string
  name: string
  country_name: string
  state_name?: string
  orders_count: number
  /** Units bought, cancelled lines left out. */
  items_count: number
  /** Paid for this seller's lines, per currency; free gifts left out. */
  spent: { currency: string; amount: number }[]
  first_order_at: string
  last_order_at: string
}

export type SellerCustomerOrderLine = {
  /** The order item; opens at /seller/orders/:id. */
  id: string
  product_name: string
  product_image_url?: string
  shop_name: string
  quantity: number
  total_amount: number
  fulfilment_status: string
  recipient_name?: string
}

/** An order as far as it concerns this seller: only their lines. */
export type SellerCustomerOrder = {
  order_id: string
  order_number: string
  status: OrderStatus
  order_kind: string
  currency: string
  amount: number
  delivery_date: string
  created_at: string
  items: SellerCustomerOrderLine[]
}

export type SellerCustomerDetail = SellerCustomer & { orders: SellerCustomerOrder[] }

export function listSellerCustomers() {
  return api<SellerCustomer[]>('/sellers/me/customers')
}

export function getSellerCustomer(id: string) {
  return api<SellerCustomerDetail>(`/sellers/me/customers/${id}`)
}
