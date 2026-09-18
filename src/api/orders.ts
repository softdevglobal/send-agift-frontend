import { api } from '@/lib/api'
import type {
  CreateOrderInput,
  DeliveryQuote,
  DeliveryQuoteInput,
  DeliveryQuoteOption,
  Order,
  OrderDetails,
  OrderShippingQuote,
  QuotedShipment,
} from '@/api/types'

export type {
  CreateOrderInput,
  DeliveryQuote,
  DeliveryQuoteInput,
  DeliveryQuoteLine,
  DeliveryQuoteOption,
  DeliveryQuoteShop,
  OrderShippingQuote,
  QuotedShipment,
  Order,
  OrderCreateInput,
  OrderDetails,
  OrderItem,
  OrderItemInput,
  OrderStatus,
  FulfilmentStatus,
} from '@/api/types'

/** Maps a quote shipment into the create-order `shipping_quotes` entry. */
export function toOrderShippingQuote(
  shipment: QuotedShipment,
): OrderShippingQuote | null {
  const rateId = shipment.rate_object_id?.trim()
  const shipmentId = shipment.shipment_object_id?.trim()
  if (!rateId || !shipmentId || !shipment.shop_id) return null
  return {
    shop_id: shipment.shop_id,
    rate_object_id: rateId,
    shipment_object_id: shipmentId,
    provider: shipment.provider,
    service_name: shipment.service_name,
    amount: shipment.amount,
    currency: shipment.currency,
  }
}

/** Maps a customer-picked shop option into `shipping_quotes`. */
export function optionToOrderShippingQuote(
  shopId: string,
  option: DeliveryQuoteOption,
): OrderShippingQuote | null {
  const rateId = option.rate_object_id?.trim()
  const shipmentId = option.shipment_object_id?.trim()
  if (!rateId || !shipmentId || !shopId) return null
  return {
    shop_id: shopId,
    rate_object_id: rateId,
    shipment_object_id: shipmentId,
    provider: option.provider,
    service_name: option.service_name,
    amount: option.amount,
    currency: option.currency,
  }
}

/** Default pick per shop: recommended option, else first option. */
export function defaultQuoteSelections(
  quote: DeliveryQuote,
): Record<string, DeliveryQuoteOption> {
  const selected: Record<string, DeliveryQuoteOption> = {}
  if (quote.shops?.length) {
    for (const shop of quote.shops) {
      const pick =
        shop.options.find((option) => option.recommended) ?? shop.options[0]
      if (pick) selected[shop.shop_id] = pick
    }
    return selected
  }
  for (const shipment of quote.shipments ?? []) {
    if (!shipment.rate_object_id || !shipment.shipment_object_id) continue
    selected[shipment.shop_id] = {
      provider: shipment.provider,
      service_name: shipment.service_name,
      amount: shipment.amount,
      currency: shipment.currency,
      estimated_days: shipment.estimated_days,
      days_available: shipment.days_available ?? shipment.estimated_days,
      recommended: true,
      rate_object_id: shipment.rate_object_id,
      shipment_object_id: shipment.shipment_object_id,
    }
  }
  return selected
}

export function selectionsToShippingQuotes(
  selections: Record<string, DeliveryQuoteOption>,
): OrderShippingQuote[] {
  return Object.entries(selections)
    .map(([shopId, option]) => optionToOrderShippingQuote(shopId, option))
    .filter((entry): entry is OrderShippingQuote => entry !== null)
}

export function selectionsDeliveryAmount(
  selections: Record<string, DeliveryQuoteOption>,
): number {
  return Object.values(selections).reduce((sum, option) => sum + (option.amount || 0), 0)
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

  return body
}

/**
 * Prices delivery for the cart before the order exists, so checkout can show a
 * real total. Returns per-shop courier options when available.
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
