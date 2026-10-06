import { api } from '@/lib/api'
import type { LoginRequest, LoginResponse } from '@/api/auth'
import type {
  Address,
  AddressInput,
  MessageResponse,
  Seller,
  SellerContactRole,
  SellerDetails,
  SellerRegistrationStatus,
  SellerTaxStatus,
  Shop,
  ShopInput,
} from '@/api/types'

export type {
  Address,
  AddressInput,
  Seller,
  SellerContactRole,
  SellerDetails,
  SellerIdentifier,
  SellerRegistrationStatus,
  SellerTaxRegistration,
  SellerTaxStatus,
  Shop,
  ShopInput,
} from '@/api/types'

/** `registered` is the private business address; it is never a delivery origin. */
export type SellerAddressType = 'pickup' | 'return' | 'both' | 'registered'

export type SellerAddressInput = AddressInput & {
  address_type: SellerAddressType
}

export type SellerAddress = Address

export type SellerRegisterRequest = {
  country_id: string
  seller_type?: string
  legal_name: string
  email: string
  password: string
  trading_name?: string
  phone?: string
  image_url?: string
  /**
   * The shop's address_id and return_address_id are ignored here: the API
   * links the first pickup/both address and the first return/both address.
   */
  addresses?: SellerAddressInput[]
  shop?: ShopInput
  local_name?: string
  registration_status?: SellerRegistrationStatus
  /** Required (10+ characters) when registration_status is pending or no_number. */
  registration_note?: string
  /** Only when registration_status is registered; at least one is then required. */
  identifiers?: SellerIdentifierInput[]
  tax_status?: SellerTaxStatus
  /** Only when tax_status is registered; at least one is then required. */
  tax_registrations?: SellerTaxRegistrationInput[]
  contact_name?: string
  contact_role?: SellerContactRole
  contact_job_title?: string
  authority_confirmed?: boolean
  terms_accepted?: boolean
  marketing_opt_in?: boolean
}

export type SellerIdentifierInput = {
  type: string
  value: string
  authority?: string
  jurisdiction?: string
}

export type SellerTaxRegistrationInput = {
  country_id: string
  jurisdiction?: string
  scheme: string
  number: string
}

export type ShopSlugAvailability = {
  /** The slug as the API would store it. */
  slug: string
  available: boolean
}

export type SellerUpdateRequest = {
  country_id: string
  seller_type: string
  legal_name: string
  trading_name?: string
  phone?: string
  image_url?: string | null
}

export function loginSeller(body: LoginRequest) {
  return api<LoginResponse>('/sellers/login', {
    method: 'POST',
    body,
    auth: false,
  })
}

export function registerSeller(body: SellerRegisterRequest) {
  return api<SellerDetails>('/sellers/register', {
    method: 'POST',
    body,
    auth: false,
  })
}

export function verifySellerEmail(email: string, code: string) {
  return api<LoginResponse>('/sellers/verify-email', {
    method: 'POST',
    body: { email, code },
    auth: false,
  })
}

export function resendSellerEmailCode(email: string) {
  return api<MessageResponse>('/sellers/verify-email/resend', {
    method: 'POST',
    body: { email },
    auth: false,
  })
}

export function requestSellerPasswordCode() {
  return api<MessageResponse>('/sellers/me/password/code', { method: 'POST' })
}

export function resetSellerPasswordWithCode(body: { code: string; new_password: string }) {
  return api<MessageResponse>('/sellers/me/password/reset', { method: 'POST', body })
}

export function forgotSellerPassword(email: string) {
  return api<MessageResponse>('/sellers/forgot-password', {
    method: 'POST',
    body: { email },
    auth: false,
  })
}

export function resetForgottenSellerPassword(body: { email: string; code: string; password: string }) {
  return api<MessageResponse>('/sellers/reset-password', {
    method: 'POST',
    body,
    auth: false,
  })
}

export function checkShopSlug(slug: string, signal?: AbortSignal) {
  return api<ShopSlugAvailability>(
    `/sellers/shops/slug-available?slug=${encodeURIComponent(slug)}`,
    { auth: false, signal },
  )
}

export function getSellerMe() {
  return api<SellerDetails>('/sellers/me')
}

export function updateSellerMe(body: SellerUpdateRequest) {
  return api<Seller>('/sellers/me', {
    method: 'PUT',
    body,
  })
}

export function deleteSellerMe() {
  return api<MessageResponse>('/sellers/me', {
    method: 'DELETE',
  })
}

export function addSellerAddress(body: SellerAddressInput) {
  return api<Address>('/sellers/me/addresses', {
    method: 'POST',
    body,
  })
}

export function updateSellerAddress(id: string, body: SellerAddressInput) {
  return api<Address>(`/sellers/me/addresses/${id}`, {
    method: 'PUT',
    body,
  })
}

export function deleteSellerAddress(id: string) {
  return api<MessageResponse>(`/sellers/me/addresses/${id}`, {
    method: 'DELETE',
  })
}

export function createSellerShop(body: ShopInput) {
  return api<Shop>('/sellers/me/shops', {
    method: 'POST',
    body,
  })
}

export function updateSellerShop(id: string, body: ShopInput) {
  return api<Shop>(`/sellers/me/shops/${id}`, {
    method: 'PUT',
    body,
  })
}

export function deleteSellerShop(id: string) {
  return api<MessageResponse>(`/sellers/me/shops/${id}`, {
    method: 'DELETE',
  })
}
