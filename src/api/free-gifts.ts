import { ApiError, api } from '@/lib/api'
import type { OrderDetails } from '@/api/types'

/**
 * The first free gift program: every customer has one free gift to send,
 * funded by a seller's marketing budget. The client never decides who is
 * eligible. It shows what these endpoints return.
 */

/** A product that can be sent as a free gift right now. */
export type FreeGiftOffer = {
  product_id: string
  name: string
  slug: string
  description?: string | null
  image_url?: string | null
  /** Minor units of `currency`. What the seller funds; the customer pays 0. */
  price_amount: number
  currency: string
  shop_id: string
  shop_name: string
  shop_slug: string
  country_id: string
}

export type FreeGiftRecipientReason =
  | 'SELF_GIFT'
  | 'RECIPIENT_CONTACT_REQUIRED'
  | 'RECIPIENT_ALREADY_USED'

export type FreeGiftStatus = {
  /** Still there, and nothing stands in the way of sending it. */
  available: boolean
  used: boolean
  /** "email", "phone" or both, when they are not verified. */
  missing: ('email' | 'phone')[]
  /** On hold for a few days after an email change. */
  locked: boolean
  recipient?: {
    id: string
    can_receive: boolean
    reason: FreeGiftRecipientReason | null
  }
}

export type SendFreeGiftInput = {
  product_id: string
  recipient_id: string
  country_id: string
  /** yyyy-mm-dd */
  delivery_date: string
  gift_message?: string
}

export type FreeGiftProgramStatus = 'active' | 'paused' | 'stopped' | 'not_set'

/** One seller's free gift budget. Amounts are minor units of `currency`. */
export type FreeGiftProgram = {
  seller_id: string
  status: FreeGiftProgramStatus
  currency: string
  budget_cap: number
  /** Promised to gifts that are confirmed but not delivered yet. */
  budget_held: number
  budget_spent: number
  budget_remaining: number
  /** The seller has agreed to the marketing budget SendAGift sets. */
  seller_agreed: boolean
  terms_version?: string
  accepted_at?: string
  created_at: string
  updated_at: string
}

/**
 * What a seller can change: turn their program on or pause it. The budget is
 * set by SendAGift, so there is no amount here. `accept_terms` is only for a
 * seller who registered before the agreement existed.
 */
export type FreeGiftProgramInput = {
  /** Left out to only record the agreement. */
  status?: 'active' | 'paused'
  accept_terms?: boolean
}

/** What an admin sets for one seller: the marketing budget, and whether it is on. */
export type AdminFreeGiftProgramInput = {
  budget_cap: number
  currency: string
  status: 'active' | 'paused'
}

/** One free gift that was sent, as an admin reads it. Amounts are minor units. */
export type AdminFreeGiftOrder = {
  order_id: string
  order_number: string
  status: string
  /** held (not delivered yet), spent (delivered) or released (cancelled). */
  budget_status: 'held' | 'spent' | 'released' | 'none'
  created_at: string
  delivery_date: string
  currency: string
  /** What it cost the seller's budget: the product price. */
  cost: number
  product_amount: number
  /** What the customer paid for delivery. */
  delivery_amount: number
  /** The delivery payment went through, or there was none to pay. */
  delivery_paid: boolean
  seller_id: string
  seller_name: string
  shop_name: string
  customer_id: string
  customer_name: string
  customer_email: string
  recipient_name?: string | null
  recipient_city?: string | null
  product_id: string
  product_name: string
  product_image_url?: string | null
}

/** Narrows the free gifts to what a shop can deliver to a place on a day. */
export type FreeGiftFilter = {
  country?: string
  latitude?: number
  longitude?: number
  /** yyyy-mm-dd */
  deliveryDate?: string
}

export type FreeGiftProduct = {
  product_id: string
  seller_id: string
  status: 'active' | 'paused'
  /** null = no cap of its own; the budget is the only limit. */
  gifts_cap: number | null
  gifts_count: number
  created_at: string
  updated_at: string
  product_name: string
  product_image_url?: string | null
  product_status: string
  price_amount: number
  currency: string
  shop_name: string
  /** null when stock was never set on the product. */
  stock_left: number | null
}

export type AdminFreeGiftProgram = FreeGiftProgram & {
  seller_name: string
  seller_email: string
  products: number
  gifts_sent: number
}

/** The `code` on a refusal, e.g. FREE_GIFT_DISABLED or ALREADY_USED. */
export function freeGiftErrorCode(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null
  const body = error.body
  if (typeof body === 'object' && body !== null && 'code' in body) {
    const code = (body as { code?: unknown }).code
    return typeof code === 'string' ? code : null
  }
  return null
}

/** True when the program is switched off on the server. */
export function isFreeGiftDisabled(error: unknown): boolean {
  return freeGiftErrorCode(error) === 'FREE_GIFT_DISABLED'
}

