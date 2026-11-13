import { api } from '@/lib/api'

/** Minor units as money, e.g. 1000 USD → "$10.00". */
export function formatCents(cents: number, currency = 'USD') {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100)
}

/** "1 game entry", "3 game entries". */
export function entriesLabel(n: number) {
  return `${new Intl.NumberFormat().format(n)} game ${n === 1 ? 'entry' : 'entries'}`
}

// ─── States ────────────────────────────────────────────────────────────────

export type State = {
  id: string
  country_id: string
  code: string
  name: string
  is_active: boolean
}

/** The active states of a country, for sign-up and the profile. */
export async function listStates(countryId: string) {
  const res = await api<{ items: State[] }>(`/countries/${countryId}/states`)
  return res.items ?? []
}

/**
 * Turns a state picked from Google Places into one of ours, adding it to the
 * country's list the first time. The answer's id is what sign-up and
 * PUT /customers/me/state take as state_id.
 */
export function resolveState(countryId: string, placeId: string) {
  return api<State>('/states/resolve', {
    method: 'POST',
    body: { country_id: countryId, place_id: placeId },
    auth: false,
  })
}

export type CustomerState = {
  country_id: string
  state: State | null
  state_set_at?: string | null
  state_source?: 'declared' | 'address' | 'admin' | null
  /** True when the customer's country has states and they have not given one. */
  state_required: boolean
  can_change_at?: string | null
  phone_verified: boolean
}

export function getMyState() {
  return api<CustomerState>('/customers/me/state')
}

export function setMyState(stateId: string) {
  return api<CustomerState>('/customers/me/state', { method: 'PUT', body: { state_id: stateId } })
}

// ─── Customer: game entries ────────────────────────────────────────────────

export type EntryType =
  | 'purchase_grant'
  | 'purchase_reversal'
  | 'play_debit'
  | 'play_refund'
  | 'free_entry'
  | 'admin_grant'
  | 'admin_deduction'

export type EntryGate = {
  allowed: boolean
  code?: string
  message?: string
  min_age?: number
  official_rules?: string | null
  free_entries_per_day: number
}

export type GameEntryRow = {
  id: string
  entry_type: EntryType
  delta: number
  balance_after: number
  description: string
  order_id?: string
  order_number?: string
  product_name?: string
  competition_id?: string
  competition_title?: string
  reason?: string
  created_at: string
}

export type GameEntriesWallet = {
  balance: number
  totals: { earned: number; spent: number; reversed: number; pending: number }
  history: GameEntryRow[]
  earn?: EntryGate
  play?: EntryGate
}

export function getMyGameEntries() {
  return api<GameEntriesWallet>('/customers/me/game-entries')
}

export type EntryOffers = {
  offers: { product_id: string; game_entries: number; reason?: string }[]
  total_game_entries: number
  allowed: boolean
  message?: string
}

/** What each product would earn the signed-in customer, worked out on the server. */
export function getEntryOffers(productIds: string[]) {
  return api<EntryOffers>('/customers/me/game-entries/offers', {
    method: 'POST',
    body: { product_ids: productIds },
  })
}

export function claimFreeEntries() {
  return api<{ granted: number; balance: number; message: string }>('/customers/me/game-entries/free', {
    method: 'POST',
  })
}

// ─── Advertising packages ──────────────────────────────────────────────────

export type AdPackageStatus = 'draft' | 'published' | 'retired'

export type AdPackage = {
  id: string
  package_key: string
  version: number
  country_id: string
  country_name?: string
  name: string
  description?: string | null
  currency: string
  price_minor: number
  product_slots: number
  /** Entries a customer earns per purchase at each level, top level first. */
  level_entries: number[]
  entries_pool: number
  validity_days: number
  status: AdPackageStatus
  published_at?: string | null
  retired_at?: string | null
  created_at: string
  purchases: number
}

export type AdPackageInput = {
  country_id: string
  name: string
  description: string | null
  currency: string
  price_minor: number
  level_entries: number[]
  entries_pool: number
  validity_days: number
}

export type AdPurchaseStatus =
  | 'pending'
  | 'active'
  | 'exhausted'
  | 'expired'
  | 'cancelled'
  | 'failed'
  | 'refunded'

export type AdPromotion = {
  id: string
  purchase_id: string
  product_id: string
  product_name: string
  product_image_url?: string | null
  /** 1 is the top level; 0 means the product is no longer on the list. */
  level: number
  entries_per_purchase: number
  entries_granted: number
  orders_count: number
  removed_at?: string | null
}

