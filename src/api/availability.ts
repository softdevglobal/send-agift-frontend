import { api } from '@/lib/api'

export type AvailabilityDestination = {
  line1: string
  line2?: string
  city: string
  region?: string
  postal_code?: string
  country: string
  latitude: number
  longitude: number
}

export type AvailabilityInput = {
  delivery_date?: string
  destination: AvailabilityDestination
}

export type ShopAvailability = {
  shop_id: string
  shop_name: string
  available: boolean
  mode?: 'seller_delivery' | 'courier' | ''
  estimated_days?: number
  sample_product_id?: string
  reason?: string
}

export type AvailabilityResult = {
  shops: ShopAvailability[]
}

/** Which shops can deliver to this address by this date. Public, no login. */
export function checkDeliveryAvailability(body: AvailabilityInput, signal?: AbortSignal) {
  return api<AvailabilityResult>('/shipping/availability', {
    method: 'POST',
    body,
    auth: false,
    signal,
  })
}
