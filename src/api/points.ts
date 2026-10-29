import { api } from '@/lib/api'

export type PointsEntryType =
  | 'admin_grant'
  | 'admin_deduction'
  | 'play_debit'
  | 'play_refund'
  | 'correction'
  | 'order_reward'
  | 'order_reversal'
  | 'signup_bonus'
  | 'product_reward'
  | 'product_reward_reversal'
  | 'gift_points_sent'
  | 'gift_points_received'
  | 'gift_points_returned'
  | 'gift_points_reversal'
  | 'prize_points'
  | 'points_purchase'
  | 'reward_funding'
  | 'reward_funding_return'
  | 'member_bonus'
  | 'member_bonus_reversal'

/** The kind of change, as a person reads their history. */
export type PointsCategory =
  | 'PRODUCT_PURCHASE'
  | 'GIFT_REWARD'
  | 'GIFT_SENT'
  | 'GAME_ENTRY'
  | 'POINTS_PURCHASE'
  | 'REWARD_FUNDING'
  | 'REFUND'
  | 'ADMIN_ADJUSTMENT'

/** One row of the points ledger. Every change to anyone's points. */
export type PointsEntry = {
  id: string
  customer_id?: string
  seller_id?: string
  entry_type: PointsEntryType
  category: PointsCategory
  direction: 'credit' | 'debit'
  /** Always positive; `amount_delta` carries the sign. */
  amount: number
  amount_delta: number
  balance_before: number
  balance_after: number
  status: 'completed'
  order_id?: string
  order_number?: string
  product_name?: string
  competition_id?: string
  competition_title?: string
  attempt_id?: string
  reference_type?: string
  reference_id?: string
  reason?: string
  /** A line a person can read, e.g. "Purchased Wireless Headphones". */
  description: string
  actor_type: 'admin' | 'system' | 'customer'
  created_at: string
}

/** Where a customer's points came from and went. */
export type PointsTotals = {
  from_purchases: number
  from_gifts: number
  from_prizes: number
  /** Membership bonuses, net of any taken back after a refund. */
  from_membership: number
  spent_on_games: number
  sent_as_gifts: number
}

export type PointsWallet = {
  customer_id: string
  balance: number
  lifetime_earned: number
  lifetime_spent: number
  totals?: PointsTotals
  entries: PointsEntry[]
}

/** The signed-in customer's balance and history. */
export function getMyPoints() {
  return api<PointsWallet>('/customers/me/points')
}

export type CustomerPointsSummary = {
  customer_id: string
  email: string
  display_name?: string
  country_name: string
  status: string
  balance: number
  created_at: string
}

export async function searchCustomers(query: string, signal?: AbortSignal) {
  const res = await api<{ items: CustomerPointsSummary[] | null }>(
    `/admin/customers?q=${encodeURIComponent(query)}`,
    { signal },
  )
  return res.items ?? []
}

export function getCustomerPoints(customerId: string) {
  return api<PointsWallet>(`/admin/customers/${customerId}/points`)
}

/**
 * Grants (positive) or deducts (negative) points. The key makes a retried
 * click harmless: the server refuses a second use of it.
 */
export function adjustCustomerPoints(
  customerId: string,
  body: { amount: number; reason: string; idempotency_key: string },
) {
  return api<PointsWallet>(`/admin/customers/${customerId}/points/adjustments`, { method: 'POST', body })
}

export const POINTS_ENTRY_LABEL: Record<PointsEntryType, string> = {
  admin_grant: 'Granted',
  admin_deduction: 'Deducted',
  play_debit: 'Play',
  play_refund: 'Refund',
  correction: 'Correction',
  order_reward: 'Order reward',
  order_reversal: 'Order refunded',
  signup_bonus: 'Welcome bonus',
  product_reward: 'Purchase reward',
  product_reward_reversal: 'Reward refunded',
  gift_points_sent: 'Sent with gift',
  gift_points_received: 'Gift received',
  gift_points_returned: 'Gift returned',
  gift_points_reversal: 'Gift refunded',
  prize_points: 'Prize',
  points_purchase: 'Bought',
  reward_funding: 'Reward paid',
  reward_funding_return: 'Reward returned',
  member_bonus: 'Membership bonus',
  member_bonus_reversal: 'Membership refunded',
}

