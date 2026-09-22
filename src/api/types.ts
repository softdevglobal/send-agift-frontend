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
  /** Cover image — usually the first gallery image's CDN URL. */
  image_url?: string | null
  /** Optional shipping dimensions used for checkout quotes and seller rates. */
  parcel?: ParcelInput | null
  /** Gallery images and videos (ordered by position). */
  media?: ProductMedia[]
}

/** One gallery file on a product response. */
export type ProductMedia = {
  media_asset_id: string
  position: number
  asset_type: 'image' | 'video' | string
  bucket?: string
  object_path: string
  cdn_url: string
  mime_type: string
  size_bytes: number
  metadata?: Record<string, unknown>
}

/** One gallery file posted on create/update (after presign + PUT). */
export type ProductMediaInput = {
  object_path: string
  mime_type: string
  size_bytes: number
  metadata?: {
    width?: number
    height?: number
    [key: string]: unknown
  }
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

export type ProductDetails = Product & {
  inventory?: Inventory
  /** Nested shop on public product GET. */
  shop?: Pick<
    Shop,
    'id' | 'name' | 'slug' | 'image_url' | 'customer_visible_location' | 'description'
  >
}

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
  /** Optional — API sets this from the first image in `media` when omitted. */
  image_url?: string | null
  inventory?: InventoryInput
  /** Shipping parcel for checkout quotes and seller labels. */
  parcel: ParcelInput
  /**
   * Gallery replace:
   * - omit on update → keep existing gallery
   * - `[]` → clear gallery
   * - `[...]` → replace gallery
   */
  media?: ProductMediaInput[]
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

export const MEDIA_FOLDERS = [
  'seller-profile',
  'shop-image',
  'product-image',
  'product-video',
  'reel-video',
  'reel-photo',
  'reel-thumbnail',
  'chat-image',
  'chat-document',
  'review-photo',
  'review-video',
] as const

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

/**
 * What a customer may see of a shipment: who is carrying the parcel and how to
 * follow it. The label PDF, provider ids, parcel size and customs paperwork
 * stay with the seller.
 */
export type OrderItemTracking = {
  courier_provider?: string
  tracking_number?: string
  /** The carrier's tracking page. Absent for some seller-arranged shipments. */
  tracking_url?: string
  status: 'label_created' | 'collected' | 'in_transit' | 'delivered' | 'failed' | 'returned'
  /** "courier" for a bought carrier label; "seller_managed" when the shop shipped it. */
  delivery_mode: 'courier' | 'seller_managed' | 'pickup' | string
  delivered_at?: string
  shipped_at: string
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
  /** Present once the line has shipped. */
  tracking?: OrderItemTracking
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
  duration_terms?: string
  service_name: string
}

export type ShippingRatesResult = {
  shipment_object_id: string
  international?: boolean
  rates: ShippoRate[]
  /** Rate the customer chose at checkout for this line's shop, when still known. */
  checkout_selected?: CheckoutSelectedRate | null
  /**
   * Fresh Shippo rate to buy — always use this for BuyLabel when present.
   * Never reuse `checkout_selected.rate_object_id` (it expires).
   */
  recommended_rate_object_id?: string | null
  /** What the customer paid / was quoted for delivery (minor units / cents). */
  customer_delivery_amount?: number
  currency?: string
  /** When true, BuyLabel must use the customer courier (or chat to change). */
  must_buy_customer_courier?: boolean
}

/** Snapshot of the courier option the buyer picked at checkout. */
export type CheckoutSelectedRate = {
  provider: string
  service_name: string
  /** Minor units (cents) in `currency`. */
  amount: number
  /** Major-unit display string, e.g. "79.51". Prefer this in UI. */
  amount_major?: string
  currency: string
  /**
   * Checkout-time Shippo rate id when returned — history only; do not BuyLabel with it.
   * Matching for buy uses provider + service_name → recommended_rate_object_id.
   */
  rate_object_id?: string
}

/**
 * Buy a label.
 *
 * Option A: fresh `rate_object_id` + `provider` + `idempotency_key` from latest rates.
 * Option B: `use_customer_selected: true` + `idempotency_key` (server matches courier by name).
 * `idempotency_key` is always required.
 */
export type BuyLabelInput = {
  idempotency_key: string
  /** Fresh id from latest /shipping/rates (`recommended_rate_object_id`). */
  rate_object_id?: string
  provider?: string
  /** When true, API buys the customer-locked courier from the latest rates. */
  use_customer_selected?: boolean
}

/** Shippo (and similar) extras returned with a bought label. */
export type ShipmentProviderMetadata = {
  label_url?: string | null
  tracking_number?: string | null
  tracking_url_provider?: string | null
  tracking_status?: string | null
  commercial_invoice_url?: string | null
  qr_code_url?: string | null
  test?: boolean
  status?: string | null
  [key: string]: unknown
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
  provider_metadata?: ShipmentProviderMetadata | null
  created_at: string
  updated_at: string
}

/** PDF URL from provider metadata when present. */
export function resolveShipmentLabelUrl(shipment: Shipment): string | null {
  const url = shipment.provider_metadata?.label_url
  return typeof url === 'string' && url.trim() ? url.trim() : null
}

/**
 * A short-lived link to a bought label PDF.
 *
 * Labels sit in a private bucket because they carry the recipient's full
 * address, so the API hands back a presigned URL that expires rather than a
 * permanent one.
 */
export type ShippingLabelLink = {
  url: string
  mime_type: string
  expires_in_seconds: number
  tracking_number?: string
  provider?: string
}

/**
 * Body for recording a shipment the seller arranged themselves, bypassing
 * Shippo entirely. The fallback for a lane no connected carrier account
 * quotes — for example none of Shippo's test carriers serve a domestic Sri
 * Lanka shipment, so GetRates can return zero rates for a perfectly valid
 * order with nothing wrong to fix.
 */
export type ManualShipmentInput = {
  courier_provider: string
  tracking_number: string
  tracking_url?: string
}

/** One cart line to price delivery for. */
export type DeliveryQuoteLine = {
  product_id: string
  quantity: number
}

export type DeliveryQuoteInput = {
  recipient_id: string
  /** The date it should arrive — picks the cheapest service that makes it. */
  delivery_date?: string
  items: DeliveryQuoteLine[]
}

/** One courier option for a shop — AliExpress-style delivery picker. */
export type DeliveryQuoteOption = {
  provider: string
  service_name: string
  /** Minor units, in `currency`. */
  amount: number
  currency: string
  estimated_days: number
  /** Calendar days until estimated arrival from today / quote time. */
  days_available: number
  recommended?: boolean
  rate_object_id: string
  shipment_object_id: string
}

export type DeliveryQuoteShop = {
  shop_id: string
  shop_name: string
  shipment_object_id?: string
  options: DeliveryQuoteOption[]
}

/** The service chosen for one shop's parcel. */
export type QuotedShipment = {
  shop_id: string
  shop_name: string
  provider: string
  service_name: string
  /** Minor units, in `currency`. */
  amount: number
  currency: string
  estimated_days: number
  days_available?: number
  /** Nothing quoted could make the date; the fastest was chosen instead. */
  misses_delivery_date: boolean
  /** Shippo rate id — pass back on create order as `shipping_quotes`. */
  rate_object_id?: string
  /** Shippo shipment id — pass back on create order as `shipping_quotes`. */
  shipment_object_id?: string
}

export type DeliveryQuote = {
  /** Per-shop courier menus for the checkout picker. */
  shops?: DeliveryQuoteShop[]
  /** Recommended option per shop (same as picking each shop's recommended). */
  shipments: QuotedShipment[]
  amount: number
  currency: string
  /** False when at least one shop could not be priced — see `unquoted`. */
  complete: boolean
  unquoted?: string[]
}

/**
 * Body for a seller delivering an item personally — no courier, no tracking.
 * The note is optional and only for the seller's own record.
 */
export type LocalDeliveryInput = {
  note?: string
}

export type OrderDetails = Order & { items: OrderItem[] }

export type OrderItemInput = {
  product_id: string
  quantity: number
}

/** One shop's quoted rate locked in when placing the order. */
export type OrderShippingQuote = {
  shop_id: string
  rate_object_id: string
  shipment_object_id: string
  provider: string
  service_name: string
  /** Minor units. */
  amount: number
  currency: string
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
  /** Quoted rates from POST /shipping/quote — optional but preferred when present. */
  shipping_quotes?: OrderShippingQuote[]
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

/** One file on a reel, joined with its media asset. */
export type ReelMediaItem = {
  media_asset_id: string
  position: number
  asset_type: 'image' | 'video'
  bucket: string
  object_path: string
  /** Only filled for objects under `public/` — a private object has no playable URL. */
  cdn_url?: string | null
  mime_type: string
  size_bytes: number
  metadata?: Record<string, unknown>
}

/** The product tagged on a reel, tappable to buy. */
export type ReelProductSummary = {
  id: string
  name: string
  slug: string
  price_amount: number
  currency: string
  status: string
  image_url?: string | null
}

/** The shop a reel was posted by. */
export type ReelShopSummary = {
  id: string
  name: string
  slug: string
  image_url?: string | null
}

/** A reel with its media, plus shop and product context for the feed. */
export type ReelDetails = {
  id: string
  seller_id: string
  shop_id: string
  product_id?: string | null
  thumbnail_media_id?: string | null
  reel_type: 'video' | 'photo'
  caption?: string | null
  hashtags: string[]
  visibility: 'public' | 'private'
  status: 'draft' | 'published' | 'archived'
  duration_ms?: number | null
  view_count: number
  like_count?: number
  comment_count?: number
  /**
   * Never computed on the public feed routes — they read no identity — so it
   * is always false there. `GET /reels/{id}/likes` answers it per viewer.
   */
  liked_by_me?: boolean
  /** Newest three likers, names only. */
  recent_likers?: ReelLiker[]
  /** Every visible comment, newest first. */
  comments?: ReelComment[]
  published_at?: string | null
  created_at: string
  updated_at: string
  media: ReelMediaItem[]
  thumbnail?: ReelMediaItem | null
  shop?: ReelShopSummary | null
  product?: ReelProductSummary | null
}

/** Someone who liked a reel. The API never exposes ids or guest tokens. */
export type ReelLiker = {
  type: 'customer' | 'guest'
  display_name: string
}

/** Who a comment shows as: a customer's own name, or a chosen nickname. */
export type ReelCommentAuthor = {
  type: 'customer' | 'anonymous'
  display_name: string
}

/** One visible comment on a reel. Ownership is never part of the payload. */
export type ReelComment = {
  id: string
  reel_id: string
  body: string
  is_anonymous: boolean
  author: ReelCommentAuthor
  created_at: string
  updated_at: string
}

export type ReelCommentList = {
  items: ReelComment[]
  next_cursor?: string | null
}

/** `GET /reels/{id}/likes`. `liked_by_requester` is only true with a customer token. */
export type ReelLikes = {
  reel_id: string
  like_count: number
  liked_by_requester: boolean
  recent_likers: ReelLiker[]
}

/** Returned by like and unlike. */
export type ReelLikeResult = {
  liked: boolean
  like_count: number
}

/** A page of public reels, with the cursor for the next one. */
export type ReelFeed = {
  items: ReelDetails[]
  next_cursor?: string | null
}

export type ConversationType = 'product_inquiry' | 'order' | 'support'
export type ConversationStatus = 'open' | 'closed'
export type ParticipantRole = 'customer' | 'seller' | 'admin'
export type SupportCaseStatus = 'open' | 'in_progress' | 'closed'
export type SupportPriority = 'low' | 'normal' | 'high' | 'urgent'

/** One person in a thread. `user_id` is a customer, seller, or admin id depending on `role`. */
export type ConversationParticipant = {
  id: string
  conversation_id: string
  user_id: string
  role: ParticipantRole
  /** Absent until that participant first reads the thread. */
  last_read_at?: string | null
  joined_at: string
  display_name?: string | null
  image_url?: string | null
}

export type SupportCase = {
  id: string
  conversation_id: string
  opened_by_user_id: string
  opened_by_role: 'admin' | 'customer' | 'seller'
  counterpart_user_id: string
  counterpart_role: 'customer' | 'seller'
  subject?: string | null
  status: SupportCaseStatus
  priority: SupportPriority
  created_at: string
  updated_at: string
}

export type Conversation = {
  id: string
  type: ConversationType
  status: ConversationStatus
  product_id?: string | null
  shop_id?: string | null
  order_id?: string | null
  order_item_id?: string | null
  created_by_user_id: string
  last_message_at?: string | null
  created_at: string
  updated_at: string
  /** What the thread is about — empty for support threads. */
  product_name?: string | null
  product_image_url?: string | null
  shop_name?: string | null
  shop_image_url?: string | null
  order_number?: string | null
}

export type ConversationDetails = Conversation & {
  participants: ConversationParticipant[]
  support_case?: SupportCase | null
}

export type ConversationSummary = ConversationDetails & { unread_count: number }

export type MessageAttachment = {
  id: string
  message_id: string
  media_id: string
  asset_type: 'image' | 'document' | string
  object_path: string
  cdn_url?: string | null
  mime_type: string
  size_bytes: number
  created_at: string
}

/** One chat bubble. The API omits `attachments` when a message has none. */
export type ChatMessage = {
  id: string
  conversation_id: string
  sender_user_id: string
  body: string
  type: 'text' | string
  created_at: string
  attachments?: MessageAttachment[]
}

/** A file already uploaded via presign (folder chat-image | chat-document). */
export type ChatAttachmentInput = {
  object_path: string
  mime_type: string
  size_bytes: number
}

export type StartConversationInput = {
  type: ConversationType
  product_id?: string
  order_item_id?: string
  counterpart_role?: 'customer' | 'seller'
  counterpart_user_id?: string
  subject?: string
  priority?: SupportPriority
  body?: string
  attachments?: ChatAttachmentInput[]
}

export type SendMessageInput = {
  body: string
  attachments?: ChatAttachmentInput[]
}
