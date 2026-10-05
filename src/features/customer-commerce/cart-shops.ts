import type { CatalogProduct } from './types'

export type CartShop = { id: string; name: string }

/**
 * The shops a cart's products come from, in cart order. An order ships from
 * one shop, so checkout is only allowed when this has a single entry.
 */
export function cartShops(lines: { product: CatalogProduct }[]): CartShop[] {
  const shops: CartShop[] = []
  const seen = new Set<string>()
  for (const { product } of lines) {
    const id = product.shopId || product.sellerId || product.sellerName || 'unknown'
    if (seen.has(id)) continue
    seen.add(id)
    shops.push({ id, name: product.shopName || product.sellerName || 'Shop' })
  }
  return shops
}

export const MIXED_SHOPS_MESSAGE =
  'Your cart has gifts from more than one shop. Keep gifts from a single shop to check out. Remove the others and order them separately.'
