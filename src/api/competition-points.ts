import { api, ApiError } from '@/lib/api'

/**
 * Competition points (handover v4): a unit of their own, earned from
 * qualifying completed gifts and a once-per-paid-period member bonus, spent
 * on skill competitions entered on this website. Separate from the points
 * on the "My points" page, which are never converted into these.
 */

// ─── Shared ────────────────────────────────────────────────────────────────

export type ReasonCode =
  | 'LOCATION_UNAVAILABLE'
  | 'VERIFICATION_REQUIRED'
  | 'CHANNEL_UNAVAILABLE'
  | 'OPERATION_STOPPED'
  | 'INSUFFICIENT_ELIGIBLE_POINTS'
  | 'BONUS_ALREADY_AWARDED'
  | 'QUOTE_EXPIRED'
  | 'START_UNCERTAIN'
  | 'NO_OFFER_AVAILABLE'
  | 'ALREADY_MEMBER'
  | 'PROVIDER_UNAVAILABLE'
  | 'ENTRY_REQUIRED'
  | 'COMPETITION_NOT_OPEN'
  | 'ENTRY_LIMIT_REACHED'
  | 'IDEMPOTENCY_KEY_CONFLICT'
  | 'COMPETITION_POINTS_NOT_USED'
  | 'AGE_RESTRICTED'
  | 'RENEWAL_CONSENT_REQUIRED'
  | (string & {})

export type NextAction =
  | 'shop'
  | 'verify_phone'
  | 'add_date_of_birth'
  | 'view_details'
  | 'view_offers'
  | 'view_membership'
  | 'send_gift'
  | 'track_gift'
  | 'view_points'
  | 'manage_renewal'
  | 'check_status'
  | 'contact_support'
  | 'requote'
  | 'retry'
  | 'review_terms'
  | 'view_competitions'
  | 'view_earning_rules'
  | (string & {})

/** A refusal from the server: a stable code, a safe message, what to do next. */
export type Refusal = { code: ReasonCode; message: string; nextAction?: NextAction }

export function refusalOf(err: unknown): Refusal | null {
  if (!(err instanceof ApiError)) return null
  const body = err.body as { code?: string; error?: string; next_action?: string } | null
  if (!body?.code) return null
  return { code: body.code, message: body.error ?? err.message, nextAction: body.next_action }
}

export type Decision = {
  operation: string
  allowed: boolean
  reason_code?: ReasonCode
  message: string
  next_action: NextAction
  min_age?: number
}

export type Eligibility = {
  country_id: string
  country_name: string
  channel: string
  decisions: Decision[]
}

export function getEligibility() {
  return api<Eligibility>('/customers/me/eligibility')
}

// ─── Membership ────────────────────────────────────────────────────────────

export type IntervalUnit = 'day' | 'week' | 'month' | 'year'
export type VersionStatus = 'draft' | 'awaiting_approval' | 'published' | 'suspended' | 'retired'

export type PlanOffer = {
  id: string
  tier_code: string
  version: number
  country_id: string
  country_name?: string
  name: string
  description?: string
  currency: string
  /** Minor units of currency. */
  price_minor: number
  interval_unit: IntervalUnit
  interval_count: number
  /**
   * Percentage off the gift price for members, in basis points (100 = 1%).
   * Funded from SendAGift's commission; the seller's payout is unchanged.
   */
  member_discount_bps: number
  gift_benefits: string[]
  terms_version: string
  status: VersionStatus
  effective_from?: string
  submitted_by_admin_id?: string
  approved_by_admin_id?: string
  published_at?: string
  created_at: string
  updated_at: string
  /** The true interval: "every 28 days", never "monthly" for one that is not. */
  billing_label: string
}

export type SubscriptionStatus =
  | 'incomplete'
  | 'active'
  | 'past_due'
  | 'cancelling'
  | 'cancelled'
  | 'expired'
  | 'abandoned'

export type Subscription = {
  id: string
  offer_id: string
  provider: 'stripe' | 'test'
  checkout_url?: string
  status: SubscriptionStatus
  cancel_at_period_end: boolean
  current_period_end?: string
  cancel_requested_at?: string
  ended_at?: string
  renewal_consent_at: string
  created_at: string
}

