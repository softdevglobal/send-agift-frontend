import { api } from '@/lib/api'
import type { Product, Shop } from '@/api/types'

export type MarketplaceCustomerType = 'personal' | 'corporate'

export function listPublicShops() {
  return api<Shop[]>('/shops', { auth: false })
}

export function listPublicShopProducts(
  shopId: string,
  customerType: MarketplaceCustomerType = 'personal',
) {
  const query = new URLSearchParams({ customer_type: customerType })
  return api<Product[]>(`/shops/${shopId}/products?${query.toString()}`, {
    auth: false,
  })
}
