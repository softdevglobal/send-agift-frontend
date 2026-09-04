import type {
  Country,
  CustomsDeclarationInput,
  FulfilmentStatus,
  ParcelDistanceUnit,
  ParcelInput,
  ParcelMassUnit,
  RecipientAddress,
  SellerDetails,
  SellerOrderItemDetails,
  ShippingShipmentInput,
  ShippoRate,
} from '@/api/types'
import { minorToMajor } from '@/lib/money'

const RATEABLE_STATUSES: ReadonlySet<FulfilmentStatus> = new Set([
  'accepted',
  'preparing',
  'ready',
])

const ISO2 = /^[A-Z]{2}$/

export type ParcelFormState = {
  length: string
  width: string
  height: string
  distance_unit: ParcelDistanceUnit
  weight: string
  mass_unit: ParcelMassUnit
}

export type CustomsFormState = {
  contents_type: string
  contents_explanation: string
  non_delivery_option: string
  certify_signer: string
  eel_pfc: string
  incoterm: string
  description: string
  quantity: string
  net_weight: string
  mass_unit: ParcelMassUnit
  value_amount: string
  value_currency: string
  origin_country: string
  tariff_number: string
}

export const EMPTY_PARCEL_FORM: ParcelFormState = {
  length: '',
  width: '',
  height: '',
  distance_unit: 'cm',
  weight: '',
  mass_unit: 'kg',
}

export const DEFAULT_PARCEL_FORM: ParcelFormState = {
  length: '20',
  width: '15',
  height: '10',
  distance_unit: 'cm',
  weight: '1.200',
  mass_unit: 'kg',
}

export const EMPTY_CUSTOMS_FORM: CustomsFormState = {
  contents_type: 'MERCHANDISE',
  contents_explanation: '',
  non_delivery_option: 'RETURN',
  certify_signer: '',
  eel_pfc: 'NOEEI_30_37_a',
  incoterm: 'DDU',
  description: '',
  quantity: '1',
  net_weight: '',
  mass_unit: 'kg',
  value_amount: '',
  value_currency: 'USD',
  origin_country: '',
  tariff_number: '',
}

export function canAcceptOrderItem(status: string): boolean {
  return status === 'pending'
}

export function canGetShippingRates(status: string): boolean {
  return RATEABLE_STATUSES.has(status as FulfilmentStatus)
}

export function isDispatchedOrderItem(status: string): boolean {
  return status === 'dispatched'
}

export function hasShippingAddress(
  address?: RecipientAddress | null,
): address is RecipientAddress {
  return Boolean(address?.line1?.trim() && address?.city?.trim())
}

export function formatShippingAddress(address: RecipientAddress): string {
  return [
    address.line1,
    address.line2,
    address.city,
    address.region,
    address.postal_code,
  ]
    .filter(Boolean)
    .join(', ')
}

/** Shippo `amount` is already a major-unit string (e.g. "5.50"). */
export function formatShippoRateAmount(rate: Pick<ShippoRate, 'amount' | 'currency'>): string {
  const code = (rate.currency || 'USD').toUpperCase()
  const parsed = Number.parseFloat(rate.amount)
  if (!Number.isFinite(parsed)) return `${rate.amount} ${code}`
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
    }).format(parsed)
  } catch {
    return `${rate.amount} ${code}`
  }
}

export function newLabelIdempotencyKey(orderItemId: string): string {
  return `label-${orderItemId}-${crypto.randomUUID()}`
}

export function asIso2(value?: string | null): string | null {
  if (!value) return null
  const code = value.trim().toUpperCase()
  return ISO2.test(code) ? code : null
}

export function countryIsoFromId(
  countryId: string | undefined | null,
  countries: Country[],
): string | null {
  if (!countryId) return null
  return asIso2(countries.find((country) => country.id === countryId)?.iso_code)
}

type AddressCountryFields = {
  country_id?: string
  country?: string | null
  iso_code?: string | null
  country_code?: string | null
}

export function addressCountryIso(
  address: AddressCountryFields | null | undefined,
  countries: Country[],
): string | null {
  if (!address) return null
  return (
    asIso2(address.iso_code) ||
    asIso2(address.country_code) ||
    asIso2(address.country) ||
    countryIsoFromId(address.country_id, countries)
  )
}

export function customsValueFromMinor(amount: number, currency: string): string {
  return minorToMajor(amount, currency || 'USD').toFixed(2)
}

export function resolveShipFrom(args: {
  item: SellerOrderItemDetails
  seller: SellerDetails | null
  countries: Country[]
}): { iso: string | null; countryId: string | null; shopName: string | null } {
  const { item, seller, countries } = args
  const shop =
    seller?.shops?.find((entry) => entry.id === item.shop_id) ?? item.shop ?? null
  const shopAddress = seller?.addresses?.find((address) => address.id === shop?.address_id)
  const countryId = shopAddress?.country_id || seller?.country_id || null
  const iso =
    addressCountryIso(shopAddress, countries) ||
    asIso2((shop as { country?: string | null } | null)?.country) ||
    countryIsoFromId(countryId, countries)

  return {
    iso,
    countryId,
    shopName: shop?.name?.trim() || null,
  }
}

