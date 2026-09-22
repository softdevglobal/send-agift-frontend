import { api } from '@/lib/api'

export type CompetitionStatus =
  | 'draft'
  | 'scheduled'
  | 'live'
  | 'closed'
  | 'frozen'
  | 'finalised'
  | 'cancelled'

export type PrizeReserve = {
  id: string
  competition_id: string
  /** Minor units (cents). */
  reserve_amount: number
  currency: string
  funding_source: 'sendagift' | 'approved_sponsor'
  status: 'pending' | 'funded' | 'released' | 'cancelled'
  evidence_reference?: string
  funded_at?: string
}

export type AdminCompetition = {
  id: string
  country_id: string
  country_code: string
  country_name: string
  game_version_id: string
  game_version_status: string
  game_slug: string
  game_name: string
  game_version: string
  title: string
  /** The stored status; `effective_status` layers the clock on top. */
  status: CompetitionStatus
  starts_at: string
  ends_at: string
  timezone: string
  points_per_attempt: number
  max_attempts_per_customer: number
  min_age: number
  requires_identity_verification: boolean
  number_of_winners: number
  prize_description: string
  /** Minor units (cents). */
  prize_value_amount?: number
  prize_currency?: string
  official_rules?: string
  cancel_reason?: string
  cancel_note?: string
  cancelled_at?: string
  frozen_at?: string
  finalised_at?: string
  created_at: string
  updated_at: string
  effective_status: CompetitionStatus
  prize_reserve?: PrizeReserve
  attempts: number
  submissions: number
  under_review: number
}

export type CompetitionInput = {
  country_id: string
  game_slug: string
  title: string
  starts_at: string
  ends_at: string
  timezone: string
  points_per_attempt: number
  max_attempts_per_customer: number
  min_age: number
  requires_identity_verification: boolean
  number_of_winners: number
  prize_description: string
  prize_value_amount: number | null
  prize_currency: string | null
  official_rules: string | null
}

export type ReserveInput = {
  reserve_amount: number
  currency: string
  funding_source: 'sendagift' | 'approved_sponsor'
}

/** The only reasons a competition may be cancelled (Master Plan §13.9). */
export const CANCEL_REASONS = [
  { value: 'technical_failure', label: 'Technical failure' },
  { value: 'security_breach', label: 'Security breach' },
  { value: 'legal_direction', label: 'Legal direction' },
  { value: 'provider_or_store_direction', label: 'Provider or app store direction' },
  { value: 'platform_outage', label: 'Platform outage' },
  { value: 'prize_unavailable', label: 'Prize unavailable' },
  { value: 'fairness_failure', label: 'Fairness failure' },
] as const

export type CancelReason = (typeof CANCEL_REASONS)[number]['value']

export type ScoreSubmission = {
  id: string
  competition_id: string
  attempt_id: string
  customer_id: string
  score: number
  client_score?: number
  duration_ms: number
  moves_count: number
  stats: Record<string, number>
  event_log_hash: string
  validation_status: 'pending' | 'accepted' | 'rejected' | 'manual_review'
  review_reason?: string
  created_at: string
  display_name?: string
}

export type CompetitionLeaderRow = {
  rank: number
  customer_id?: string
  display_name?: string
  country_code?: string
  country_name?: string
  score: number
  duration_ms: number
  achieved_at: string
  validation_status: string
}

export type PrizeClaim = {
  id: string
  winner_id: string
  claim_deadline_at: string
  claimed_at?: string
  status: 'pending' | 'claimed' | 'verified' | 'fulfilled' | 'expired' | 'rejected'
  delivery_address_id?: string
  terms_accepted_at?: string
}

export type CompetitionWinner = {
  id: string
  competition_id: string
  customer_id: string
  score_submission_id: string
  prize_position: number
  rank: number
  status: 'pending_validation' | 'validated' | 'disqualified' | 'unclaimed' | 'replaced'
  status_reason?: string
  validated_at?: string
  display_name?: string
  country_name: string
  score: number
  duration_ms: number
  achieved_at: string
  claim?: PrizeClaim
}

const base = (id: string) => `/admin/competitions/${id}`

async function items<T>(path: string) {
  const res = await api<{ items: T[] | null }>(path)
  return res.items ?? []
}

export function listAdminCompetitions() {
  return items<AdminCompetition>('/admin/competitions')
}

export function getAdminCompetition(id: string) {
  return api<AdminCompetition>(base(id))
}

export function createCompetition(body: CompetitionInput) {
  return api<AdminCompetition>('/admin/competitions', { method: 'POST', body })
}

export function updateCompetition(id: string, body: CompetitionInput) {
  return api<AdminCompetition>(base(id), { method: 'PUT', body })
}

export function setPrizeReserve(id: string, body: ReserveInput) {
  return api<PrizeReserve>(`${base(id)}/prize-reserve`, { method: 'PUT', body })
}

export function fundPrizeReserve(id: string, evidenceReference: string) {
  return api<PrizeReserve>(`${base(id)}/prize-reserve/fund`, {
    method: 'POST',
    body: { evidence_reference: evidenceReference },
  })
}

export function scheduleCompetition(id: string) {
  return api<AdminCompetition>(`${base(id)}/schedule`, { method: 'POST' })
}

export function cancelCompetition(id: string, reason: CancelReason, note?: string) {
  return api<AdminCompetition>(`${base(id)}/cancel`, {
    method: 'POST',
    body: { reason, note: note || null },
  })
}

export function freezeCompetition(id: string) {
  return api<AdminCompetition>(`${base(id)}/freeze`, { method: 'POST' })
}

export function finaliseCompetition(id: string) {
  return api<AdminCompetition>(`${base(id)}/finalise`, { method: 'POST' })
}

export function getCompetitionLeaderboard(id: string) {
  return items<CompetitionLeaderRow>(`${base(id)}/leaderboard`)
}

export function getReviewQueue(id: string) {
  return items<ScoreSubmission>(`${base(id)}/review-queue`)
}

export function reviewSubmission(
  id: string,
  submissionId: string,
  status: 'accepted' | 'rejected',
  reason?: string,
) {
  return api<null>(`${base(id)}/submissions/${submissionId}/review`, {
    method: 'POST',
    body: { status, reason: reason || null },
  })
}

export function listWinners(id: string) {
  return items<CompetitionWinner>(`${base(id)}/winners`)
}

export function validateWinner(id: string, winnerId: string) {
  return api<null>(`${base(id)}/winners/${winnerId}/validate`, { method: 'POST' })
}

export function disqualifyWinner(id: string, winnerId: string, reason: string) {
  return api<null>(`${base(id)}/winners/${winnerId}/disqualify`, {
    method: 'POST',
    body: { reason },
  })
}

export function markWinnerUnclaimed(id: string, winnerId: string) {
  return api<null>(`${base(id)}/winners/${winnerId}/unclaimed`, { method: 'POST' })
}

export function verifyClaim(id: string, claimId: string) {
  return api<PrizeClaim>(`${base(id)}/claims/${claimId}/verify`, { method: 'POST' })
}

export function fulfilClaim(id: string, claimId: string) {
  return api<PrizeClaim>(`${base(id)}/claims/${claimId}/fulfil`, { method: 'POST' })
}
