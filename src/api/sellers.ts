import { api } from '@/lib/api'
import type { LoginRequest, LoginResponse } from '@/api/auth'

type MessageResponse = {
  message: string
}

export type SellerAddressType = 'pickup' | 'return' | 'both'

export type SellerAddressInput = {
  country_id: string
  line1: string
  city: string
  address_type: SellerAddressType
  label?: string
  line2?: string
  region?: string
  postal_code?: string
  latitude?: number
  longitude?: number
  is_default?: boolean
}

export type SellerAddress = SellerAddressInput & {
  id: string
  created_at?: string
  updated_at?: string
}

export type ShopInput = {
  name: string
  slug?: string
  description?: string
  return_address_mode?: string
  customer_visible_location?: string
  status?: string
  address_id?: string
}

export type Shop = ShopInput & {
  id: string
  created_at?: string
  updated_at?: string
}

export type Seller = {
  id: string
  country_id: string
  seller_type: string
  legal_name: string
  trading_name?: string
  email: string
  phone?: string
  verification_status: string
  status: string
  created_at: string
  updated_at: string
}

export type SellerDetails = Seller & {
  addresses: SellerAddress[]
  shops: Shop[]
}

export type SellerRegisterRequest = {
  country_id: string
  seller_type: string
  legal_name: string
  email: string
  password: string
  trading_name?: string
  phone?: string
  addresses?: SellerAddressInput[]
  shop?: ShopInput
}

export type SellerUpdateRequest = {
  country_id: string
  seller_type: string
  legal_name: string
  trading_name?: string
  phone?: string
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

export function getSellerMe() {
  return api<SellerDetails>('/sellers/me')
}

export function updateSellerMe(body: SellerUpdateRequest) {
  return api<SellerDetails>('/sellers/me', {
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
  return api<SellerAddress>('/sellers/me/addresses', {
    method: 'POST',
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
