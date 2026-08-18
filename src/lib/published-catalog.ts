import type { Product } from '@/api/types'

const STORAGE_KEY = 'sag.publishedCatalog'
const CHANGE_EVENT = 'sag:published-catalog'

function isProduct(value: unknown): value is Product {
  if (!value || typeof value !== 'object') return false
  const product = value as Product
  return (
    typeof product.id === 'string' &&
    product.id.length > 0 &&
    typeof product.shop_id === 'string' &&
    typeof product.name === 'string' &&
    typeof product.status === 'string'
  )
}

function readAll(): Product[] {
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

function writeAll(products: Product[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products))
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function listPublishedCatalog(): Product[] {
  return readAll().filter((product) => product.status === 'published')
}

export function getPublishedCatalogProduct(id: string): Product | null {
  return listPublishedCatalog().find((product) => product.id === id) ?? null
}

export function syncShopPublishedProducts(shopId: string, products: Product[]) {
  const others = readAll().filter((product) => product.shop_id !== shopId)
  const published = products.filter((product) => product.status === 'published')
  writeAll([...published, ...others])
}

export function subscribePublishedCatalog(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}
