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

export const COUNTRY_CAPABILITY_FLAGS = [
  'customer_registration_enabled',
  'seller_registration_enabled',
  'seller_payouts_enabled',
  'domestic_delivery_enabled',
  'international_delivery_enabled',
  'memberships_enabled',
  'points_earning_enabled',
  'points_usage_enabled',
  'skill_competitions_enabled',
  'app_store_available',
] as const

export type CountryCapabilityFlag = (typeof COUNTRY_CAPABILITY_FLAGS)[number]

export type CountryCapabilityInput = Record<CountryCapabilityFlag, boolean>

export const DEFAULT_COUNTRY_CAPABILITY_INPUT: CountryCapabilityInput = {
  customer_registration_enabled: true,
  seller_registration_enabled: true,
  seller_payouts_enabled: true,
  domestic_delivery_enabled: true,
  international_delivery_enabled: true,
  memberships_enabled: true,
  points_earning_enabled: true,
  points_usage_enabled: true,
  skill_competitions_enabled: false,
  app_store_available: true,
}

export type CountryCapability = CountryCapabilityInput & {
  id: string
  country_id: string
  rule_version: number
  created_at: string
  updated_at: string
}

export type CountryCapabilityEntry = {
  country: Country
  capability: CountryCapability
}

export type Address = {
  id: string
  country_id: string
  label?: string | null
  address_type: string
  line1: string
  line2?: string | null
  city: string
  region?: string | null
  postal_code?: string | null
  latitude?: number | null
  longitude?: number | null
  is_default: boolean
  created_at: string
  updated_at: string
}

export type AddressInput = {
  country_id: string
  label?: string | null
  address_type?: string
  line1: string
  line2?: string | null
  city: string
  region?: string | null
  postal_code?: string | null
  latitude?: number | null
  longitude?: number | null
  is_default?: boolean
}

export type PlaceSuggestion = {
  place_id: string
  description: string
  main_text: string
  secondary_text: string
}

export type PlaceAutocompleteResponse = {
  suggestions: PlaceSuggestion[]
}

