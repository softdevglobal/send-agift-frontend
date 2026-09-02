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

export const catalogProducts: CatalogProduct[] = [
  {
    id: '1',
    name: 'Handbound Memory Journal',
    price: 28,
    compareAt: 36,
    rating: 4.9,
    reviews: 214,
    image:
      'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=900&q=80',
    categoryId: 'keepsakes',
    sellerName: 'Paper & Fern',
    description:
      'A linen-wrapped journal with thick cream pages, made for letters, sketches, and the moments worth keeping.',
  },
  {
    id: '2',
    name: 'Ceramic Pour-Over Set',
    price: 42,
    compareAt: 55,
    rating: 4.8,
    reviews: 168,
    image:
      'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=80',
    categoryId: 'hampers',
    sellerName: 'Sunday Pour',
    description:
      'A handmade ceramic dripper, carafe, and filters — ready to wrap as a slow-morning coffee ritual.',
  },
  {
    id: '3',
    name: 'Soft Linen Gift Hamper',
    price: 64,
    compareAt: 79,
    rating: 4.9,
    reviews: 301,
    image:
      'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=900&q=80',
    categoryId: 'hampers',
    sellerName: 'Hearth & Ribbon',
    description:
      'A ready-to-send hamper of linen tea towels, candles, and pantry treats packed in a reusable gift crate.',
  },
  {
    id: '4',
    name: 'Wireless Focus Earbuds',
    price: 89,
    compareAt: 119,
    rating: 4.7,
    reviews: 452,
    image:
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=900&q=80',
    categoryId: 'tech',
    sellerName: 'North Signal',
    description:
      'Noise-isolating earbuds with a compact charge case. A practical gift for commutes, travel, and deep work.',
  },
  {
    id: '5',
    name: 'Sunset Peony Bouquet',
    price: 48,
    rating: 4.8,
    reviews: 126,
    image:
      'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=80',
    categoryId: 'flowers',
    sellerName: 'Bloom Atelier',
    description:
      'Seasonal peonies and garden roses arranged for same-week delivery, wrapped in kraft and silk ribbon.',
  },
  {
    id: '6',
    name: 'Dried Meadow Arrangement',
    price: 36,
    rating: 4.6,
    reviews: 88,
    image:
      'https://images.unsplash.com/photo-1487530811176-3780de880c2d?auto=format&fit=crop&w=900&q=80',
    categoryId: 'flowers',
    sellerName: 'Bloom Atelier',
    description:
      'A lasting dried bouquet of oats, ruscus, and strawflowers — no vase required, just unwrap and display.',
  },
  {
    id: '7',
    name: 'Birthday Balloon Gift Box',
    price: 39,
    compareAt: 48,
    rating: 4.7,
    reviews: 193,
    image:
      'https://images.unsplash.com/photo-1464349153735-7db50ed83c84?auto=format&fit=crop&w=900&q=80',
    categoryId: 'birthday',
    sellerName: 'Party Post',
    description:
      'Confetti, mini cake candles, and a reusable balloon kit for birthdays that arrive already dressed to celebrate.',
  },
  {
    id: '8',
    name: 'Personalised Birthday Cake Kit',
    price: 54,
    rating: 4.8,
    reviews: 141,
    image:
      'https://images.unsplash.com/photo-1558301211-0d8c8ddee6ec?auto=format&fit=crop&w=900&q=80',
    categoryId: 'birthday',
    sellerName: 'Sugar Press',
    description:
      'Bake-at-home vanilla layers, frosting, and a custom topper — a birthday they can make together.',
  },
  {
    id: '9',
    name: 'Cedarwood Bath Ritual Set',
    price: 46,
    compareAt: 58,
    rating: 4.9,
    reviews: 207,
    image:
      'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=80',
    categoryId: 'wellness',
    sellerName: 'Still Room',
    description:
      'Bath salts, a soy candle, and body oil in a recyclable gift tin. Calm, unfussy, and easy to wrap.',
  },
  {
    id: '10',
    name: 'Linen Sleep Mask & Tea Pairing',
    price: 32,
    rating: 4.5,
    reviews: 76,
    image:
      'https://images.unsplash.com/photo-1512290923902-8a324d6bbc5f?auto=format&fit=crop&w=900&q=80',
    categoryId: 'wellness',
    sellerName: 'Still Room',
    description:
      'A weighted linen eye mask with two tins of herbal tea — a small, thoughtful wind-down gift.',
  },
  {
    id: '11',
    name: 'Pocket Photo Printer',
    price: 79,
    compareAt: 99,
    rating: 4.6,
    reviews: 318,
    image:
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80',
    categoryId: 'tech',
    sellerName: 'North Signal',
    description:
      'Print Polaroid-style photos from a phone in seconds. Includes a starter pack of sticky-back film.',
  },
  {
    id: '12',
    name: 'Brass Keepsake Frame',
    price: 24,
    rating: 4.8,
    reviews: 95,
    image:
      'https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=900&q=80',
    categoryId: 'keepsakes',
    sellerName: 'Paper & Fern',
    description:
      'A small standing frame with a warm brass finish, sized for Polaroids and handwritten notes.',
  },
]

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
  return {
    id: product.id,
    name: product.name,
    price: minorToMajor(product.price_amount, product.currency),
    image: product.image_url || PLACEHOLDER_IMAGE,
    categoryId: (product.occasion_tags?.[0] ?? '').toLowerCase(),
    sellerName,
    sellerLegalName: legalName || undefined,
    sellerTradingName: tradingName || undefined,
    sellerId: shop?.seller_id || published.seller_id || product.shop_id,
    sellerImageUrl: shop?.image_url || sellerImageForPublished(published),
    sellerEmail: published.seller_email,
    sellerPhone: published.seller_phone,
    shopId: product.shop_id || shop?.id,
    shopName: shop?.name?.trim() || shopNameForPublished(published),
    shopDescription: shop?.description || published.shop_description,
    shopLocation: shop?.customer_visible_location || published.shop_location,
    description: product.description ?? '',
    rating: 0,
    reviews: 0,
    currency: product.currency,
    priceAmount: product.price_amount,
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
  for (const product of listPublishedCatalog()) {
    const mapped = catalogProductFromApi(product)
    if (belongsToSeller(mapped, sellerIds, shopIds)) byId.set(mapped.id, mapped)
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
      product.categoryId === normalizedCategory

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