export type AdPurchase = {
  id: string
  seller_id: string
  seller_name?: string
  seller_email?: string
  package_id: string
  package_name: string
  currency: string
  price_minor: number
  product_slots: number
  level_entries: number[]
  entries_pool: number
  validity_days: number
  status: AdPurchaseStatus
  entries_used: number
  entries_held: number
  provider: string
  provider_reference?: string
  checkout_url?: string
  paid_amount_minor?: number
  failure_reason?: string
  paid_at?: string | null
  expires_at?: string | null
  ended_at?: string | null
  created_at: string
  usage_percent: number
  promotions?: AdPromotion[]
}

export type AdReminder = {
  id: string
  purchase_id: string
  package_name: string
  threshold: number
  usage_percent: number
  kind: 'auto' | 'resend'
  message: string
  read_at?: string | null
  created_at: string
}

export type SellerAdvertising = {
  purchases: AdPurchase[]
  reminders: AdReminder[]
  packages: AdPackage[]
}

export const AD_PURCHASE_LABEL: Record<AdPurchaseStatus, string> = {
  pending: 'Waiting for payment',
  active: 'Active',
  exhausted: 'Budget used up',
  expired: 'Ended',
  cancelled: 'Cancelled',
  failed: 'Payment failed',
  refunded: 'Refunded',
}

/** "High", "Medium", "Low" for three levels; "Level 1…n" otherwise. */
export function levelName(level: number, slots: number) {
  if (slots === 3) return ['High', 'Medium', 'Low'][level - 1] ?? `Level ${level}`
  if (slots === 2) return ['High', 'Low'][level - 1] ?? `Level ${level}`
  if (slots === 1) return 'Promoted'
  return `Level ${level}`
}

export function getSellerAdvertising() {
  return api<SellerAdvertising>('/sellers/me/advertising')
}

export function buyAdPackage(packageId: string, idempotencyKey: string) {
  return api<AdPurchase>('/sellers/me/advertising/purchases', {
    method: 'POST',
    body: { package_id: packageId, idempotency_key: idempotencyKey },
  })
}

export function cancelAdPurchase(id: string) {
  return api<AdPurchase>(`/sellers/me/advertising/purchases/${id}/cancel`, { method: 'POST' })
}

export function syncAdPurchase(id: string) {
  return api<AdPurchase>(`/sellers/me/advertising/purchases/${id}/sync`, { method: 'POST' })
}

export function testPayAdPurchase(id: string) {
  return api<AdPurchase>(`/sellers/me/advertising/purchases/${id}/test-payment`, { method: 'POST' })
}

export function setAdPromotions(id: string, promotions: { product_id: string; level: number }[]) {
  return api<AdPurchase>(`/sellers/me/advertising/purchases/${id}/promotions`, {
    method: 'PUT',
    body: { promotions },
  })
}

export function markAdRemindersRead() {
  return api<{ ok: boolean }>('/sellers/me/advertising/reminders/read', { method: 'POST' })
}

// ─── Admin: advertising ────────────────────────────────────────────────────

export async function listAdminAdPackages() {
  const res = await api<{ items: AdPackage[] }>('/admin/advertising/packages')
  return res.items ?? []
}

export const createAdPackage = (body: AdPackageInput) =>
  api<AdPackage>('/admin/advertising/packages', { method: 'POST', body })

export const updateAdPackage = (id: string, body: AdPackageInput) =>
  api<AdPackage>(`/admin/advertising/packages/${id}`, { method: 'PUT', body })

export const deleteAdPackage = (id: string) =>
  api<{ ok: boolean }>(`/admin/advertising/packages/${id}`, { method: 'DELETE' })

export const adPackageAction = (id: string, action: 'publish' | 'retire' | 'new-version') =>
  api<AdPackage>(`/admin/advertising/packages/${id}/${action}`, { method: 'POST' })

export async function listAdminAdPurchases(status: AdPurchaseStatus | '' = '') {
  const res = await api<{ items: AdPurchase[] }>(
    `/admin/advertising/purchases${status ? `?status=${status}` : ''}`,
  )
  return res.items ?? []
}

export const confirmAdPurchase = (id: string, reference: string) =>
  api<AdPurchase>(`/admin/advertising/purchases/${id}/confirm`, { method: 'POST', body: { reference } })

export const resendAdReminder = (id: string) =>
  api<AdReminder>(`/admin/advertising/purchases/${id}/reminder`, { method: 'POST' })

