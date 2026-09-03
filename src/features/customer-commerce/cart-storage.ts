import type { CartCustomerType, CartItem } from '@/features/customer-commerce/types'

const CART_KEY = 'sag.cart'

function isCustomerType(value: unknown): value is CartCustomerType {
  return value === 'personal' || value === 'corporate'
}

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') return false
  const item = value as CartItem
  return (
    typeof item.productId === 'string' &&
    item.productId.length > 0 &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0 &&
    isCustomerType(item.customerType)
  )
}

function migrateCartItem(value: unknown): CartItem | null {
  if (isCartItem(value)) return value
  if (!value || typeof value !== 'object') return null
  const item = value as { productId?: unknown; quantity?: unknown; customerType?: unknown }
  if (
    typeof item.productId !== 'string' ||
    item.productId.length === 0 ||
    !Number.isInteger(item.quantity) ||
    (item.quantity as number) < 1
  ) {
    return null
  }
  return {
    productId: item.productId,
    quantity: item.quantity as number,
    customerType: isCustomerType(item.customerType) ? item.customerType : 'personal',
  }
}

export function readCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((item) => {
      const migrated = migrateCartItem(item)
      return migrated ? [migrated] : []
    })
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
