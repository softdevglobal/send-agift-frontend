import { api } from '@/lib/api'
import type {
  CreateOrderInput,
  DeliveryQuote,
  DeliveryQuoteInput,
  Order,
  OrderDetails,
} from '@/api/types'

export type {
  CreateOrderInput,
  DeliveryQuote,
  DeliveryQuoteInput,
  DeliveryQuoteLine,
  QuotedShipment,
  Order,
  OrderCreateInput,
  OrderDetails,
  OrderItem,
  OrderItemInput,
  OrderStatus,
  FulfilmentStatus,
} from '@/api/types'

function compactCreateOrder(input: CreateOrderInput): CreateOrderInput {
  const body: CreateOrderInput = {
    country_id: input.country_id,
    delivery_date: input.delivery_date,
    items: input.items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
    })),
  }

  if (input.customer_type === 'personal' || input.customer_type === 'corporate') {
    body.customer_type = input.customer_type
  }
  if (input.recipient_id) body.recipient_id = input.recipient_id
  const giftMessage = input.gift_message?.trim()
  if (giftMessage) body.gift_message = giftMessage
  if (input.media_greeting_id) body.media_greeting_id = input.media_greeting_id
  if (typeof input.delivery_amount === 'number' && Number.isFinite(input.delivery_amount)) {
    body.delivery_amount = Math.max(0, Math.round(input.delivery_amount))
  }

  return body
}

/**
 * Prices delivery for the cart before the order exists, so checkout can show a
 * real total. The server picks the cheapest service that still arrives by the
 * requested date.
 */
export function quoteDelivery(body: DeliveryQuoteInput) {
  return api<DeliveryQuote>('/customers/me/shipping/quote', {
    method: 'POST',
    body,
  })
}

export function listOrders() {
  return api<Order[]>('/customers/me/orders')
}

export function getOrder(id: string) {
  return api<OrderDetails>(`/customers/me/orders/${id}`)
}

export function createOrder(body: CreateOrderInput) {
  return api<OrderDetails>('/customers/me/orders', {
    method: 'POST',
    body: compactCreateOrder(body),
  })
}

export function cancelOrder(id: string) {
  return api<OrderDetails>(`/customers/me/orders/${id}/cancel`, {
    method: 'POST',
  })
}
