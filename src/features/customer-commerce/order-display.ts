import type { FulfilmentStatus, OrderStatus } from '@/api/types'

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: 'Draft',
  pending_payment: 'Awaiting payment',
  paid: 'Paid',
  accepted: 'Accepted',
  preparing: 'Preparing',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

const FULFILMENT_STATUS_LABELS: Record<FulfilmentStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready: 'Ready',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

/** Mirrors the statuses the API accepts for POST /orders/{id}/cancel. */
const CANCELLABLE: ReadonlySet<string> = new Set([
  'draft',
  'pending_payment',
  'paid',
  'accepted',
  'preparing',
])

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status as OrderStatus] ?? status.replaceAll('_', ' ')
}

export function fulfilmentStatusLabel(status: string): string {
  return (
    FULFILMENT_STATUS_LABELS[status as FulfilmentStatus] ??
    status.replaceAll('_', ' ')
  )
}

export function canCancelOrder(status: string): boolean {
  return CANCELLABLE.has(status)
}

/** The API sends delivery_date as a timestamp; only the date part is meaningful. */
export function formatDeliveryDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatOrderDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

/** YYYY-MM-DD in local time, for <input type="date"> bounds and defaults. */
export function toDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}