export type PaidPeriod = {
  id: string
  subscription_id: string
  offer_id: string
  period_start: string
  period_end: string
  amount_minor: number
  currency: string
  status: 'paid' | 'refunded' | 'disputed' | 'voided'
  paid_at: string
}

export type MembershipState =
  | 'none'
  | 'active'
  | 'payment_pending'
  | 'awaiting_gift'
  | 'pending_completion'
  | 'bonus_unlocked'
  | 'bonus_reversed'
  | 'past_due'
  | 'not_currently_paid'

export type MembershipStatus = {
  state: MembershipState
  message: string
  next_action: NextAction
  subscription?: Subscription
  offer?: PlanOffer
  current_period?: PaidPeriod
  next_charge_at?: string
  next_charge_minor?: number
  periods: PaidPeriod[]
}

export type MembershipOffers = { decision: Decision; offers: PlanOffer[] }

export function getMembershipOffers() {
  return api<MembershipOffers>('/customers/me/membership/offers')
}

export function getMembership() {
  return api<MembershipStatus>('/customers/me/membership')
}

export function joinMembership(offerId: string, renewalConsent: boolean, key: string) {
  return api<{ subscription: Subscription; checkout_url: string; provider: string }>(
    '/customers/me/membership/checkout',
    {
      method: 'POST',
      body: { offer_id: offerId, renewal_consent: renewalConsent },
      headers: { 'Idempotency-Key': key },
    },
  )
}

export type MemberDiscount = { discount_bps: number; period_end?: string }

/** The product discount the signed-in customer gets on a new order now. */
export function getMemberDiscount() {
  return api<MemberDiscount>('/customers/me/member-discount')
}

/** After Stripe's checkout: confirms the payment with Stripe and returns the membership. */
export function syncMembership() {
  return api<MembershipStatus>('/customers/me/membership/sync', { method: 'POST' })
}

/** Turns renewal back on for a membership set to end. */
export function resumeMembership() {
  return api<MembershipStatus>('/customers/me/membership/resume', { method: 'POST' })
}

export function cancelMembership() {
  return api<MembershipStatus>('/customers/me/membership/cancel', { method: 'POST' })
}

/** Sandbox only: confirms a test membership payment. */
export function confirmTestPayment() {
  return api<MembershipStatus>('/customers/me/membership/test-payment', { method: 'POST' })
}

// ─── Wallet and entries ────────────────────────────────────────────────────

/** A published round, as the public competitions list returns it. */
export type PublicCompetition = {
  id: string
  title: string
  status: string
  game_slug: string
  game_name: string
  /** States the round is limited to; empty means every state of its countries. */
  states?: { state_id: string; country_id: string; code: string; name: string }[]
  starts_at: string
  ends_at: string
  /** Game entries one play costs. */
  entries_per_attempt: number
  max_attempts_per_customer: number
  number_of_winners: number
  prize_description: string
  prize_currency?: string
  current_prize_cents: number
  max_prize_cents?: number
  start_prize_cents: number
  increment_per_play_cents: number
  prize_growth_enabled: boolean
  official_rules?: string
  countries: { id: string; name: string; iso_code: string }[]
}

/**
 * The competitions open to the signed-in customer (the server lists those for
 * their country): the ones playing now or about to open, which are what the
 * mobile app offers too.
 */
export async function listEntryCompetitions() {
  const res = await api<{ items: PublicCompetition[] }>('/competitions')
  return res.items.filter((c) => c.status === 'live' || c.status === 'scheduled')
}

export function getPublicCompetition(id: string) {
  return api<PublicCompetition>(`/competitions/${id}`)
}

// ─── Admin ─────────────────────────────────────────────────────────────────

const ADMIN = '/admin/competition-points'

export type ReleaseSettings = {
  /** SendAGift's commission per sale, in basis points: the most a member discount can be. */
  platform_fee_bps: number
  membership_provider: string
  test_payments: boolean
  open_decisions: string[]
}

export const getCPSettings = () => api<ReleaseSettings>(`${ADMIN}/settings`)

export type OfferInput = {
  tier_code: string
  country_id: string
  name: string
  description?: string | null
  currency: string
  price_minor: number
  interval_unit: IntervalUnit
  interval_count: number
  member_discount_bps: number
  gift_benefits: string[]
  terms_version: string
}

export type VersionAction = 'publish' | 'submit' | 'approve' | 'return_to_draft' | 'suspend' | 'resume' | 'retire'

