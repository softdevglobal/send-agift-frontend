import { api } from '@/lib/api'
import type { LoginRequest, LoginResponse } from '@/api/auth'
import type {
  Address,
  AddressInput,
  MessageResponse,
  Seller,
  SellerApplication,
  SellerDetails,
  Shop,
  ShopInput,
} from '@/api/types'

export type {
  Address,
  AddressInput,
  Seller,
  SellerDetails,
  Shop,
  ShopInput,
} from '@/api/types'

export type SellerAddressType = 'pickup' | 'return' | 'both'

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
  addresses?: SellerAddressInput[]
  shop?: ShopInput
  /** The full application for admin review. */
  application?: SellerApplication
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

export type VerifySellerEmailResponse = {
  token: string
  role: 'seller'
  verification_status: string
}

/** Confirms the seller's email with the 6-digit code; signs them in. */
export function verifySellerEmail(email: string, code: string) {
  return api<VerifySellerEmailResponse>('/sellers/verify-email', {
    method: 'POST',
    body: { email, code },
    auth: false,
  })
}

/** Emails a fresh code. Answers the same for unknown emails. */
export function resendSellerEmailCode(email: string) {
  return api<MessageResponse>('/sellers/verify-email/resend', {
    method: 'POST',
    body: { email },
    auth: false,
  })
}

/** Saves the uploaded business registration document on the application. */
export function attachSellerDocument(body: { key: string; name: string; content_type: string }) {
  return api<MessageResponse>('/sellers/me/application/document', {
    method: 'PUT',
    body,
  })
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
