import type { SellerDetails, Shop } from '@/api/types'

const STORAGE_KEY = 'sag.publicSellers'
const CHANGE_EVENT = 'sag:public-sellers'

export type PublicShop = {
  id: string
  name: string
  slug: string
  description?: string
  customer_visible_location?: string
  image_url?: string
  status?: string
}

export type PublicSeller = {
  id: string
  name: string
  legal_name: string
  trading_name?: string
  email: string
  phone?: string
  image_url?: string
  seller_type: string
  verification_status: string
  shops: PublicShop[]
}

type Store = {
  sellers: Record<string, PublicSeller>
  shopIndex: Record<string, string>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isPublicShop(value: unknown): value is PublicShop {
  if (!isRecord(value)) return false
  return typeof value.id === 'string' && typeof value.name === 'string'
}

function isPublicSeller(value: unknown): value is PublicSeller {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.legal_name === 'string' &&
    typeof value.email === 'string' &&
    Array.isArray(value.shops) &&
    value.shops.every(isPublicShop)
  )
}

function emptyStore(): Store {
  return { sellers: {}, shopIndex: {} }
}

function readStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyStore()
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return emptyStore()
    const sellers: Record<string, PublicSeller> = {}
    if (isRecord(parsed.sellers)) {
      for (const [id, seller] of Object.entries(parsed.sellers)) {
        if (isPublicSeller(seller)) sellers[id] = seller
      }
    }
    const shopIndex: Record<string, string> = {}
    if (isRecord(parsed.shopIndex)) {
      for (const [shopId, sellerId] of Object.entries(parsed.shopIndex)) {
        if (typeof sellerId === 'string') shopIndex[shopId] = sellerId
      }
    }
    return { sellers, shopIndex }
  } catch {
    return emptyStore()
  }
}

function writeStore(store: Store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function toPublicShop(shop: Shop): PublicShop {
  return {
    id: shop.id,
    name: shop.name,
    slug: shop.slug,
    description: shop.description,
    customer_visible_location: shop.customer_visible_location,
    image_url: shop.image_url,
    status: shop.status,
  }
}

export function publicSellerName(
  seller: Pick<PublicSeller, 'name'> & Partial<Pick<PublicSeller, 'trading_name' | 'legal_name'>>,
) {
  return seller.trading_name?.trim() || seller.name?.trim() || seller.legal_name?.trim() || 'Seller'
}

export function publicSellerInitials(seller: Pick<PublicSeller, 'name'> & Partial<Pick<PublicSeller, 'legal_name' | 'trading_name'>>) {
  const name = publicSellerName(seller)
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'S'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export function publishPublicSeller(profile: SellerDetails) {
  const seller: PublicSeller = {
    id: profile.id,
    name: profile.trading_name?.trim() || profile.legal_name,
    legal_name: profile.legal_name,
    trading_name: profile.trading_name,
    email: profile.email,
    phone: profile.phone,
    image_url: profile.image_url,
    seller_type: profile.seller_type,
    verification_status: profile.verification_status,
    shops: (profile.shops ?? []).map(toPublicShop),
  }

  const store = readStore()
  for (const [shopId, sellerId] of Object.entries(store.shopIndex)) {
    if (sellerId === seller.id) delete store.shopIndex[shopId]
  }
  for (const shop of seller.shops) {
    store.shopIndex[shop.id] = seller.id
  }
  store.sellers[seller.id] = seller
  writeStore(store)
  return seller
}

export function getPublicSeller(id: string): PublicSeller | null {
  return readStore().sellers[id] ?? null
}

export function getPublicSellerForShop(shopId: string): PublicSeller | null {
  const store = readStore()
  const indexedId = store.shopIndex[shopId]
  if (indexedId && store.sellers[indexedId]) return store.sellers[indexedId]

  const sellers = Object.values(store.sellers)
  const byShop = sellers.find((seller) => seller.shops.some((shop) => shop.id === shopId))
  if (byShop) return byShop
  if (sellers.length === 1) return sellers[0]
  return null
}

export function getPublicSellerByShopId(shopId: string): PublicSeller | null {
  return getPublicSellerForShop(shopId)
}

export function listPublicSellers(): PublicSeller[] {
  return Object.values(readStore().sellers)
}

export function subscribePublicSellers(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}