export const POINTS_CATEGORY_LABEL: Record<PointsCategory, string> = {
  PRODUCT_PURCHASE: 'Purchase',
  GIFT_REWARD: 'Gift & rewards',
  GIFT_SENT: 'Gift sent',
  GAME_ENTRY: 'Game',
  POINTS_PURCHASE: 'Bought',
  REWARD_FUNDING: 'Reward paid',
  REFUND: 'Refund',
  ADMIN_ADJUSTMENT: 'Adjustment',
}

export type PointsEarningRule = {
  country_id: string
  country_name: string
  currency: string
  enabled: boolean
  points_per_unit: number
  effective_from?: string
  signup_bonus: number
  signup_bonus_since?: string
  /** The country's points_earning_enabled gate; the rule does nothing without it. */
  earning_allowed: boolean
  updated_at?: string
}

export async function listEarningRules() {
  const res = await api<{ items: PointsEarningRule[] | null }>('/admin/points/earning-rules')
  return res.items ?? []
}

export async function setEarningRule(
  countryId: string,
  body: { enabled: boolean; points_per_unit: number; signup_bonus: number },
) {
  const res = await api<{ items: PointsEarningRule[] | null }>(`/admin/points/earning-rules/${countryId}`, {
    method: 'PUT',
    body,
  })
  return res.items ?? []
}

export type EarningRunResult = {
  orders_rewarded: number
  points_awarded: number
  orders_reversed: number
  points_reversed: number
  signup_bonuses: number
  bonus_points_paid: number
  product_rewards: number
  product_reward_points: number
  rewards_released: number
  rewards_reversed: number
  gift_points_delivered: number
  gift_points_returned: number
  gift_points_reversed: number
}

/** Runs the earning job now instead of waiting for its next pass. */
export function runEarning() {
  return api<EarningRunResult>('/admin/points/earning-runs', { method: 'POST' })
}

// ─── Sellers buying points ────────────────────────────────────────────────

/** What one point costs a seller, in minor units of `currency`. */
export type PointsRate = {
  cents_per_point: number
  currency: string
}

export type SellerPointsWallet = {
  seller_id: string
  balance: number
  /** Promised as product rewards on orders not yet delivered. */
  reserved: number
  /** What can still be promised: balance − reserved. */
  available: number
  lifetime_purchased: number
  lifetime_spent: number
  /**
   * Points the platform fronted for rewards the seller could not cover (paid
   * out, or promised on open orders). Taken from their next purchase first.
   */
  owed: number
  /** How far below zero `available` may go before rewards stop. */
  credit_limit: number
  /** What can still be promised, credit included: available + credit_limit. */
  credit_left: number
  /** The biggest reward on the seller's live products. */
  largest_reward: number
  /** Owes points, or covers only a few more orders: time to top up. */
  low_balance: boolean
  rate: PointsRate
  /** "stripe" (pay on Stripe), "manual" (an admin confirms payment), "instant" or "test". */
  payment_provider: string
  /** When true the seller can approve their own purchase (development only). */
  test_payments: boolean
  entries: PointsEntry[]
}

export type PointsPurchaseStatus = 'pending' | 'completed' | 'failed' | 'cancelled'

export type PointsPurchase = {
  id: string
  seller_id: string
  amount_cents: number
  currency: string
  cents_per_point: number
  /** Includes `bonus_points`. */
  points: number
  bonus_points: number
  package_id?: string
  package_name?: string
  /** How much of what was credited paid off owed points. */
  points_settled: number
  paid_amount_cents?: number
  points_credited?: number
  status: PointsPurchaseStatus
  provider: string
  provider_reference?: string
  checkout_url?: string
  failure_reason?: string
  confirmed_by?: 'provider' | 'test' | 'admin'
  completed_at?: string
  failed_at?: string
  created_at: string
  updated_at: string
  seller_name?: string
  seller_email?: string
}