export type MemberRow = {
  subscription_id: string
  customer_id: string
  display_name: string
  email: string
  country_name: string
  offer_id: string
  package_name: string
  tier_code: string
  offer_version: number
  price_minor: number
  currency: string
  billing_label: string
  status: 'active' | 'past_due' | 'cancelling' | 'cancelled' | 'expired'
  /** They stopped renewing and keep their benefits to period_end. */
  cancel_at_period_end: boolean
  joined_at: string
  period_end?: string
  periods_paid: number
  total_paid_minor: number
}

export type MemberPackageCount = {
  tier_code: string
  package_name: string
  country_name: string
  members: number
}

export type MembersList = { items: MemberRow[]; total: number; packages: MemberPackageCount[] }

export type MemberQuery = {
  state?: 'current' | 'ended' | 'all'
  tier?: string
  q?: string
  limit?: number
  offset?: number
}

export function listMembers(query: MemberQuery) {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== '') params.set(k, String(v))
  return api<MembersList>(`${ADMIN}/members?${params.toString()}`)
}

export const listAdminOffers = () => api<{ items: PlanOffer[] }>(`${ADMIN}/offers`).then((r) => r.items)
export const createOffer = (body: OfferInput) =>
  api<PlanOffer>(`${ADMIN}/offers`, { method: 'POST', body })
export const updateOffer = (id: string, body: OfferInput) =>
  api<PlanOffer>(`${ADMIN}/offers/${id}`, { method: 'PUT', body })
export const deleteOffer = (id: string) => api<void>(`${ADMIN}/offers/${id}`, { method: 'DELETE' })
export const offerAction = (id: string, action: VersionAction) =>
  api<PlanOffer>(`${ADMIN}/offers/${id}/${action}`, { method: 'POST' })

export type ApprovalOperation = 'membership_sale' | 'membership_renewal'

export type ApprovalChannel = 'any' | 'web' | 'ios' | 'android' | 'event'

export type CapabilityApproval = {
  id: string
  operation: ApprovalOperation
  country_id: string
  country_name?: string
  channel: ApprovalChannel
  provider?: string
  min_age?: number
  evidence_ref: string
  notes?: string
  status: 'pending' | 'active' | 'rejected' | 'revoked'
  effective_from: string
  expires_at: string
  requested_by_admin_id: string
  approved_by_admin_id?: string
  approved_at?: string
  revoked_at?: string
  revoke_reason?: string
  created_at: string
  current: boolean
}

export type ApprovalInput = {
  operation: ApprovalOperation
  country_id: string
  channel: ApprovalChannel
  provider: string | null
  min_age: number | null
  evidence_ref: string
  notes: string | null
  effective_from: string | null
  expires_at: string
  /** Record and approve in one step (a Super Admin). */
  approve_now?: boolean
}

export const listApprovals = () =>
  api<{ items: CapabilityApproval[] }>(`${ADMIN}/approvals`).then((r) => r.items)
export const requestApproval = (body: ApprovalInput) =>
  api<CapabilityApproval>(`${ADMIN}/approvals`, { method: 'POST', body })
export const decideApproval = (id: string, action: 'approve' | 'reject') =>
  api<CapabilityApproval>(`${ADMIN}/approvals/${id}/${action}`, { method: 'POST' })
export const revokeApproval = (id: string, reason: string) =>
  api<CapabilityApproval>(`${ADMIN}/approvals/${id}/revoke`, { method: 'POST', body: { reason } })

export type StopScope = 'membership_sales' | 'membership_renewals'

export type EmergencyStop = {
  id: string
  scope: StopScope
  country_id?: string
  country_name?: string
  reason: string
  activated_by_admin_id: string
  activated_at: string
  lifted_at?: string
  lift_reason?: string
}

export const listStops = () => api<{ items: EmergencyStop[] }>(`${ADMIN}/stops`).then((r) => r.items)
export const activateStop = (scope: StopScope, countryId: string | null, reason: string) =>
  api<EmergencyStop>(`${ADMIN}/stops`, { method: 'POST', body: { scope, country_id: countryId, reason } })
export const liftStop = (id: string, reason: string) =>
  api<EmergencyStop>(`${ADMIN}/stops/${id}/lift`, { method: 'POST', body: { reason } })
