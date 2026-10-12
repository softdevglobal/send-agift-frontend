import { api } from '@/lib/api'

/** Where to send the customer to pay for an order. */
export type OrderPayment = {
  /** Stripe's hosted payment page. Navigate the whole window to it. */
  url: string
  session_id: string
  /** Minor units. */
  amount: number
  currency: string
}

/** A seller's payout account, as Stripe last reported it. */
export type SellerPayouts = {
  /** Stripe is configured on the server. */
  enabled: boolean
  connected: boolean
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
  account_id?: string
  /** Automatic sends each delivered gift on; manual waits for a withdrawal. */
  payout_mode?: PayoutMode
}

export type PayoutMode = 'automatic' | 'manual'

/** What one withdrawal sent. Amounts are minor units. */
export type Withdrawal = {
  sent: number
  failed: number
  amount: number
}

/** One settlement paid out to the seller for a delivered gift. */
export type PayoutItem = {
  id: string
  order_number: string
  product_name: string
  /** Minor units: what the gift sold for. */
  gross_amount: number
  /** Minor units: the platform's cut. */
  fee_amount: number
  /** Minor units: what reached the seller. */
  amount: number
  currency: string
  status: 'pending' | 'in_transit' | 'paid' | 'failed' | 'held'
  created_at: string
}

/** What a seller has been paid, and what is still to come, in one currency. */
export type PayoutTotals = {
  currency: string
  paid_out: number
  fees: number
  /** Paid gifts not delivered yet. */
  on_the_way: number
  /** Delivered gifts waiting for the next payout. */
  awaiting: number
}

export type PayoutHistory = {
  account: SellerPayouts
  totals: PayoutTotals[]
  items: PayoutItem[]
}

/** Starts (or, on a retry, returns the same) hosted payment for an order. */
export function startOrderPayment(orderId: string) {
  return api<OrderPayment>(`/customers/me/orders/${encodeURIComponent(orderId)}/pay`, {
    method: 'POST',
  })
}

/**
 * Asks the server to re-check an order's payment with Stripe. The order turns
 * paid from Stripe's webhook, and this covers the webhook arriving late or not
 * at all. Safe to call repeatedly.
 */
export function syncOrderPayment(orderId: string) {
  return api<{ status: string; paid: boolean }>(
    `/customers/me/orders/${encodeURIComponent(orderId)}/payment/sync`,
    { method: 'POST' },
  )
}

export function getSellerPayouts() {
  return api<SellerPayouts>('/sellers/me/stripe')
}

/** The payouts page: account, totals and the latest settlements. */
export function getPayoutHistory() {
  return api<PayoutHistory>('/sellers/me/payouts')
}

/** A link to Stripe's hosted page for the seller's bank and identity details. */
export function startSellerPayoutOnboarding() {
  return api<{ url: string }>('/sellers/me/stripe/onboarding', { method: 'POST' })
}

/** Chooses between automatic payouts and withdrawing the balance by hand. */
export function setPayoutMode(mode: PayoutMode) {
  return api<SellerPayouts>('/sellers/me/payouts/mode', {
    method: 'PUT',
    body: { mode },
  })
}

/** Pays out everything delivered and not yet paid, now. */
export function withdrawPayouts() {
  return api<Withdrawal>('/sellers/me/payouts/withdraw', { method: 'POST' })
}
