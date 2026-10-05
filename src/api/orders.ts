import { api } from '@/lib/api'
import type {
  CreateOrderInput,
  DeliveryQuote,
  DeliveryQuoteInput,
  Order,
  OrderDetails,
  OrderShippingQuote,
  QuotedShipment,
  ReceivedGift,
  SellerDeliveryQuote,
} from '@/api/types'

export type {
  CreateOrderInput,
  DeliveryQuote,
  DeliveryQuoteInput,
  DeliveryQuoteLine,
  DeliveryQuoteShop,
  OrderShippingQuote,
  QuotedShipment,
  SellerDeliveryQuote,
  Order,
  OrderCreateInput,
  OrderDetails,
  OrderItem,
  OrderItemInput,
  OrderStatus,
  FulfilmentStatus,
} from '@/api/types'

/** Shop delivery the customer is charged for one shop at checkout. */
export type CheckoutDeliveryChoice = {
  mode: 'seller_delivery'
  amount: number
  currency: string
  estimated_days: number
  distance_km?: number
  is_free?: boolean
}

export function sellerDeliveryChoice(
  delivery: SellerDeliveryQuote,
): CheckoutDeliveryChoice {
  return {
    mode: 'seller_delivery',
    amount: delivery.is_free ? 0 : delivery.price_amount,
    currency: delivery.currency,
    estimated_days: delivery.estimated_days ?? 1,
    distance_km: delivery.distance_km,
    is_free: delivery.is_free || delivery.price_amount === 0,
  }
}

/** Maps a quote shipment into the create-order `shipping_quotes` entry. */
export function toOrderShippingQuote(
  shipment: QuotedShipment,
): OrderShippingQuote | null {
  if (!shipment.shop_id || shipment.mode !== 'seller_delivery') return null
  return {
    shop_id: shipment.shop_id,
    mode: 'seller_delivery',
    amount: shipment.amount,
    currency: shipment.currency,
  }
}

/** Maps a customer-picked shop choice into `shipping_quotes`. */
export function choiceToOrderShippingQuote(
  shopId: string,
  choice: CheckoutDeliveryChoice,
): OrderShippingQuote | null {
  if (!shopId) return null
  return {
    shop_id: shopId,
    mode: 'seller_delivery',
    amount: choice.amount,
    currency: choice.currency,
  }
}

/** Default pick per shop: the shop's delivery zone, when the address is inside it. */
export function defaultQuoteSelections(
  quote: DeliveryQuote,
): Record<string, CheckoutDeliveryChoice> {
  const selected: Record<string, CheckoutDeliveryChoice> = {}
  for (const shop of quote.shops ?? []) {
    if (shop.seller_delivery?.available) {
      selected[shop.shop_id] = sellerDeliveryChoice(shop.seller_delivery)
    }
  }
  if (Object.keys(selected).length) return selected
  for (const shipment of quote.shipments ?? []) {
    if (shipment.mode !== 'seller_delivery' || !shipment.shop_id) continue
    selected[shipment.shop_id] = {
      mode: 'seller_delivery',
      amount: shipment.amount,
      currency: shipment.currency,
      estimated_days: shipment.estimated_days,
    }
  }
  return selected
}

export function selectionsToShippingQuotes(
  selections: Record<string, CheckoutDeliveryChoice>,
): OrderShippingQuote[] {
  return Object.entries(selections)
    .map(([shopId, choice]) => choiceToOrderShippingQuote(shopId, choice))
    .filter((entry): entry is OrderShippingQuote => entry !== null)
}

export function selectionsDeliveryAmount(
  selections: Record<string, CheckoutDeliveryChoice>,
): number {
  return Object.values(selections).reduce((sum, choice) => sum + (choice.amount || 0), 0)
}

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
  if (input.shipping_quotes?.length) {
    body.shipping_quotes = input.shipping_quotes
  }
  if (typeof input.gift_points === 'number' && input.gift_points > 0) {
    body.gift_points = Math.floor(input.gift_points)
  }

  return body
}

/**
 * Prices delivery for the cart before the order exists, so checkout can show a
 * real total from each shop's delivery zones.
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

/** Delivered gifts other customers sent to the signed-in customer. */
export function listReceivedGifts() {
  return api<ReceivedGift[]>('/customers/me/received-gifts')
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
