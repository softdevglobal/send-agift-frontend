import { giftCategories } from '@/features/marketing/data'
import { formatPriceAmount, majorToMinor } from '@/lib/money'

/**
 * A price in major units (22.00), in the currency of the shop it comes from.
 * Without a currency it falls back to a plain dollar sign.
 */
export function formatMoney(value: number, currency?: string) {
  if (!currency) return `$${value.toFixed(2)}`
  return formatPriceAmount(majorToMinor(value, currency), currency)
}

export function categoryName(categoryId: string) {
  return giftCategories.find((item) => item.id === categoryId)?.name ?? categoryId
}
