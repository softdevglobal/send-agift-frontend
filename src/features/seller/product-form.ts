import {
  KNOWN_CURRENCIES,
  type CustomerTypeVisibility,
  type InventoryInput,
  type KnownCurrency,
  type Product,
  type ProductInput,
  type ProductStatus,
} from '@/api/types'
import { optionalString } from '@/lib/form'
import { majorToMinor, minorToMajor } from '@/lib/money'

/**
 * The shape of the product form, and the pure conversions between it and the
 * API payloads.
 *
 * These live outside the page so the step-by-step create wizard and the
 * inline edit form build exactly the same product — one place decides what a
 * valid product is.
 */
export type ProductFormState = {
  name: string
  slug: string
  description: string
  product_type: string
  price_major: string
  currency: string
  status: ProductStatus
  occasion_tags: string
  customer_type_visibility: CustomerTypeVisibility
  points_display_enabled: boolean
  prep_minutes: string
  image_url: string
  available_qty: string
  reserved_qty: string
  low_stock_threshold: string
  unavailable_dates: string
}

export const emptyForm: ProductFormState = {
  name: '',
  slug: '',
  description: '',
  product_type: 'gift',
  price_major: '',
  currency: 'USD',
  status: 'published',
  occasion_tags: '',
  customer_type_visibility: 'both',
  points_display_enabled: false,
  prep_minutes: '0',
  image_url: '',
  available_qty: '0',
  reserved_qty: '0',
  low_stock_threshold: '0',
  unavailable_dates: '',
}

export function parseNonNegativeInt(value: string, fallback = 0): number {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 0) return fallback
  return parsed
}

export function parseTags(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseDates(value: string): string[] {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function isKnownCurrency(value: string): value is KnownCurrency {
  return (KNOWN_CURRENCIES as readonly string[]).includes(value)
}

export function toInventoryInput(form: ProductFormState): InventoryInput {
  return {
    available_qty: parseNonNegativeInt(form.available_qty),
    reserved_qty: parseNonNegativeInt(form.reserved_qty),
    low_stock_threshold: parseNonNegativeInt(form.low_stock_threshold),
    unavailable_dates: parseDates(form.unavailable_dates),
  }
}

export function toProductInput(
  form: ProductFormState,
  includeInventory: boolean,
): ProductInput | string {
  if (!form.name.trim()) return 'Product name is required.'

  const currency = form.currency.trim().toUpperCase()
  if (!currency) return 'Currency is required.'
  if (!isKnownCurrency(currency)) {
    return 'Currency must be a known ISO currency code.'
  }

  const dates = parseDates(form.unavailable_dates)
  if (dates.some((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
    return 'Unavailable dates must be YYYY-MM-DD.'
  }

  const input: ProductInput = {
    name: form.name.trim(),
    currency,
  }

  const slug = optionalString(form.slug)
  const description = optionalString(form.description)
  const productType = optionalString(form.product_type)
  if (slug) input.slug = slug
  if (description) input.description = description
  if (productType) input.product_type = productType
  input.image_url = optionalString(form.image_url) ?? null

  if (form.price_major.trim() !== '') {
    const major = Number(form.price_major)
    if (!Number.isFinite(major) || major < 0) {
      return 'Price must be a number of 0 or more.'
    }
    input.price_amount = majorToMinor(major, currency)
  }

  if (form.status) input.status = form.status
  input.occasion_tags = parseTags(form.occasion_tags)
  if (form.customer_type_visibility) {
    input.customer_type_visibility = form.customer_type_visibility
  }
  input.points_display_enabled = form.points_display_enabled
  if (form.prep_minutes.trim() !== '') {
    const prep = Number.parseInt(form.prep_minutes, 10)
    if (!Number.isFinite(prep) || prep < 0) {
      return 'Prep minutes must be 0 or more.'
    }
    input.prep_minutes = prep
  }

  if (includeInventory) {
    input.inventory = toInventoryInput(form)
  }

  return input
}

export function productToForm(product: Product, inventory?: InventoryInput): ProductFormState {
  return {
    name: product.name,
    slug: product.slug ?? '',
    description: product.description ?? '',
    product_type: product.product_type,
    price_major: String(minorToMajor(product.price_amount, product.currency)),
    currency: product.currency,
    status: product.status,
    occasion_tags: (product.occasion_tags ?? []).join(', '),
    customer_type_visibility: product.customer_type_visibility,
    points_display_enabled: product.points_display_enabled,
    prep_minutes: String(product.prep_minutes ?? 0),
    image_url: product.image_url ?? '',
    available_qty: String(inventory?.available_qty ?? 0),
    reserved_qty: String(inventory?.reserved_qty ?? 0),
    low_stock_threshold: String(inventory?.low_stock_threshold ?? 0),
    unavailable_dates: (inventory?.unavailable_dates ?? []).join('\n'),
  }
}

/** Product images are square, matching the customer gift card. */
