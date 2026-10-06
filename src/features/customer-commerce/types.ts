import type { GiftProduct } from '@/features/marketing/data'

export type CartCustomerType = 'personal' | 'corporate'

export type CatalogProduct = GiftProduct & {
  categoryId: string
  description: string
  sellerName: string
  sellerLegalName?: string
  sellerTradingName?: string
  sellerId?: string
  sellerImageUrl?: string
  sellerEmail?: string
  sellerPhone?: string
  /** verified, unverified, or rejected. Missing on sample gifts. */
  sellerVerificationStatus?: string
  shopId?: string
  shopName?: string
  shopDescription?: string
  shopLocation?: string
  currency?: string
  priceAmount?: number
  /** Catalog query (`personal` | `corporate`) this product was loaded with. */
  catalogCustomerType?: CartCustomerType
  /** Gallery from API `media[]` (images + videos). */
  media?: CatalogProductMedia[]
  /** Points earned per unit on delivery; 0 when the seller can't fund a reward. */
  rewardPoints?: number
  /** Sellable quantity, present only while stock is low. */
  stockLeft?: number
}

export type CatalogProductMedia = {
  id: string
  position: number
  assetType: 'image' | 'video' | string
  url: string
  mimeType: string
}

export type CartItem = {
  productId: string
  quantity: number
  customerType: CartCustomerType
}

export type CartLine = {
  product: CatalogProduct
  quantity: number
  lineTotal: number
  customerType: CartCustomerType
}

