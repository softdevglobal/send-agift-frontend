import type { CustomerOrder } from '@/features/customer-commerce/types'

const ORDERS_KEY = 'sag.customer.orders'

function isOrder(value: unknown): value is CustomerOrder {
  if (!value || typeof value !== 'object') return false
  const order = value as CustomerOrder
  return typeof order.id === 'string' && Array.isArray(order.items)
}

export function readOrders(): CustomerOrder[] {
  try {
    const raw = localStorage.getItem(ORDERS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isOrder)
  } catch {
    return []
  }
}

export function writeOrders(orders: CustomerOrder[]) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders))
}

export function getOrder(id: string) {
  return readOrders().find((order) => order.id === id) ?? null
}

export function saveOrder(order: CustomerOrder) {
  const next = [order, ...readOrders().filter((item) => item.id !== order.id)]
  writeOrders(next)
  return order
}
