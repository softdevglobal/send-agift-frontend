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
  shopId?: string
  shopName?: string
  shopDescription?: string
  shopLocation?: string
  currency?: string
  priceAmount?: number
  /** Catalog query (`personal` | `corporate`) this product was loaded with. */
  catalogCustomerType?: CartCustomerType
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

