import { api } from '@/lib/api'
import type { Order, OrderCreateInput, OrderDetails } from '@/api/types'

export type {
  Order,
  OrderCreateInput,
  OrderDetails,
  OrderItem,
  OrderItemInput,
  OrderStatus,
  FulfilmentStatus,
} from '@/api/types'

export function listOrders() {
  return api<Order[]>('/customers/me/orders')
}

export function getOrder(id: string) {
  return api<OrderDetails>(`/customers/me/orders/${id}`)
}

export function createOrder(body: OrderCreateInput) {
  return api<OrderDetails>('/customers/me/orders', {
    method: 'POST',
    body,
  })
}

export function cancelOrder(id: string) {
  return api<OrderDetails>(`/customers/me/orders/${id}/cancel`, {
    method: 'POST',
  })
}