export function getSellerPoints() {
  return api<SellerPointsWallet>('/sellers/me/points')
}

export async function listSellerPointsPurchases() {
  const res = await api<{ items: PointsPurchase[] | null }>('/sellers/me/points/purchases')
  return res.items ?? []
}

/**
 * Starts a purchase. The server works out the points from the amount at its
 * own rate; the key makes a double-clicked Buy one purchase.
 */
export function createPointsPurchase(
  body: { amount_cents?: number; package_id?: string; idempotency_key: string },
) {
  return api<PointsPurchase>('/sellers/me/points/purchases', { method: 'POST', body })
}

export function cancelPointsPurchase(id: string) {
  return api<PointsPurchase>(`/sellers/me/points/purchases/${id}/cancel`, { method: 'POST' })
}

/** Test provider only: approve or decline your own payment. */
export function completeTestPayment(id: string, outcome: 'success' | 'failure') {
  return api<PointsPurchase>(`/sellers/me/points/purchases/${id}/test-payment`, {
    method: 'POST',
    body: { outcome },
  })
}

/**
 * Re-checks a purchase's payment with Stripe, for when the seller comes back
 * from paying before Stripe has told the server.
 */
export function syncPointsPurchase(id: string) {
  return api<PointsPurchase>(`/sellers/me/points/purchases/${id}/sync`, { method: 'POST' })
}

// ─── Point packages ───────────────────────────────────────────────────────

/** A ready-made bundle of points, set up by an admin. */
export type PointPackage = {
  id: string
  name: string
  description?: string
  points: number
  /** Added on top of `points`. */
  bonus_points: number
  price_cents: number
  currency: string
  /** A short label on the card, e.g. "Most popular". */
  badge?: string
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type PointPackageInput = {
  name: string
  description?: string | null
  points: number
  bonus_points: number
  price_cents: number
  badge?: string | null
  is_active: boolean
  sort_order: number
}

/** The packages a seller can buy. */
export async function listSellerPointPackages() {
  const res = await api<{ items: PointPackage[] | null; rate: PointsRate }>(
    '/sellers/me/points/packages',
  )
  return { items: res.items ?? [], rate: res.rate }
}

/** Every package, on sale or not. */
export async function listAdminPointPackages() {
  const res = await api<{ items: PointPackage[] | null; rate: PointsRate }>(
    '/admin/points/packages',
  )
  return { items: res.items ?? [], rate: res.rate }
}

/** Admin only (with a fresh password confirmation). */
export function createPointPackage(body: PointPackageInput) {
  return api<PointPackage>('/admin/points/packages', { method: 'POST', body })
}

/** Admin only (with a fresh password confirmation). */
export function updatePointPackage(id: string, body: PointPackageInput) {
  return api<PointPackage>(`/admin/points/packages/${id}`, { method: 'PUT', body })
}

export async function listPointsPurchasesForAdmin(status: PointsPurchaseStatus | '' = '') {
  const query = status ? `?status=${status}` : ''
  const res = await api<{ items: PointsPurchase[] | null; rate: PointsRate }>(
    `/admin/points/purchases${query}`,
  )
  return { items: res.items ?? [], rate: res.rate }
}

export function confirmPointsPurchase(
  id: string,
  body: { paid_amount_cents?: number; provider_reference?: string; note?: string } = {},
) {
  return api<PointsPurchase>(`/admin/points/purchases/${id}/confirm`, { method: 'POST', body })
}

export function failPointsPurchase(id: string, reason: string) {
  return api<PointsPurchase>(`/admin/points/purchases/${id}/fail`, {
    method: 'POST',
    body: { reason },
  })
}

/** "1 point = $0.10" from a rate. */
export function describeRate(rate: PointsRate) {
  return `1 point = ${formatCents(rate.cents_per_point, rate.currency)}`
}

/** Minor units as money, e.g. 1000 USD → "$10.00". */
export function formatCents(cents: number, currency = 'USD') {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100)
}
