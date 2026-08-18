import type { Product, SellerDetails, Shop } from '@/api/types'

const STORAGE_KEY = 'sag.publishedCatalog'
const CHANGE_EVENT = 'sag:published-catalog'

export type PublishedProduct = Product & {
  seller_id?: string
  seller_name?: string
  seller_legal_name?: string
  seller_trading_name?: string
  seller_image_url?: string
  shop_name?: string
}

export type CatalogSellerMeta = {
  seller: Pick<
    SellerDetails,
    'id' | 'legal_name' | 'trading_name' | 'email' | 'phone' | 'image_url' | 'seller_type' | 'verification_status'
  >
  shop?: Pick<Shop, 'id' | 'name' | 'slug' | 'description' | 'customer_visible_location' | 'image_url'>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function stringField(record: Record<string, unknown> | null, ...keys: string[]) {
  if (!record) return ''
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
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

export function sellerSnapshotFromProduct(product: PublishedProduct) {
  const record = product as PublishedProduct & Record<string, unknown>
  const shop = isRecord(record.shop) ? record.shop : null
  const nestedSeller = isRecord(record.seller)
    ? record.seller
    : shop && isRecord(shop.seller)
      ? shop.seller
      : null

  const sellerId =
    stringField(record, 'seller_id') ||
    stringField(nestedSeller, 'id') ||
    stringField(shop, 'seller_id') ||
    product.shop_id

  const legalName =
    stringField(record, 'seller_legal_name') ||
    stringField(nestedSeller, 'legal_name')
  const tradingName =
    stringField(record, 'seller_trading_name') ||
    stringField(nestedSeller, 'trading_name')

  const sellerName =
    tradingName ||
    legalName ||
    stringField(record, 'seller_name', 'sellerName') ||
    stringField(nestedSeller, 'name', 'display_name') ||
    stringField(record, 'shop_name', 'shopName') ||
    stringField(shop, 'name') ||
    'Seller'

  const imageUrl =
    stringField(record, 'seller_image_url') ||
    stringField(nestedSeller, 'image_url') ||
    stringField(shop, 'image_url') ||
    undefined

  const shopName = stringField(record, 'shop_name', 'shopName') || stringField(shop, 'name')

  return {
    sellerId,
    sellerName,
    legalName,
    tradingName,
    imageUrl,
    shopName,
  }
}

function stampProduct(product: Product, meta?: CatalogSellerMeta): PublishedProduct {
  if (!meta?.seller) {
    return product
  }
  const legalName = meta.seller.legal_name.trim()
  const tradingName = meta.seller.trading_name?.trim() || ''
  const name = tradingName || legalName
  return {
    ...product,
    seller_id: meta.seller.id,
    seller_name: name,
    seller_legal_name: legalName || undefined,
    seller_trading_name: tradingName || undefined,
    seller_image_url: meta.seller.image_url,
    shop_name: meta.shop?.name,
  }
}

export function listPublishedCatalog(): PublishedProduct[] {
  return readAll().filter((product) => product.status === 'published')
}

export function getPublishedCatalogProduct(id: string): PublishedProduct | null {
  return listPublishedCatalog().find((product) => product.id === id) ?? null
}

export function syncShopPublishedProducts(
  shopId: string,
  products: Product[],
  meta?: CatalogSellerMeta,
) {
  const previous = readAll()
  const previousById = new Map(
    previous.filter((product) => product.shop_id === shopId).map((product) => [product.id, product]),
  )
  const others = previous.filter((product) => product.shop_id !== shopId)
  const published = products
    .filter((product) => product.status === 'published')
    .map((product) => {
      if (meta?.seller) return stampProduct(product, meta)
      const prev = previousById.get(product.id)
      return {
        ...product,
        seller_id: prev?.seller_id,
        seller_name: prev?.seller_name,
        seller_legal_name: prev?.seller_legal_name,
        seller_trading_name: prev?.seller_trading_name,
        seller_image_url: prev?.seller_image_url,
        shop_name: prev?.shop_name,
      }
    })
  writeAll([...published, ...others])
}

export function attachSellerShopsToPublishedCatalog(
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
      stamped.seller_name === product.seller_name &&
      stamped.seller_legal_name === product.seller_legal_name &&
      stamped.seller_trading_name === product.seller_trading_name &&
      stamped.seller_image_url === product.seller_image_url &&
      stamped.shop_name === product.shop_name
    ) {
      return product
    }
    changed = true
    return stamped
  })
  if (changed) writeAll(next)
}

export function subscribePublishedCatalog(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}
