import { api } from '@/lib/api'
import type { LoginRequest, LoginResponse } from '@/api/auth'

export type AddressInput = {
  country_id: string
  line1: string
  city: string
  label?: string
  address_type?: string
  line2?: string
  region?: string
  postal_code?: string
  latitude?: number
  longitude?: number
  is_default?: boolean
}

export type CustomerAddress = AddressInput & {
  id: string
  created_at?: string
  updated_at?: string
}

export type Customer = {
  id: string
  country_id: string
  email: string
  phone?: string
  display_name?: string
  customer_type: string
  date_of_birth?: string
  age_verified_at?: string
  identity_verified_at?: string
  status: string
  created_at: string
  updated_at: string
}

export type CustomerDetails = Customer & {
  addresses: CustomerAddress[]
}

export type CustomerRegisterRequest = {
  country_id: string
  email: string
  password: string
  phone?: string
  display_name?: string
  customer_type: string
  date_of_birth: string
  addresses?: AddressInput[]
}

export type CustomerUpdateRequest = {
  country_id: string
  phone?: string
  display_name?: string
  customer_type: string
  date_of_birth: string
  status: string
}

export type MessageResponse = {
  message: string
}

export function loginCustomer(body: LoginRequest) {
  return api<LoginResponse>('/customers/login', {
    method: 'POST',
    body,
    auth: false,
  })
}

export function registerCustomer(body: CustomerRegisterRequest) {
  return api<CustomerDetails>('/customers/register', {
    method: 'POST',
    body,
    auth: false,
  })
}

export function getCustomerMe() {
  return api<CustomerDetails>('/customers/me')
}

export function updateCustomerMe(body: CustomerUpdateRequest) {
  return api<CustomerDetails>('/customers/me', {
    method: 'PUT',
    body,
  })
}

export function deleteCustomerMe() {
  return api<MessageResponse>('/customers/me', {
    method: 'DELETE',
  })
}

export function addCustomerAddress(body: AddressInput) {
  return api<CustomerAddress>('/customers/me/addresses', {
    method: 'POST',
    body,
  })
}

export function deleteCustomerAddress(id: string) {
  return api<MessageResponse>(`/customers/me/addresses/${id}`, {
    method: 'DELETE',
  })
}
