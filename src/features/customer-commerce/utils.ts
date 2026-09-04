import { giftCategories } from '@/features/marketing/data'

const SHIPPING_THRESHOLD = 75
const SHIPPING_FEE = 6.5

export function formatMoney(value: number) {
  return `$${value.toFixed(2)}`
}

export function shippingForSubtotal(subtotal: number) {
  if (subtotal <= 0) return 0
  return subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE
}

export function categoryName(categoryId: string) {
  return giftCategories.find((item) => item.id === categoryId)?.name ?? categoryId
}