export function resolveShipTo(args: {
  item: SellerOrderItemDetails
  countries: Country[]
}): { iso: string | null; countryId: string | null } {
  const { item, countries } = args
  const countryId = item.shipping_address?.country_id || item.order?.country_id || null
  const iso =
    addressCountryIso(item.shipping_address, countries) ||
    countryIsoFromId(countryId, countries)

  return { iso, countryId }
}

export function isInternationalShipment(args: {
  item: SellerOrderItemDetails
  seller: SellerDetails | null
  countries: Country[]
}): boolean {
  const from = resolveShipFrom(args)
  const to = resolveShipTo(args)
  if (from.iso && to.iso) return from.iso !== to.iso
  if (from.countryId && to.countryId) return from.countryId !== to.countryId
  return false
}

function parcelHasAnyValue(parcel: ParcelFormState): boolean {
  return Boolean(
    parcel.length.trim() || parcel.width.trim() || parcel.height.trim() || parcel.weight.trim(),
  )
}

function requiredString(value: string, label: string): string | null {
  return value.trim() ? null : `${label} is required.`
}

export function defaultCustomsForm(args: {
  item: SellerOrderItemDetails
  certifySigner: string
  originCountry: string
}): CustomsFormState {
  const currency = args.item.order?.currency || args.item.product?.currency || 'USD'
  return {
    contents_type: 'MERCHANDISE',
    contents_explanation: '',
    non_delivery_option: 'RETURN',
    certify_signer: args.certifySigner,
    eel_pfc: 'NOEEI_30_37_a',
    incoterm: 'DDU',
    description: args.item.product?.name || 'Merchandise',
    quantity: String(Math.max(1, args.item.quantity || 1)),
    net_weight: DEFAULT_PARCEL_FORM.weight,
    mass_unit: DEFAULT_PARCEL_FORM.mass_unit,
    value_amount: customsValueFromMinor(args.item.unit_amount, currency),
    value_currency: currency.toUpperCase(),
    origin_country: args.originCountry,
    tariff_number: '',
  }
}

export function buildShippingRatesBody(
  international: boolean,
  parcel: ParcelFormState,
  customs: CustomsFormState,
): { body?: ShippingShipmentInput; error?: string } {
  const parcelInput = toParcelInput(parcel)
  if (typeof parcelInput === 'string') return { error: parcelInput }

  if (international) {
    if (!parcelInput) {
      return { error: 'Parcel length, width, height, and weight are required for international rates.' }
    }
    const customsInput = toCustomsInput(customs, parcelInput)
    if (typeof customsInput === 'string') return { error: customsInput }
    return { body: { parcel: parcelInput, customs_declaration: customsInput } }
  }

  if (parcelInput) return { body: { parcel: parcelInput } }
  return {}
}

function toParcelInput(parcel: ParcelFormState): ParcelInput | string | undefined {
  if (!parcelHasAnyValue(parcel)) return undefined
  const length = parcel.length.trim()
  const width = parcel.width.trim()
  const height = parcel.height.trim()
  const weight = parcel.weight.trim()
  if (!length || !width || !height || !weight) {
    return 'Parcel length, width, height, and weight are all required when sending parcel details.'
  }
  return {
    length,
    width,
    height,
    distance_unit: parcel.distance_unit,
    weight,
    mass_unit: parcel.mass_unit,
  }
}

function toCustomsInput(
  customs: CustomsFormState,
  parcel: ParcelInput,
): CustomsDeclarationInput | string {
  const contentsType = customs.contents_type.trim()
  const signer = customs.certify_signer.trim()
  const nonDelivery = customs.non_delivery_option.trim()
  const description = customs.description.trim()
  const origin = asIso2(customs.origin_country)
  const quantity = Number.parseInt(customs.quantity, 10)
  const netWeight = customs.net_weight.trim() || parcel.weight
  const valueAmount = customs.value_amount.trim()
  const valueCurrency = customs.value_currency.trim().toUpperCase()

  const missing =
    requiredString(contentsType, 'Contents type') ||
    requiredString(nonDelivery, 'Non-delivery option') ||
    requiredString(signer, 'Certify signer') ||
    requiredString(description, 'Customs item description') ||
    requiredString(netWeight, 'Customs item weight') ||
    requiredString(valueAmount, 'Customs item value') ||
    requiredString(valueCurrency, 'Customs item currency')
  if (missing) return missing
  if (!origin) return 'Origin country must be a 2-letter ISO code.'
  if (!Number.isFinite(quantity) || quantity < 1) {
    return 'Customs item quantity must be at least 1.'
  }

  const item = {
    description,
    quantity,
    net_weight: netWeight,
    mass_unit: customs.mass_unit || parcel.mass_unit || 'kg',
    value_amount: valueAmount,
    value_currency: valueCurrency,
    origin_country: origin,
    ...(customs.tariff_number.trim() ? { tariff_number: customs.tariff_number.trim() } : {}),
  }

  return {
    contents_type: contentsType,
    ...(customs.contents_explanation.trim()
      ? { contents_explanation: customs.contents_explanation.trim() }
      : {}),
    non_delivery_option: nonDelivery,
    certify_signer: signer,
    ...(customs.eel_pfc.trim() ? { eel_pfc: customs.eel_pfc.trim() } : {}),
    ...(customs.incoterm.trim() ? { incoterm: customs.incoterm.trim() } : {}),
    items: [item],
  }
}
