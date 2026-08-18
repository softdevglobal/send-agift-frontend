import { api } from '@/lib/api'
import type { LoginRequest, LoginResponse } from '@/api/auth'
import type {
  Address,
  AddressInput,
  Customer,
  CustomerDetails,
  MessageResponse,
} from '@/api/types'

export type {
  Address,
  AddressInput,
  Customer,
  CustomerDetails,
} from '@/api/types'

export type CustomerAddress = Address

export type CustomerRegisterRequest = {
  country_id: string
  email: string
  password: string
  phone?: string
  display_name?: string
  customer_type?: string
  date_of_birth?: string
  image_url?: string
  addresses?: AddressInput[]
}

export type CustomerUpdateRequest = {
  country_id: string
  phone?: string
  display_name?: string
  customer_type: string
  date_of_birth?: string
  status: string
  image_url?: string
}

export type { MessageResponse }

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
  return api<Customer>('/customers/me', {
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
  return api<Address>('/customers/me/addresses', {
    method: 'POST',
    body,
  })
}

export function deleteCustomerAddress(id: string) {
  return api<MessageResponse>(`/customers/me/addresses/${id}`, {
    method: 'DELETE',
  })
}
