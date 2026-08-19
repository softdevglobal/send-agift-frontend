export type Country = {
  id: string
  iso_code: string
  name: string
  default_currency: string
  default_timezone: string
  status: string
  created_at: string
  updated_at: string
}

export type CountryInput = {
  iso_code: string
  name: string
  default_currency: string
  default_timezone: string
  status?: string
}

export type Address = {
  id: string
  country_id: string
  label?: string
  address_type: string
  line1: string
  line2?: string
  city: string
  region?: string
  postal_code?: string
  latitude?: number
  longitude?: number
  is_default: boolean
  created_at: string
  updated_at: string
}

export type AddressInput = {
  country_id: string
  label?: string
  address_type?: string
  line1: string
  line2?: string
  city: string
  region?: string
  postal_code?: string
  latitude?: number
  longitude?: number
  is_default?: boolean
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
  deleted_at?: string
  image_url?: string
}

export type CustomerDetails = Customer & { addresses: Address[] }

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
  image_url?: string
}

export type Shop = {
  id: string
  seller_id: string
  name: string
  slug: string
  description?: string
  customer_visible_location?: string
  status: string
  address_id?: string
  return_address_id?: string
  created_at: string
  updated_at: string
  image_url?: string
}

export type SellerDetails = Seller & { addresses: Address[]; shops: Shop[] }

export type ShopInput = {
  name: string
  slug?: string
  description?: string
  customer_visible_location?: string
  status?: string
  address_id?: string
  return_address_id?: string
  image_url?: string
}

export type ProductStatus = 'draft' | 'published' | 'paused' | 'rejected'

export type CustomerTypeVisibility = 'personal' | 'corporate' | 'both'

export type Product = {
  id: string
  shop_id: string
  name: string
  slug: string
  description?: string | null
  product_type: string
  price_amount: number
  currency: string
  status: ProductStatus
  occasion_tags: string[]
  customer_type_visibility: CustomerTypeVisibility
  points_display_enabled: boolean
  prep_minutes: number
  created_at: string
  updated_at: string
  image_url?: string | null
}

export type Inventory = {
  id: string
  product_id: string
  available_qty: number
  reserved_qty: number
  low_stock_threshold: number
  unavailable_dates: string[]
  updated_at: string
}

export type ProductDetails = Product & { inventory?: Inventory }

export type InventoryInput = {
  available_qty: number
  reserved_qty: number
  low_stock_threshold: number
  unavailable_dates: string[]
}

export type ProductInput = {
  name: string
  slug?: string
  description?: string | null
  product_type?: string
  price_amount?: number
  currency: string
  status?: ProductStatus
  occasion_tags?: string[]
  customer_type_visibility?: CustomerTypeVisibility
  points_display_enabled?: boolean
  prep_minutes?: number
  image_url?: string | null
  inventory?: InventoryInput
}

export type SavedGift = {
  id: string
  customer_id: string
  product_id: string
  created_at: string
}

export type SavedGiftDetails = SavedGift & { product: Product }

export type Admin = {
  id: string
  email: string
  display_name: string
  role: string
  mfa_required: boolean
  status: string
  created_at: string
  updated_at: string
  image_url?: string
}

export type LoginResponse = { token: string; role: string }

export type ErrorBody = { error: string }

export type MessageResponse = { message: string }

export const PRODUCT_STATUSES: ProductStatus[] = [
  'draft',
  'published',
  'paused',
  'rejected',
]

export const PRODUCT_VISIBILITIES: CustomerTypeVisibility[] = [
  'personal',
  'corporate',
  'both',
]

export const KNOWN_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'INR',
  'LKR',
  'AUD',
  'CAD',
  'SGD',
  'AED',
  'JPY',
  'CNY',
  'CHF',
  'NZD',
  'HKD',
  'MYR',
  'THB',
  'IDR',
  'PHP',
  'PKR',
  'BDT',
  'SAR',
] as const

export type KnownCurrency = (typeof KNOWN_CURRENCIES)[number]
