import type { Product, Shop } from '@/api/types'
import { giftCategories } from '@/features/marketing/data'
import type { CatalogProduct } from '@/features/customer-commerce/types'
import { minorToMajor } from '@/lib/money'
import {
  getPublishedCatalogProduct,
  listPublishedCatalog,
  sellerFromCatalog,
  type PublishedProduct,
} from '@/lib/published-catalog'
import { getPublicSeller, getPublicSellerForShop } from '@/lib/public-sellers'

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=900&q=80'

const liveCatalog = new Map<string, CatalogProduct>()
let marketplaceLoaded = false

/** The public catalog came from the API, so a seller's local publish cache is not shown. */
export function markMarketplaceLoaded() {
  marketplaceLoaded = true
}

export function replaceCatalogProducts(products: CatalogProduct[]) {
  liveCatalog.clear()
  for (const product of products) liveCatalog.set(product.id, product)
}

/** Products come from the API only; there is no built-in sample catalog. */
export const catalogProducts: CatalogProduct[] = []

function publicSellerForPublished(product: PublishedProduct) {
  return (
    (product.seller_id ? getPublicSeller(product.seller_id) : null) ||
    getPublicSellerForShop(product.shop_id)
  )
}

function sellerImageForPublished(product: PublishedProduct) {
  if (product.seller_image_url) return product.seller_image_url
  return publicSellerForPublished(product)?.image_url
}

function shopNameForPublished(product: PublishedProduct) {
  if (product.shop_name?.trim()) return product.shop_name.trim()
  const seller = publicSellerForPublished(product)
  return seller?.shops.find((shop) => shop.id === product.shop_id)?.name
}

export function catalogProductFromApi(product: Product, shop?: Shop): CatalogProduct {
  const published = product as PublishedProduct
  const legalName = published.seller_legal_name?.trim() || ''
  const tradingName = published.seller_trading_name?.trim() || ''
  const sellerName =
    tradingName ||
    legalName ||
    published.seller_name?.trim() ||
    shop?.name?.trim() ||
    published.shop_name?.trim() ||
    ''
  const media = [...(product.media ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((item) => ({
      id: item.media_asset_id,
      position: item.position,
      assetType: item.asset_type,
      url: item.cdn_url,
      mimeType: item.mime_type,
    }))
  // A gift can be in several categories; known ones first, in the seller's order.
  const categoryIds = [
    ...new Set(
      (product.occasion_tags ?? [])
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => giftCategories.some((item) => item.id === tag)),
    ),
  ]
  const coverFromMedia = media.find(
    (item) => item.assetType === 'image' || item.mimeType.startsWith('image/'),
  )?.url
  return {
    id: product.id,
    name: product.name,
    price: minorToMajor(product.price_amount, product.currency),
    image: coverFromMedia || product.image_url || PLACEHOLDER_IMAGE,
    categoryId: categoryIds[0] ?? (product.occasion_tags?.[0] ?? '').toLowerCase(),
    categoryIds,
    sellerName,
    sellerLegalName: legalName || undefined,
    sellerTradingName: tradingName || undefined,
    sellerId: shop?.seller_id || published.seller_id || product.shop_id,
    sellerImageUrl: shop?.image_url || sellerImageForPublished(published),
    sellerEmail: published.seller_email,
    sellerPhone: published.seller_phone,
    sellerVerificationStatus: shop?.seller_verification_status,
    shopId: product.shop_id || shop?.id,
    shopName: shop?.name?.trim() || shopNameForPublished(published),
    shopDescription: shop?.description || published.shop_description,
    shopLocation: shop?.customer_visible_location || published.shop_location,
    description: product.description ?? '',
    rating: 0,
    reviews: 0,
    currency: product.currency,
    priceAmount: product.price_amount,
    media: media.length ? media : undefined,
    rewardPoints: product.reward_points ?? 0,
    stockLeft: typeof product.stock_left === 'number' ? product.stock_left : undefined,
  }
}

function belongsToSeller(product: CatalogProduct, sellerIds: Set<string>, shopIds: Set<string>) {
  return (
    (product.sellerId != null && sellerIds.has(product.sellerId)) ||
    (product.shopId != null && shopIds.has(product.shopId))
  )
}

export function listCatalogProductsForSeller(sellerId: string): CatalogProduct[] {
  const seller = sellerFromCatalog(sellerId)
  const sellerIds = new Set<string>([sellerId])
  if (seller?.id) sellerIds.add(seller.id)
  const shopIds = new Set(seller?.shops.map((shop) => shop.id) ?? [])
  shopIds.add(sellerId)

  const byId = new Map<string, CatalogProduct>()
  if (!marketplaceLoaded) {
    for (const product of listPublishedCatalog()) {
      const mapped = catalogProductFromApi(product)
      if (belongsToSeller(mapped, sellerIds, shopIds)) byId.set(mapped.id, mapped)
    }
  }
  for (const product of liveCatalog.values()) {
    if (belongsToSeller(product, sellerIds, shopIds)) byId.set(product.id, product)
  }
  return [...byId.values()]
}

export function getCatalogSeller(id: string) {
  return sellerFromCatalog(id)
}

export function registerCatalogProducts(products: CatalogProduct[]) {
  for (const product of products) {
    liveCatalog.set(product.id, product)
  }
}

export function getCatalogProduct(id: string) {
  const live = liveCatalog.get(id)
  if (live) return live
  if (marketplaceLoaded) {
    return catalogProducts.find((product) => product.id === id) ?? null
  }
  const published = getPublishedCatalogProduct(id)
  if (published) {
    const mapped = catalogProductFromApi(published)
    liveCatalog.set(mapped.id, mapped)
    return mapped
  }
  return catalogProducts.find((product) => product.id === id) ?? null
}

export function filterCatalog({
  query = '',
  category = '',
}: {
  query?: string
  category?: string
} = {}) {
  const normalizedQuery = query.trim().toLowerCase()
  const normalizedCategory = category.trim().toLowerCase()

  return catalogProducts.filter((product) => {
    const matchesCategory =
      !normalizedCategory ||
      normalizedCategory === 'all' ||
      inCategory(product, normalizedCategory)

    if (!matchesCategory) return false
    if (!normalizedQuery) return true

    const haystack = [
      product.name,
      product.description,
      product.sellerName,
      categoryNameFromId(product.categoryId),
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(normalizedQuery)
  })
}

function categoryNameFromId(categoryId: string) {
  return giftCategories.find((item) => item.id === categoryId)?.name ?? ''
}

/** True when the gift is filed under this category, as any of its tags. */
export function inCategory(product: CatalogProduct, category: string) {
  return product.categoryId === category || (product.categoryIds ?? []).includes(category)
}
