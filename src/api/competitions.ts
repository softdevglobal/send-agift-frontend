import { api, ApiError } from '@/lib/api'

export type CompetitionStatus =
  | 'draft'
  | 'scheduled'
  | 'live'
  | 'paused'
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

/** One country a competition runs in. */
export type CompetitionCountry = {
  id: string
  iso_code: string
  name: string
  default_currency: string
}

/** "New Zealand, Australia" — the countries a competition runs in. */
export function countryNames(c: Pick<AdminCompetition, 'countries'>): string {
  return (c.countries ?? []).map((co) => co.name).join(', ')
}

export type AdminCompetition = {
  id: string
  /** Players from any of these countries may enter. */
  countries: CompetitionCountry[]
  game_version_id: string
  game_version_status: string
  game_slug: string
  game_name: string
  /** `chance` for spin, scratch, treasure, instant win and prize draw. */
  game_type: string
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
  /** Why a draft cannot be published yet; empty once it can. */
  schedule_blockers: string[]
  /** The push notification sent to players in its countries when it was published. */
  announcement?: {
    queued: number
    pending: number
    sent: number
    skipped: number
    failed: number
  }

  // Progressive prize economics. Money is minor units of prize_currency.
  prize_growth_enabled: boolean
  prize_type: PrizeType
  winner_method: 'score' | 'instant' | 'draw' | 'admin_approved'
  /** Instant-win rounds: each play wins with probability 1 in win_odds. */
  win_odds?: number
  /** Points prizes: points each validated winner receives. */
  prize_points?: number
  /** Quiz rounds: the questions with their answers (admins only). */
  quiz_questions?: QuizQuestion[]
  start_prize_cents: number
  increment_per_play_cents: number
  max_prize_cents?: number
  continue_at_cap: boolean
  daily_play_limit?: number
  min_plays_to_win?: number
  current_prize_cents: number
  eligible_play_count: number
  unique_player_count: number
  prize_version: number
  final_prize_cents?: number
  round_no: number
  previous_round_id?: string
  config_version: number
  paused_at?: string
  closed_at?: string
}

/** One quiz question as the server keeps it, answer included. */
export type QuizQuestion = {
  prompt: string
  options: string[]
  correct_index: number
  time_limit_seconds: number
}

export const PRIZE_TYPES = [
  { value: 'cash', label: 'Cash' },
  { value: 'product', label: 'Product' },
  { value: 'voucher', label: 'Voucher' },
  { value: 'gift', label: 'Gift' },
  { value: 'points', label: 'Points' },
  { value: 'other', label: 'Other' },
] as const

export type PrizeType = (typeof PRIZE_TYPES)[number]['value']

export type CompetitionInput = {
  country_ids: string[]
  game_slug: string
  title: string
  starts_at: string
  ends_at: string
  timezone: string
  max_attempts_per_customer: number
  min_age: number
  requires_identity_verification: boolean
  number_of_winners: number
  prize_description: string
  prize_value_amount: number | null
  prize_currency: string | null
  official_rules: string | null
  prize_growth_enabled: boolean
  prize_type: PrizeType
  start_prize_cents: number | null
  increment_per_play_cents: number
  max_prize_cents: number | null
  continue_at_cap: boolean
  daily_play_limit: number | null
  min_plays_to_win: number | null
  win_odds: number | null
  /** Points prizes only: credited to each winner when validated. */
  prize_points: number | null
  quiz_questions: QuizQuestion[] | null
  /** The version being edited; a stale save is refused. */
  config_version?: number
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
  prize_value_cents?: number
  settlement_status: 'pending' | 'settled' | 'failed' | 'not_applicable'
  settlement_reference?: string
  settled_at?: string
}

export type PrizeLedgerEntryType =
  | 'seed'
  | 'play_increment'
  | 'admin_adjustment'
  | 'play_reversal'
  | 'winner_settlement'
  | 'correction'

export type PrizeLedgerEntry = {
  id: string
  seq: number
  competition_id: string
  attempt_id?: string
  winner_id?: string
  entry_type: PrizeLedgerEntryType
  amount_delta_cents: number
  balance_after_cents: number
  reason?: string
  actor_type: 'admin' | 'system' | 'customer'
  actor_id?: string
  created_at: string
}

export type ReconciliationCheck = {
  name: string
  ok: boolean
  expected: number
  actual: number
}

export type Reconciliation = {
  competition_id: string
  status: 'ok' | 'discrepancy'
  ledger_total_cents: number
  current_prize_cents: number
  checks: ReconciliationCheck[]
  checked_at: string
}

export type PrizeLedgerView = {
  entries: PrizeLedgerEntry[]
  reconciliation: Reconciliation
}

