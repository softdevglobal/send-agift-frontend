import type { Product, SellerDetails, Shop } from '@/api/types'
import {
  getPublicSeller,
  getPublicSellerForShop,
  publishPublicSeller,
  type PublicSeller,
} from '@/lib/public-sellers'

const STORAGE_KEY = 'sag.publishedCatalog'
const CHANGE_EVENT = 'sag:published-catalog'

export type PublishedProduct = Product & {
  seller_id?: string
  seller_name?: string
  seller_legal_name?: string
  seller_trading_name?: string
  seller_image_url?: string
  seller_email?: string
  seller_phone?: string
  shop_name?: string
  shop_description?: string
  shop_location?: string
}

export type CatalogSellerMeta = {
  seller: Pick<
    SellerDetails,
    | 'id'
    | 'legal_name'
    | 'trading_name'
    | 'email'
    | 'phone'
    | 'image_url'
    | 'seller_type'
    | 'verification_status'
  >
  shop?: Pick<
    Shop,
    'id' | 'name' | 'slug' | 'description' | 'customer_visible_location' | 'image_url'
  >
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isProduct(value: unknown): value is PublishedProduct {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.shop_id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.status === 'string'
  )
}

function readAll(): PublishedProduct[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isProduct)
  } catch {
    return []
  }
}

function writeAll(products: PublishedProduct[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products))
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function metaFromDirectory(shopId: string): CatalogSellerMeta | undefined {
  const seller = getPublicSellerForShop(shopId)
  if (!seller) return undefined
  const shop = seller.shops.find((item) => item.id === shopId)
  return {
    seller: {
      id: seller.id,
      legal_name: seller.legal_name,
      trading_name: seller.trading_name,
      email: seller.email,
      phone: seller.phone,
      image_url: seller.image_url,
      seller_type: seller.seller_type,
      verification_status: seller.verification_status,
    },
    shop,
  }
}

function stampProduct(product: Product, meta?: CatalogSellerMeta): PublishedProduct {
  if (!meta?.seller) return product
  const legalName = meta.seller.legal_name.trim()
  const tradingName = meta.seller.trading_name?.trim() || ''
  return {
    ...product,
    seller_id: meta.seller.id,
    seller_name: tradingName || legalName,
    seller_legal_name: legalName || undefined,
    seller_trading_name: tradingName || undefined,
    seller_image_url: meta.seller.image_url,
    seller_email: meta.seller.email,
    seller_phone: meta.seller.phone,
    shop_name: meta.shop?.name,
    shop_description: meta.shop?.description,
    shop_location: meta.shop?.customer_visible_location,
  }
}

function hydrateProduct(product: PublishedProduct): PublishedProduct {
  const meta = metaFromDirectory(product.shop_id)
  if (!meta?.seller) return product
  return stampProduct(product, meta)
}

export function listPublishedCatalog(): PublishedProduct[] {
  return readAll()
    .filter((product) => product.status === 'published')
    .map(hydrateProduct)
}

export function getPublishedCatalogProduct(id: string): PublishedProduct | null {
  return listPublishedCatalog().find((product) => product.id === id) ?? null
}

export function syncShopPublishedProducts(
  shopId: string,
  products: Product[],
  meta?: CatalogSellerMeta,
) {
  const resolved = meta?.seller ? meta : metaFromDirectory(shopId)
  const previous = readAll()
  const previousById = new Map(
    previous.filter((product) => product.shop_id === shopId).map((product) => [product.id, product]),
  )
  const others = previous.filter((product) => product.shop_id !== shopId)
  const published = products
    .filter((product) => product.status === 'published')
    .map((product) => {
      if (resolved?.seller) return stampProduct(product, resolved)
      const prev = previousById.get(product.id)
      return hydrateProduct({
        ...product,
        seller_id: prev?.seller_id,
        seller_name: prev?.seller_name,
        seller_legal_name: prev?.seller_legal_name,
        seller_trading_name: prev?.seller_trading_name,
        seller_image_url: prev?.seller_image_url,
        seller_email: prev?.seller_email,
        seller_phone: prev?.seller_phone,
        shop_name: prev?.shop_name,
        shop_description: prev?.shop_description,
        shop_location: prev?.shop_location,
      })
    })
  writeAll([...published, ...others])
}

export function stampSellerOntoCatalog(
  seller: CatalogSellerMeta['seller'],
  shops: NonNullable<CatalogSellerMeta['shop']>[],
) {
  const products = readAll()
  const shopById = new Map(shops.map((shop) => [shop.id, shop]))
  let changed = false
  const next = products.map((product) => {
    const shop = shopById.get(product.shop_id)
    const belongsToSeller =
      Boolean(shop) ||
      product.seller_id === seller.id ||
      (shops.length === 0 && !product.seller_id)
    if (!belongsToSeller) return product
    const stamped = stampProduct(product, { seller, shop: shop ?? shops[0] })
    if (
      stamped.seller_id === product.seller_id &&
      stamped.seller_legal_name === product.seller_legal_name &&
      stamped.seller_trading_name === product.seller_trading_name &&
      stamped.seller_image_url === product.seller_image_url &&
      stamped.seller_email === product.seller_email &&
      stamped.seller_phone === product.seller_phone &&
      stamped.shop_name === product.shop_name
    ) {
      return product
    }
    changed = true
    return stamped
  })
  if (changed) writeAll(next)
}

export function publishSellerToMarketplace(profile: SellerDetails) {
  publishPublicSeller(profile)
  stampSellerOntoCatalog(profile, profile.shops ?? [])
}

export function sellerFromCatalog(id: string): PublicSeller | null {
  const direct = getPublicSeller(id)
  if (direct) return direct
  const byShop = getPublicSellerForShop(id)
  if (byShop) return byShop

  const products = listPublishedCatalog().filter(
    (product) => product.seller_id === id || product.shop_id === id,
  )
  if (!products.length) return null

  const first = products[0]
  const shopIds = [...new Set(products.map((product) => product.shop_id))]
  const legal = first.seller_legal_name?.trim() || first.seller_name || 'Seller'
  const trading = first.seller_trading_name?.trim()
  return {
    id: first.seller_id || id,
    name: trading || legal,
    legal_name: legal,
    trading_name: trading,
    email: first.seller_email || '',
    phone: first.seller_phone,
    image_url: first.seller_image_url,
    seller_type: '',
    verification_status: '',
    shops: shopIds.map((shopId) => {
      const product = products.find((item) => item.shop_id === shopId) ?? first
      return {
        id: shopId,
        name: product.shop_name || trading || legal,
        slug: '',
        description: product.shop_description,
        customer_visible_location: product.shop_location,
        image_url: product.seller_image_url,
      }
    }),
  }
}

export function subscribePublishedCatalog(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}
