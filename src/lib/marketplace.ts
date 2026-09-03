import { getCustomerMe } from '@/api/customers'
import {
  listPublicShopProducts,
  listPublicShops,
  type MarketplaceCustomerType,
} from '@/api/shops'
import type { Product, Shop } from '@/api/types'
import {
  catalogProductFromApi,
  registerCatalogProducts,
} from '@/features/customer-commerce/catalog'
import type { CatalogProduct } from '@/features/customer-commerce/types'
import { getRole, getToken } from '@/lib/auth'
import { indexMarketplaceShops } from '@/lib/public-sellers'

export type { MarketplaceCustomerType }

const CACHE_TTL_MS = 30_000

let catalogCache: {
  at: number
  customerType: MarketplaceCustomerType
  products: CatalogProduct[]
} | null = null

export function getMarketplaceCustomerType(): MarketplaceCustomerType {
  return catalogCache?.customerType ?? 'personal'
}

export async function resolveMarketplaceCustomerType(): Promise<MarketplaceCustomerType> {
  if (getRole() !== 'customer' || !getToken()) return 'personal'
  try {
    const me = await getCustomerMe()
    return me.customer_type === 'corporate' ? 'corporate' : 'personal'
  } catch {
    return 'personal'
  }
}

export async function fetchMarketplaceCatalog(
  customerType: MarketplaceCustomerType = 'personal',
): Promise<{ shops: Shop[]; products: Product[] }> {
  const shops = await listPublicShops()
  const list = Array.isArray(shops) ? shops : []
  const productLists = await Promise.all(
    list.map((shop) =>
      listPublicShopProducts(shop.id, customerType).catch(() => [] as Product[]),
    ),
  )
  return {
    shops: list,
    products: productLists.flatMap((products) => (Array.isArray(products) ? products : [])),
  }
}

/** Loads public shops + products into the live catalog used by the storefront. */
export async function loadMarketplaceIntoCatalog(
  customerType?: MarketplaceCustomerType,
): Promise<CatalogProduct[]> {
  const type = customerType ?? (await resolveMarketplaceCustomerType())
  if (
    catalogCache &&
    catalogCache.customerType === type &&
    Date.now() - catalogCache.at < CACHE_TTL_MS
  ) {
    registerCatalogProducts(catalogCache.products)
    return catalogCache.products
  }

  const { shops, products } = await fetchMarketplaceCatalog(type)
  indexMarketplaceShops(shops)
  const shopById = new Map(shops.map((shop) => [shop.id, shop]))
  const mapped = products.map((product) => ({
    ...catalogProductFromApi(product, shopById.get(product.shop_id)),
    catalogCustomerType: type,
  }))
  registerCatalogProducts(mapped)
  catalogCache = { at: Date.now(), customerType: type, products: mapped }
  return mapped
}