/** A chance play's outcome and the draw behind it. */
export type ChanceResult = {
  mechanic: 'spin' | 'scratch' | 'treasure' | 'instant' | 'draw'
  won?: boolean
  odds?: number
  draw?: number
  algorithm?: string
  entered?: boolean
  entry_number?: number
}

export type AdminPlay = {
  id: string
  customer_id: string
  display_name?: string
  attempt_number: number
  status: 'started' | 'submitted' | 'accepted' | 'rejected' | 'voided'
  points_spent: number
  prize_increment_cents: number
  prize_after_cents?: number
  score?: number
  void_reason?: string
  refunded_at?: string
  started_at: string
  result?: ChanceResult
}

export type PlayerActivity = {
  customer_id: string
  display_name?: string
  plays: number
  last_hour: number
}

export type SharedSource = { source: string; accounts: number; plays: number }

export type DrawPick = {
  order: number
  entry_index: number
  play_id: string
  customer_id: string
  outcome: 'winner' | 'skipped_repeat' | 'skipped_ineligible'
  reason?: string
}

/** A prize draw, stored in full so it can be checked. */
export type PrizeDraw = {
  id: string
  entry_count: number
  entries_sha256: string
  random_values: number[]
  picks: DrawPick[]
  algorithm: string
  created_at: string
}

export type CompetitionAnalytics = {
  competition_id: string
  currency?: string
  current_prize_cents: number
  start_prize_cents: number
  prize_growth_cents: number
  max_prize_cents?: number
  max_possible_liability_cents?: number
  valid_plays: number
  voided_plays: number
  unique_players: number
  repeat_players: number
  repeat_play_rate: number
  points_spent: number
  points_refunded: number
  net_points_consumed: number
  increments_cents: number
  adjustments_cents: number
  reversals_cents: number
  corrections_cents: number
  settled_cents: number
  rejected_by_reason: Record<string, number>
  unique_viewers: number
  view_to_play_rate: number
  top_players: PlayerActivity[]
  velocity_alerts: PlayerActivity[]
  shared_devices: SharedSource[]
  shared_networks: SharedSource[]
  reconciliation_status: 'ok' | 'discrepancy' | 'not_run'
  reconciliation_checked_at?: string
}

const base = (id: string) => `/admin/competitions/${id}`

async function items<T>(path: string, init?: Parameters<typeof api>[1]) {
  const res = await api<{ items: T[] | null }>(path, init)
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

export function pauseCompetition(id: string) {
  return api<AdminCompetition>(`${base(id)}/pause`, { method: 'POST' })
}

export function resumeCompetition(id: string) {
  return api<AdminCompetition>(`${base(id)}/resume`, { method: 'POST' })
}

export function closeCompetition(id: string) {
  return api<AdminCompetition>(`${base(id)}/close`, { method: 'POST' })
}

/** A ledger entry, never an edit: e.g. $200 → $250 is +5000 cents with a reason. */
export function adjustPrize(id: string, amountDeltaCents: number, reason: string) {
  return api<PrizeLedgerEntry>(`${base(id)}/prize-adjustments`, {
    method: 'POST',
    body: { amount_delta_cents: amountDeltaCents, reason },
  })
}

export function voidPlay(
  id: string,
  playId: string,
  body: { reason: string; refund_points: boolean; reverse_prize: boolean },
) {
  return api<null>(`${base(id)}/plays/${playId}/void`, { method: 'POST', body })
}

export function settleWinners(id: string, reference?: string) {
  return items<CompetitionWinner>(`${base(id)}/settle`, {
    method: 'POST',
    body: { reference: reference || null },
  })
}

export function getPrizeLedger(id: string) {
  return api<PrizeLedgerView>(`${base(id)}/ledger`)
}

export function listPlays(id: string, limit = 200) {
  return items<AdminPlay>(`${base(id)}/plays?limit=${limit}`)
}

export function reconcilePrize(id: string) {
  return api<Reconciliation>(`${base(id)}/reconcile`, { method: 'POST' })
}

export function getCompetitionAnalytics(id: string) {
  return api<CompetitionAnalytics>(`${base(id)}/analytics`)
}

/** Picks a closed prize draw's winners and finalises the round. */
export function runDraw(id: string) {
  return api<AdminCompetition>(`${base(id)}/draw`, { method: 'POST' })
}

export async function getDraw(id: string): Promise<PrizeDraw | null> {
  try {
    return await api<PrizeDraw>(`${base(id)}/draw`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

/** True for spin, scratch, treasure, instant win and prize draw. */
export function isChanceGame(slug: string): boolean {
  return CHANCE_GAMES.has(slug)
}

export const CHANCE_GAMES = new Set(['spin-wheel', 'scratch-card', 'treasure-hunt', 'instant-win', 'prize-draw'])
