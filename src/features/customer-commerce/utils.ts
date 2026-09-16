import { giftCategories } from '@/features/marketing/data'

export function formatMoney(value: number) {
  return `$${value.toFixed(2)}`
}

export function categoryName(categoryId: string) {
  return giftCategories.find((item) => item.id === categoryId)?.name ?? categoryId
}
