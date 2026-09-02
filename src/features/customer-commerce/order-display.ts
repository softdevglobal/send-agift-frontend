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

const ORDER_STATUS_DESCRIPTIONS: Record<OrderStatus, string> = {
  draft: 'This order is still being prepared on our side.',
  pending_payment: 'Payment has not been captured yet.',
  paid: 'Payment is confirmed. Waiting for the seller to accept.',
  accepted: 'The seller has accepted this gift order.',
  preparing: 'The seller is preparing your gift.',
  dispatched: 'The gift is on its way to the recipient.',
  delivered: 'The gift has been delivered.',
  cancelled: 'This order was cancelled.',
  refunded: 'This order was refunded.',
}

/** Orders still moving through fulfilment — shown on Track orders. */
export const ACTIVE_ORDER_STATUSES: ReadonlySet<string> = new Set([
  'draft',
  'pending_payment',
  'paid',
  'accepted',
  'preparing',
  'dispatched',
])

/** Finished orders — shown on Order history. */
export const HISTORY_ORDER_STATUSES: ReadonlySet<string> = new Set([
  'delivered',
  'cancelled',
  'refunded',
])

export type TrackingStepState = 'complete' | 'current' | 'upcoming' | 'cancelled'

export type TrackingStep = {
  key: string
  label: string
  description: string
  statuses: readonly string[]
}

/** Happy-path steps a customer can follow after placing an order. */
export const ORDER_TRACKING_STEPS: readonly TrackingStep[] = [
  {
    key: 'placed',
    label: 'Order placed',
    description: 'We received your gift order.',
    statuses: ['draft', 'pending_payment'],
  },
  {
    key: 'paid',
    label: 'Payment received',
    description: 'Payment is confirmed. The seller can start on your gift.',
    statuses: ['paid'],
  },
  {
    key: 'accepted',
    label: 'Seller accepted',
    description: 'The seller has accepted this order.',
    statuses: ['accepted'],
  },
  {
    key: 'preparing',
    label: 'Preparing gift',
    description: 'Your gift is being prepared for delivery.',
    statuses: ['preparing'],
  },
  {
    key: 'dispatched',
    label: 'On the way',
    description: 'The gift is on its way to the recipient.',
    statuses: ['dispatched'],
  },
  {
    key: 'delivered',
    label: 'Delivered',
    description: 'The gift has been delivered.',
    statuses: ['delivered'],
  },
]

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

export function orderStatusDescription(status: string): string {
  return (
    ORDER_STATUS_DESCRIPTIONS[status as OrderStatus] ??
    'You can follow this gift as it moves toward delivery.'
  )
}

export function isActiveOrderStatus(status: string): boolean {
  return ACTIVE_ORDER_STATUSES.has(status)
}

export function isHistoryOrderStatus(status: string): boolean {
  return HISTORY_ORDER_STATUSES.has(status)
}

export function ordersListPath(status: string): string {
  return isHistoryOrderStatus(status) ? '/orders/history' : '/orders'
}

export type OrderTrackingProgress = {
  steps: Array<TrackingStep & { state: TrackingStepState }>
  terminal: (TrackingStep & { state: TrackingStepState }) | null
  currentIndex: number
  completedCount: number
}

export function getOrderTrackingProgress(status: string): OrderTrackingProgress {
  const currentIndex = ORDER_TRACKING_STEPS.findIndex((step) =>
    step.statuses.includes(status),
  )
  const isTerminal = status === 'cancelled' || status === 'refunded'

  const steps = ORDER_TRACKING_STEPS.map((step, index) => {
    let state: TrackingStepState = 'upcoming'
    if (isTerminal) {
      state = index === 0 ? 'complete' : 'upcoming'
    } else if (currentIndex >= 0) {
      if (index < currentIndex) state = 'complete'
      else if (index === currentIndex) state = 'current'
    }
    return { ...step, state }
  })

  const terminal = isTerminal
    ? {
        key: status,
        label: orderStatusLabel(status),
        description: orderStatusDescription(status),
        statuses: [status],
        state: 'cancelled' as const,
      }
    : null

  const completedCount = steps.filter((step) => step.state === 'complete').length
  const currentBonus = steps.some((step) => step.state === 'current') ? 1 : 0

  return {
    steps,
    terminal,
    currentIndex,
    completedCount: completedCount + currentBonus,
  }
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
