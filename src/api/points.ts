import { api } from '@/lib/api'

export type PointsEntry = {
  id: string
  entry_type:
    | 'admin_grant'
    | 'admin_deduction'
    | 'play_debit'
    | 'play_refund'
    | 'correction'
    | 'order_reward'
    | 'order_reversal'
    | 'signup_bonus'
  order_id?: string
  amount_delta: number
  balance_after: number
  competition_id?: string
  competition_title?: string
  attempt_id?: string
  reason?: string
  actor_type: 'admin' | 'system' | 'customer'
  created_at: string
}

export type PointsWallet = {
  customer_id: string
  balance: number
  lifetime_earned: number
  lifetime_spent: number
  entries: PointsEntry[]
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

export const POINTS_ENTRY_LABEL: Record<PointsEntry['entry_type'], string> = {
  admin_grant: 'Granted',
  admin_deduction: 'Deducted',
  play_debit: 'Play',
  play_refund: 'Refund',
  correction: 'Correction',
  order_reward: 'Order reward',
  order_reversal: 'Order refunded',
  signup_bonus: 'Welcome bonus',
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
}

/** Runs the earning job now instead of waiting for its next pass. */
export function runEarning() {
  return api<EarningRunResult>('/admin/points/earning-runs', { method: 'POST' })
}