// ─── Admin: where games are on ─────────────────────────────────────────────

export type SwitchState = 'OFF' | 'ON' | 'STOPPED'

export type EntryProgram = {
  enabled: boolean
  stopped_at?: string | null
  stopped_reason?: string | null
  state: SwitchState
}

export type Jurisdiction = {
  id: string
  country_id: string
  country_name: string
  state_id?: string | null
  state_name?: string | null
  earning_enabled: boolean
  play_enabled: boolean
  chance_games_enabled: boolean
  min_age: number
  official_rules?: string | null
  customer_daily_cap?: number | null
  product_daily_cap?: number | null
  free_entries_per_day: number
  stopped_at?: string | null
  stopped_reason?: string | null
  game_ids: string[]
  state: SwitchState
  updated_at: string
}

export type JurisdictionInput = {
  country_id: string
  state_id: string | null
  earning_enabled: boolean
  play_enabled: boolean
  chance_games_enabled: boolean
  min_age: number
  official_rules: string | null
  customer_daily_cap: number | null
  product_daily_cap: number | null
  free_entries_per_day: number
  game_ids: string[]
}

export type GamesControl = { program: EntryProgram; jurisdictions: Jurisdiction[] }

export const getGamesControl = () => api<GamesControl>('/admin/games-control')

export const setProgram = (enabled: boolean, reason: string) =>
  api<GamesControl>('/admin/games-control/program', { method: 'PUT', body: { enabled, reason } })

export const stopProgram = (reason: string) =>
  api<GamesControl>('/admin/games-control/program/stop', { method: 'POST', body: { reason } })

export const saveJurisdiction = (body: JurisdictionInput) =>
  api<Jurisdiction>('/admin/games-control/jurisdictions', { method: 'PUT', body })

export const stopJurisdiction = (id: string, reason: string) =>
  api<GamesControl>(`/admin/games-control/jurisdictions/${id}/stop`, { method: 'POST', body: { reason } })

export const liftJurisdiction = (id: string, reason: string) =>
  api<GamesControl>(`/admin/games-control/jurisdictions/${id}/lift`, { method: 'POST', body: { reason } })

export async function listAdminStates(countryId: string) {
  const res = await api<{ items: State[] }>(`/admin/countries/${countryId}/states`)
  return res.items ?? []
}

export type StateInput = { country_id?: string; code: string; name: string; is_active: boolean }

export const createState = (body: StateInput) => api<State>('/admin/states', { method: 'POST', body })
export const updateState = (id: string, body: StateInput) =>
  api<State>(`/admin/states/${id}`, { method: 'PUT', body })
export const deleteState = (id: string) => api<{ ok: boolean }>(`/admin/states/${id}`, { method: 'DELETE' })

// ─── Admin: customers and review ───────────────────────────────────

export type CustomerEntriesSummary = {
  customer_id: string
  email: string
  display_name?: string
  country_name: string
  state_name?: string
  status: string
  balance: number
  created_at: string
}

export async function searchCustomers(query: string, signal?: AbortSignal) {
  const res = await api<{ items: CustomerEntriesSummary[] }>(
    `/admin/customers${query ? `?q=${encodeURIComponent(query)}` : ''}`,
    { signal },
  )
  return res.items ?? []
}

export function getCustomerGameEntries(customerId: string) {
  return api<GameEntriesWallet>(`/admin/customers/${customerId}/game-entries`)
}

export function adjustCustomerGameEntries(
  customerId: string,
  body: { amount: number; reason: string; idempotency_key: string },
) {
  return api<GameEntriesWallet>(`/admin/customers/${customerId}/game-entries/adjustments`, {
    method: 'POST',
    body,
  })
}

export type EntryShortfall = {
  id: string
  customer_id: string
  customer_email: string
  customer_name?: string | null
  order_id: string
  order_number?: string | null
  entries_granted: number
  entries_recovered: number
  entries_short: number
  status: 'open' | 'resolved'
  resolution?: string | null
  resolved_at?: string | null
  created_at: string
}

export async function listShortfalls(status: 'open' | 'resolved' | '' = '') {
  const res = await api<{ items: EntryShortfall[] }>(
    `/admin/game-entries/shortfalls${status ? `?status=${status}` : ''}`,
  )
  return res.items ?? []
}

export const resolveShortfall = (id: string, resolution: string) =>
  api<{ ok: boolean }>(`/admin/game-entries/shortfalls/${id}/resolve`, {
    method: 'POST',
    body: { resolution },
  })