/** A Google place already split into the fields an AddressInput expects. */
export type PlaceDetails = {
  place_id: string
  name?: string
  formatted_address: string
  line1: string
  line2?: string
  city: string
  region?: string
  postal_code?: string
  country_code?: string
  country_name?: string
  latitude?: number
  longitude?: number
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
  address_id?: string | null
  return_address_id?: string | null
  image_url?: string | null
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

export type Recipient = {
  id: string
  customer_id: string
  name: string
  relationship?: string | null
  email?: string | null
  phone?: string | null
  image_url?: string | null
  default_address_id?: string | null
  preferences: unknown
  created_at: string
  updated_at: string
}

export type RecipientAddress = {
  id: string
  recipient_id: string
  country_id: string
  /** ISO 2 when the API includes it (e.g. "AU"). */
  country?: string | null
  iso_code?: string | null
  country_code?: string | null
  label?: string | null
  address_type: string
  line1: string
  line2?: string | null
  city: string
  region?: string | null
  postal_code?: string | null
  latitude?: number | null
  longitude?: number | null
  is_default: boolean
  created_at: string
  updated_at: string
}

export type RecipientDetails = Recipient & { addresses: RecipientAddress[] }

export type RecipientInput = {
  name: string
  relationship?: string | null
  email?: string | null
  phone?: string | null
  image_url?: string | null
  default_address_id?: string | null
  preferences?: Record<string, unknown>
  /** Create only. Ignored on PUT — use recipient address endpoints. */
  addresses?: AddressInput[]
}

export const MEDIA_FOLDERS = ['seller-profile', 'shop-image', 'product-image'] as const

export type MediaFolder = (typeof MEDIA_FOLDERS)[number]

export type PresignUploadRequest = {
  filename: string
  content_type: string
  folder: MediaFolder
}

export type PresignUploadResponse = {
  upload_url: string
  key: string
  public_url: string
}

export type SavedGift = {
  id: string
  customer_id: string
  product_id: string
  created_at: string
}

export type SavedGiftDetails = SavedGift & { product: Product }

export const ORDER_STATUSES = [
  'draft',
  'pending_payment',
  'paid',
  'accepted',
  'preparing',
  'dispatched',
  'delivered',
  'cancelled',
  'refunded',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const FULFILMENT_STATUSES = [
  'pending',
  'accepted',
  'preparing',
  'ready',
  'dispatched',
  'delivered',
  'cancelled',
] as const

export type FulfilmentStatus = (typeof FULFILMENT_STATUSES)[number]

export type Order = {
  id: string
  order_number: string
  customer_id: string
  recipient_id?: string | null
  country_id: string
  customer_type: string
  /** RFC3339 timestamp — the date part is the delivery day. */
  delivery_date: string
  status: OrderStatus
  /** Minor units of `currency`. */
  subtotal_amount: number
  delivery_amount: number
  total_amount: number
  currency: string
  gift_message?: string | null
  media_greeting_id?: string | null
  created_at: string
  updated_at: string
}

export type OrderItem = {
  id: string
  order_id: string
  seller_id: string
  shop_id: string
  product_id: string
  quantity: number
  unit_amount: number
  total_amount: number
  fulfilment_status: FulfilmentStatus
  created_at: string
  updated_at: string
}

export type SellerOrderItemSummary = OrderItem & {
  order_number: string
  order_status: OrderStatus
  delivery_date: string
  product_name: string
  product_slug: string
  product_image_url?: string | null
  recipient_name: string
}

export type SellerOrderItemDetails = OrderItem & {
  order: Order
  product: Product
  recipient?: Recipient
  shipping_address?: RecipientAddress
  shop?: Shop
}

export const PARCEL_DISTANCE_UNITS = ['cm', 'in'] as const
export type ParcelDistanceUnit = (typeof PARCEL_DISTANCE_UNITS)[number]

export const PARCEL_MASS_UNITS = ['kg', 'lb'] as const
export type ParcelMassUnit = (typeof PARCEL_MASS_UNITS)[number]

export type ParcelInput = {
  length: string
  width: string
  height: string
  distance_unit?: ParcelDistanceUnit
  weight: string
  mass_unit?: ParcelMassUnit
}

export const CUSTOMS_CONTENTS_TYPES = [
  'MERCHANDISE',
  'GIFT',
  'DOCUMENTS',
  'SAMPLE',
  'RETURNED_GOODS',
  'HUMANITARIAN_DONATION',
  'OTHER',
] as const
export type CustomsContentsType = (typeof CUSTOMS_CONTENTS_TYPES)[number]

export const CUSTOMS_NON_DELIVERY_OPTIONS = ['RETURN', 'ABANDON'] as const
export type CustomsNonDeliveryOption = (typeof CUSTOMS_NON_DELIVERY_OPTIONS)[number]

export type CustomsItemInput = {
  description: string
  quantity: number
  net_weight: string
  mass_unit: ParcelMassUnit
  value_amount: string
  value_currency: string
  origin_country: string
  tariff_number?: string
}

export type CustomsDeclarationInput = {
  contents_type: CustomsContentsType | string
  contents_explanation?: string
  non_delivery_option: CustomsNonDeliveryOption | string
  certify_signer: string
  eel_pfc?: string
  incoterm?: string
  items: CustomsItemInput[]
}

export type ShippingShipmentInput = {
  parcel?: ParcelInput
  customs_declaration?: CustomsDeclarationInput
}

/** Shippo rate amounts are major-unit strings in `currency`, not minor units. */
export type ShippoRate = {
  object_id: string
  provider: string
  amount: string
  currency: string
  estimated_days: number
  duration_terms: string
  service_name: string
}

export type ShippingRatesResult = {
  shipment_object_id: string
  rates: ShippoRate[]
}

export type BuyLabelInput = {
  rate_object_id: string
  provider: string
  idempotency_key: string
}

export type Shipment = {
  id: string
  order_id: string
  order_item_id?: string
  seller_id: string
  is_international?: boolean
  parcel_details?: ParcelInput | Record<string, unknown> | null
  customs_declaration?: CustomsDeclarationInput | Record<string, unknown> | null
  courier_provider: string
  tracking_number: string
  label_media_id: string
  delivery_mode: string
  status: string
  provider_shipment_id: string
  provider_customs_declaration_id?: string
  provider_tracking_url: string
  created_at: string
  updated_at: string
}

export type OrderDetails = Order & { items: OrderItem[] }

export type OrderItemInput = {
  product_id: string
  quantity: number
}

export type CreateOrderInput = {
  recipient_id?: string
  country_id: string
  /** 'personal' | 'corporate'. Defaults to 'personal' server-side. */
  customer_type?: 'personal' | 'corporate'
  /** YYYY-MM-DD */
  delivery_date: string
  gift_message?: string
  media_greeting_id?: string
  /** Minor units. Line prices come from the product, not the client. */
  delivery_amount?: number
  items: OrderItemInput[]
}

/** @deprecated Use CreateOrderInput */
export type OrderCreateInput = CreateOrderInput

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
