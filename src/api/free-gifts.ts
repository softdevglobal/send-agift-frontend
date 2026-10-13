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
  terms_version?: string
  accepted_at?: string
  created_at: string
  updated_at: string
}

export type FreeGiftProgramInput = {
  budget_cap: number
  currency: string
  status: 'active' | 'paused'
  accept_terms?: boolean
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

export async function listFreeGiftOffers(country = '') {
  const query = country ? `?country=${encodeURIComponent(country)}` : ''
  const res = await api<{ items: FreeGiftOffer[] | null }>(`/free-gifts/products${query}`, {
    auth: false,
  })
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

/** The kill switch for one seller. Re-allowing leaves the program paused. */
export function setFreeGiftSellerStopped(sellerId: string, stopped: boolean) {
  return api<FreeGiftProgram>(`/admin/free-gifts/sellers/${sellerId}`, {
    method: 'PATCH',
    body: { stopped },
  })
}
