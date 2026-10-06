import { api, ApiError } from '@/lib/api'
import type {
  Admin,
  Country,
  CountryCapability,
  CountryCapabilityEntry,
  CountryCapabilityInput,
  CountryInput,
  CustomerDetails,
  MessageResponse,
  Order,
  Product,
  RecipientDetails,
  SavedGiftDetails,
  SellerDetails,
} from '@/api/types'

export type { Admin } from '@/api/types'

export type AdminUpdateRequest = {
  display_name?: string
  image_url?: string
}

export function getAdminMe() {
  return api<Admin>('/admin/me')
}

export type AdminSellerStatus = 'active' | 'suspended' | 'deleted'

export type AdminSeller = {
  id: string
  legal_name: string
  trading_name?: string
  email: string
  phone?: string
  seller_type: string
  country_name: string
  verification_status: string
  status: AdminSellerStatus
  email_verified_at?: string
  shop_count: number
  created_at: string
}

export async function listAdminSellers(
  status: AdminSellerStatus | '' = '',
  query = '',
  page = 1,
  pageSize = 10,
) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (query) params.set('q', query)
  params.set('limit', String(pageSize))
  params.set('offset', String(Math.max(0, page - 1) * pageSize))
  const suffix = params.size > 0 ? `?${params.toString()}` : ''
  const res = await api<{ items: AdminSeller[] | null; total: number }>(`/admin/sellers${suffix}`)
  return { items: res.items ?? [], total: res.total }
}

export function setAdminSellerVerification(
  id: string,
  status: 'verified' | 'unverified' | 'rejected',
) {
  return api<AdminSeller>(`/admin/sellers/${id}/verification`, {
    method: 'PATCH',
    body: { status },
  })
}

export function setAdminSellerStatus(id: string, status: 'active' | 'suspended') {
  return api<AdminSeller>(`/admin/sellers/${id}/status`, {
    method: 'PATCH',
    body: { status },
  })
}

export type AdminSellerOrder = {
  id: string
  order_number: string
  order_status: string
  delivery_date: string
  shop_name: string
  product_name: string
  quantity: number
  total_amount: number
  fulfilment_status: string
  recipient_name?: string
}

/** Full seller an admin can open: profile, shops, gifts, and order lines. */
export type AdminSellerRecord = SellerDetails & {
  country_name: string
  products: Product[] | null
  orders: AdminSellerOrder[] | null
}

export function getAdminSeller(id: string) {
  return api<AdminSellerRecord>(`/admin/sellers/${id}`)
}

/** Full customer an admin can open: profile, recipients, saved gifts, and orders. */
export type AdminCustomerRecord = CustomerDetails & {
  country_name: string
  recipients: RecipientDetails[] | null
  saved_gifts: SavedGiftDetails[] | null
  orders: Order[] | null
}

export function getAdminCustomer(id: string) {
  return api<AdminCustomerRecord>(`/admin/customers/${id}`)
}

export function updateAdminMe(body: AdminUpdateRequest) {
  return api<Admin>('/admin/me', {
    method: 'PUT',
    body,
  })
}

export function createCountry(body: CountryInput) {
  return api<Country>('/admin/countries', {
    method: 'POST',
    body,
  })
}

export function updateCountry(id: string, body: CountryInput) {
  return api<Country>(`/admin/countries/${id}`, {
    method: 'PUT',
    body,
  })
}

export async function deleteCountry(id: string) {
  try {
    await deleteCountryCapabilities(id)
  } catch (err) {
    // No capability row is fine — the country can still be removed.
    if (!(err instanceof ApiError && err.status === 404)) throw err
  }

  return api<MessageResponse>(`/admin/countries/${id}`, {
    method: 'DELETE',
  })
}

export function listCountryCapabilities() {
  return api<CountryCapabilityEntry[]>('/admin/country-capabilities')
}

export function createCountryCapabilities(countryId: string, body: CountryCapabilityInput) {
  return api<CountryCapability>(`/admin/countries/${countryId}/capabilities`, {
    method: 'POST',
    body,
  })
}

export function updateCountryCapabilities(countryId: string, body: CountryCapabilityInput) {
  return api<CountryCapability>(`/admin/countries/${countryId}/capabilities`, {
    method: 'PUT',
    body,
  })
}

export function deleteCountryCapabilities(countryId: string) {
  return api<MessageResponse>(`/admin/countries/${countryId}/capabilities`, {
    method: 'DELETE',
  })
}
