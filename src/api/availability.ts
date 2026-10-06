import { api } from '@/lib/api'

export type ShopGiftAvailability = {
  shop_id: string
  shop_name: string
  seller_verification_status?: string
  distance_km?: number
  max_km: number
  price_amount: number
  currency?: string
  is_free: boolean
  estimated_days: number
  cutoff_time?: string
  estimated_delivery_date?: string
  product_ids: string[]
  products: AvailabilityProduct[]
}

/** A published gift returned by the zone search, enough to draw a card. */
export type AvailabilityProduct = {
  id: string
  shop_id: string
  name: string
  slug: string
  description?: string | null
  price_amount: number
  currency: string
  image_url?: string | null
  occasion_tags: string[]
  status: 'published'
  stock_left?: number
}

export type GiftAvailability = {
  latitude: number
  longitude: number
  delivery_date?: string
  shops: ShopGiftAvailability[]
}

/** Gifts a delivery zone can reach for the Find gifts search. */
export function searchGiftAvailability(input: {
  latitude: number
  longitude: number
  deliveryDate?: string
  customerType?: 'personal' | 'corporate'
}) {
  const query = new URLSearchParams({
    latitude: String(input.latitude),
    longitude: String(input.longitude),
  })
  if (input.deliveryDate) query.set('delivery_date', input.deliveryDate)
  if (input.customerType) query.set('customer_type', input.customerType)
  return api<GiftAvailability>(`/availability?${query.toString()}`, { auth: false })
}
