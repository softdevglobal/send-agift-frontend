import {
  KNOWN_CURRENCIES,
  PARCEL_DISTANCE_UNITS,
  PARCEL_MASS_UNITS,
  type CustomerTypeVisibility,
  type InventoryInput,
  type KnownCurrency,
  type ParcelDistanceUnit,
  type ParcelInput,
  type ParcelMassUnit,
  type Product,
  type ProductInput,
  type ProductMedia,
  type ProductMediaInput,
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
export type ProductFormMedia = {
  object_path: string
  mime_type: string
  size_bytes: number
  /** Local or CDN URL for the wizard preview. */
  preview_url: string
}

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
  /**
   * Cover fallback when the product has no `media` yet (legacy listings).
   * Prefer the first image in `media` when present.
   */
  image_url: string
  media: ProductFormMedia[]
  available_qty: string
  reserved_qty: string
  low_stock_threshold: string
  unavailable_dates: string
  /** Shipping parcel — required for quotes and labels. */
  parcel_length: string
  parcel_width: string
  parcel_height: string
  parcel_distance_unit: ParcelDistanceUnit
  parcel_weight: string
  parcel_mass_unit: ParcelMassUnit
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
  media: [],
  available_qty: '0',
  reserved_qty: '0',
  low_stock_threshold: '0',
  unavailable_dates: '',
  parcel_length: '20',
  parcel_width: '15',
  parcel_height: '10',
  parcel_distance_unit: 'cm',
  parcel_weight: '1.200',
  parcel_mass_unit: 'kg',
}

export const MAX_PRODUCT_MEDIA = 8

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

function isPositiveDecimal(value: string): boolean {
  const parsed = Number(value)
  return value.trim() !== '' && Number.isFinite(parsed) && parsed > 0
}

/** Builds the API `parcel` object, or an error string if incomplete. */
export function toParcelInput(form: ProductFormState): ParcelInput | string {
  if (
    !isPositiveDecimal(form.parcel_length) ||
    !isPositiveDecimal(form.parcel_width) ||
    !isPositiveDecimal(form.parcel_height)
  ) {
    return 'Parcel length, width, and height must be numbers greater than 0.'
  }
  if (!isPositiveDecimal(form.parcel_weight)) {
    return 'Parcel weight must be a number greater than 0.'
  }
  if (
    !(PARCEL_DISTANCE_UNITS as readonly string[]).includes(form.parcel_distance_unit)
  ) {
    return 'Parcel distance unit must be cm or in.'
  }
  if (!(PARCEL_MASS_UNITS as readonly string[]).includes(form.parcel_mass_unit)) {
    return 'Parcel mass unit must be kg or lb.'
  }

  return {
    length: form.parcel_length.trim(),
    width: form.parcel_width.trim(),
    height: form.parcel_height.trim(),
    distance_unit: form.parcel_distance_unit,
    weight: form.parcel_weight.trim(),
    mass_unit: form.parcel_mass_unit,
  }
}

export function parcelComplete(form: ProductFormState): boolean {
  return typeof toParcelInput(form) !== 'string'
}

export function toInventoryInput(form: ProductFormState): InventoryInput {
  return {
    available_qty: parseNonNegativeInt(form.available_qty),
    reserved_qty: parseNonNegativeInt(form.reserved_qty),
    low_stock_threshold: parseNonNegativeInt(form.low_stock_threshold),
    unavailable_dates: parseDates(form.unavailable_dates),
  }
}

export function toMediaInputs(media: ProductFormMedia[]): ProductMediaInput[] {
  return media.map((item) => ({
    object_path: item.object_path,
    mime_type: item.mime_type,
    size_bytes: item.size_bytes,
  }))
}

export function mediaFromProduct(media?: ProductMedia[] | null): ProductFormMedia[] {
  if (!media?.length) return []
  return [...media]
    .sort((a, b) => a.position - b.position)
    .map((item) => {
      const mime =
        item.mime_type?.trim() ||
        (item.asset_type === 'video'
          ? 'video/mp4'
          : item.asset_type === 'image'
            ? 'image/jpeg'
            : '')
      return {
        object_path: item.object_path,
        mime_type: mime,
        size_bytes: item.size_bytes,
        preview_url: item.cdn_url?.trim() || '',
      }
    })
}

