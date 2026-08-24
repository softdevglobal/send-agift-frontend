import type { GiftProduct } from '@/features/marketing/data'

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
}

export type CartItem = {
  productId: string
  quantity: number
}

export type CartLine = {
  product: CatalogProduct
  quantity: number
  lineTotal: number
}

