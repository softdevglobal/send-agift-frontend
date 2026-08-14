import type { CartItem } from '@/features/customer-commerce/types'

const CART_KEY = 'sag.cart'

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') return false
  const item = value as CartItem
  return (
    typeof item.productId === 'string' &&
    item.productId.length > 0 &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0
  )
}

export function readCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isCartItem)
  } catch {
    return []
  }
}

export function writeCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items))
}

export function clearCartStorage() {
  localStorage.removeItem(CART_KEY)
}