export function isProductVideoMime(mime: string): boolean {
  return mime.startsWith('video/')
}

export function isProductImageMedia(item: {
  mime_type: string
}): boolean {
  if (isProductVideoMime(item.mime_type)) return false
  if (item.mime_type.startsWith('image/')) return true
  // Missing mime — treat as image so covers still resolve.
  return !item.mime_type.trim()
}

export function coverImageUrl(form: ProductFormState): string {
  const firstImage = form.media.find(
    (item) => isProductImageMedia(item) && item.preview_url.trim(),
  )
  return firstImage?.preview_url.trim() || form.image_url.trim() || ''
}

/** Cover for list/preview cards — `image_url` or first gallery image. */
export function productCoverUrl(
  product: Pick<Product, 'image_url' | 'media'>,
): string | null {
  const direct = product.image_url?.trim()
  if (direct) return direct
  const media = [...(product.media ?? [])].sort((a, b) => a.position - b.position)
  const image = media.find(
    (item) =>
      item.asset_type === 'image' ||
      item.mime_type?.startsWith('image/') ||
      (!item.mime_type?.startsWith('video/') && item.asset_type !== 'video'),
  )
  return image?.cdn_url?.trim() || null
}

export type ToProductInputOptions = {
  includeInventory: boolean
  /**
   * Create: usually `replace` (send gallery).
   * Update: `omit` keeps the server gallery; `replace` overwrites (including `[]` to clear).
   */
  mediaMode?: 'omit' | 'replace'
}

export function toProductInput(
  form: ProductFormState,
  includeInventoryOrOptions: boolean | ToProductInputOptions,
): ProductInput | string {
  const options: ToProductInputOptions =
    typeof includeInventoryOrOptions === 'boolean'
      ? { includeInventory: includeInventoryOrOptions, mediaMode: 'replace' }
      : {
          includeInventory: includeInventoryOrOptions.includeInventory,
          mediaMode: includeInventoryOrOptions.mediaMode ?? 'replace',
        }

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

  const parcel = toParcelInput(form)
  if (typeof parcel === 'string') return parcel

  const input: ProductInput = {
    name: form.name.trim(),
    currency,
    parcel,
  }

  const slug = optionalString(form.slug)
  const description = optionalString(form.description)
  const productType = optionalString(form.product_type)
  if (slug) input.slug = slug
  if (description) input.description = description
  if (productType) input.product_type = productType

  if (options.mediaMode === 'replace') {
    input.media = toMediaInputs(form.media)
    // When a gallery is sent, let the API set the cover from the first image.
    // Only send image_url for legacy products that still have a cover and no media.
    if (form.media.length === 0) {
      input.image_url = optionalString(form.image_url) ?? null
    }
  } else {
    input.image_url = optionalString(form.image_url) ?? null
  }

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

  if (options.includeInventory) {
    input.inventory = toInventoryInput(form)
  }

  return input
}

export function productToForm(product: Product, inventory?: InventoryInput): ProductFormState {
  const parcel = product.parcel
  const media = mediaFromProduct(product.media)
  // Prefer API cover; fall back to first gallery image so edit/preview always has one.
  const imageUrl =
    product.image_url?.trim() ||
    media.find((item) => isProductImageMedia(item))?.preview_url.trim() ||
    ''
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
    image_url: imageUrl,
    media,
    available_qty: String(inventory?.available_qty ?? 0),
    reserved_qty: String(inventory?.reserved_qty ?? 0),
    low_stock_threshold: String(inventory?.low_stock_threshold ?? 0),
    unavailable_dates: (inventory?.unavailable_dates ?? []).join('\n'),
    parcel_length: parcel?.length?.trim() || emptyForm.parcel_length,
    parcel_width: parcel?.width?.trim() || emptyForm.parcel_width,
    parcel_height: parcel?.height?.trim() || emptyForm.parcel_height,
    parcel_distance_unit: parcel?.distance_unit || emptyForm.parcel_distance_unit,
    parcel_weight: parcel?.weight?.trim() || emptyForm.parcel_weight,
    parcel_mass_unit: parcel?.mass_unit || emptyForm.parcel_mass_unit,
  }
}
/** Product images are square, matching the customer gift card. */