// ─── Public and customer ──────────────────────────────────────────────────

export async function listFreeGiftOffers(filter: FreeGiftFilter = {}) {
  const params = new URLSearchParams()
  if (filter.country) params.set('country', filter.country)
  if (filter.latitude !== undefined && filter.longitude !== undefined) {
    params.set('latitude', String(filter.latitude))
    params.set('longitude', String(filter.longitude))
  }
  if (filter.deliveryDate) params.set('delivery_date', filter.deliveryDate)
  const query = params.toString()
  const res = await api<{ items: FreeGiftOffer[] | null }>(
    `/free-gifts/products${query ? `?${query}` : ''}`,
    { auth: false },
  )
  return res.items ?? []
}

export function getFreeGiftStatus(recipientId = '') {
  const query = recipientId ? `?recipient_id=${encodeURIComponent(recipientId)}` : ''
  return api<FreeGiftStatus>(`/customers/me/free-gift${query}`)
}

/**
 * Sends the free gift and creates its order. The key makes a retry (or a
 * double click) return the first order instead of a refusal.
 */
export function sendFreeGift(body: SendFreeGiftInput, idempotencyKey: string) {
  return api<OrderDetails>('/customers/me/free-gifts', {
    method: 'POST',
    body,
    headers: { 'Idempotency-Key': idempotencyKey },
  })
}

// ─── Seller ───────────────────────────────────────────────────────────────

export function getFreeGiftProgram() {
  return api<FreeGiftProgram>('/sellers/me/free-gift-program')
}

export function setFreeGiftProgram(body: FreeGiftProgramInput) {
  return api<FreeGiftProgram>('/sellers/me/free-gift-program', { method: 'PUT', body })
}

export async function listFreeGiftProducts() {
  const res = await api<{ items: FreeGiftProduct[] | null }>('/sellers/me/free-gift-products')
  return res.items ?? []
}

export function setFreeGiftProduct(
  productId: string,
  body: { gifts_cap: number | null; status: 'active' | 'paused' },
) {
  return api<FreeGiftProduct>(`/sellers/me/free-gift-products/${productId}`, {
    method: 'PUT',
    body,
  })
}

export function removeFreeGiftProduct(productId: string) {
  return api<null>(`/sellers/me/free-gift-products/${productId}`, { method: 'DELETE' })
}

// ─── Admin ────────────────────────────────────────────────────────────────

export async function listFreeGiftPrograms() {
  const res = await api<{ items: AdminFreeGiftProgram[] | null }>('/admin/free-gifts')
  return res.items ?? []
}

/** Sets a seller's marketing budget and starts or pauses their program. */
export function setAdminFreeGiftProgram(sellerId: string, body: AdminFreeGiftProgramInput) {
  return api<FreeGiftProgram>(`/admin/free-gifts/sellers/${sellerId}/program`, {
    method: 'PUT',
    body,
  })
}

/** Every free gift sent: seller, customer, recipient, product and cost. */
export async function listAdminFreeGiftOrders(sellerId = '') {
  const query = sellerId ? `?seller_id=${encodeURIComponent(sellerId)}` : ''
  const res = await api<{ items: AdminFreeGiftOrder[] | null }>(`/admin/free-gifts/orders${query}`)
  return res.items ?? []
}

/** The budget set for every seller in one country. `budget_cap` is per seller. */
export type FreeGiftCountryBudget = {
  country_id: string
  country_name: string
  currency: string
  budget_cap: number
  status: 'active' | 'paused'
  updated_at: string
  /** Sellers registered in the country, and how many have agreed. */
  sellers: number
  agreed: number
}

/** What setting a country budget did. Skipped sellers are counted, not failed. */
export type FreeGiftCountryApply = {
  budget: FreeGiftCountryBudget
  applied: number
  skipped_not_agreed: number
  skipped_stopped: number
  skipped_below_committed: number
  skipped_currency_locked: number
}

export async function listFreeGiftCountryBudgets() {
  const res = await api<{ items: FreeGiftCountryBudget[] | null }>('/admin/free-gifts/countries')
  return res.items ?? []
}

/** One budget for every seller registered in a country. */
export function setFreeGiftCountryBudget(countryId: string, body: AdminFreeGiftProgramInput) {
  return api<FreeGiftCountryApply>(`/admin/free-gifts/countries/${countryId}`, {
    method: 'PUT',
    body,
  })
}

/** The kill switch for one seller. Re-allowing leaves the program paused. */
export function setFreeGiftSellerStopped(sellerId: string, stopped: boolean) {
  return api<FreeGiftProgram>(`/admin/free-gifts/sellers/${sellerId}`, {
    method: 'PATCH',
    body: { stopped },
  })
}
