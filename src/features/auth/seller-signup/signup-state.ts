import type {
  SellerAddressInput,
  SellerContactRole,
  SellerRegisterRequest,
  SellerRegistrationStatus,
  SellerTaxStatus,
} from '@/api/sellers'
import type { Country, ShopDeliveryZone } from '@/api/types'
import {
  genericIdentifierSuggestions,
  identifierSuggestions,
  type PublicLocation,
} from '@/features/auth/seller-signup/options'
import { optionalString, slugify } from '@/lib/form'
import { currencyFractionDigits, majorToMinor } from '@/lib/money'

export type AddressDraft = {
  line1: string
  line2: string
  city: string
  region: string
  postal_code: string
  latitude: number | null
  longitude: number | null
}

export type IdentifierDraft = {
  key: string
  type: string
  value: string
  authority: string
  jurisdiction: string
}

export type TaxDraft = {
  key: string
  country_id: string
  jurisdiction: string
  scheme: string
  number: string
}

/** estimated_days "0" means same day, which needs cutoff_time. */
export type BandDraft = {
  key: string
  max_km: string
  price_major: string
  estimated_days: string
  cutoff_time: string
}

export type SignupState = {
  countryId: string
  sellerType: string
  legalName: string
  localName: string
  tradingName: string
  registrationStatus: SellerRegistrationStatus | ''
  registrationNote: string
  identifiers: IdentifierDraft[]
  taxStatus: SellerTaxStatus | ''
  taxes: TaxDraft[]

  contactName: string
  contactRole: SellerContactRole | ''
  contactJobTitle: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  authorityConfirmed: boolean

  registered: AddressDraft
  pickupSame: boolean
  pickup: AddressDraft
  returnSame: boolean
  returns: AddressDraft

  shopName: string
  shopSlug: string
  /** Once the seller edits the slug, the shop name stops overwriting it. */
  slugEdited: boolean
  description: string
  categories: string[]
  website: string
  timezone: string
  supportEmail: string
  publicLocation: PublicLocation
  giftOptions: string[]

  bands: BandDraft[]
  workingDays: string[]
  pickupEnabled: boolean
  returnsPolicy: string

  detailsConfirmed: boolean
  termsAccepted: boolean
  marketingOptIn: boolean
}

export type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error'

export type StepContext = {
  country: Country | null
  slugStatus: SlugStatus
}

let keySeq = 0
export function newKey(): string {
  keySeq += 1
  return `${Date.now().toString(36)}-${keySeq}`
}

export const emptyAddress: AddressDraft = {
  line1: '',
  line2: '',
  city: '',
  region: '',
  postal_code: '',
  latitude: null,
  longitude: null,
}

export function newIdentifier(type = ''): IdentifierDraft {
  return { key: newKey(), type, value: '', authority: '', jurisdiction: '' }
}

export function newTax(countryId = ''): TaxDraft {
  return { key: newKey(), country_id: countryId, jurisdiction: '', scheme: '', number: '' }
}

export function newBand(maxKm = '', days = '1'): BandDraft {
  return { key: newKey(), max_km: maxKm, price_major: '', estimated_days: days, cutoff_time: '' }
}

export function initialSignupState(): SignupState {
  return {
    countryId: '',
    sellerType: '',
    legalName: '',
    localName: '',
    tradingName: '',
    registrationStatus: '',
    registrationNote: '',
    identifiers: [newIdentifier()],
    taxStatus: '',
    taxes: [],

    contactName: '',
    contactRole: '',
    contactJobTitle: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    authorityConfirmed: false,

    registered: { ...emptyAddress },
    pickupSame: true,
    pickup: { ...emptyAddress },
    returnSame: true,
    returns: { ...emptyAddress },

    shopName: '',
    shopSlug: '',
    slugEdited: false,
    description: '',
    categories: [],
    website: '',
    timezone: '',
    supportEmail: '',
    publicLocation: 'city_country',
    giftOptions: [],

    bands: [newBand('5'), newBand('15', '2')],
    workingDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
    pickupEnabled: false,
    returnsPolicy: '',

    detailsConfirmed: false,
    termsAccepted: false,
    marketingOptIn: false,
  }
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/

export function suggestionsFor(country: Country | null) {
  const iso = country?.iso_code?.toUpperCase() ?? ''
  return [...(identifierSuggestions[iso] ?? []), ...genericIdentifierSuggestions]
}

export function pickupOrigin(s: SignupState): AddressDraft {
  return s.pickupSame ? s.registered : s.pickup
}

function hasCoordinates(address: AddressDraft): boolean {
  return address.latitude !== null && address.longitude !== null
}

function addressErrors(address: AddressDraft, name: string): string[] {
  const errors: string[] = []
  if (!address.line1.trim()) errors.push(`Add the street line of the ${name}.`)
  if (!address.city.trim()) errors.push(`Add the city or town of the ${name}.`)
  return errors
}

/** Every reason the step cannot continue, worded for the seller. Empty means valid. */
export function validateStep(step: number, s: SignupState, ctx: StepContext): string[] {
  const errors: string[] = []
  const push = (condition: boolean, message: string) => {
    if (condition) errors.push(message)
  }

  if (step === 0) {
    push(!s.countryId, 'Choose the country where your business is registered.')
    push(!s.sellerType, 'Choose your business type.')
    push(!s.legalName.trim(), 'Add your legal business name.')
    push(!s.registrationStatus, 'Choose your business registration status.')
    if (s.registrationStatus === 'registered') {
      const filled = s.identifiers.filter((item) => item.type.trim() || item.value.trim())
      push(filled.length === 0, 'Add at least one business identifier.')
      const known = suggestionsFor(ctx.country)
      for (const item of filled) {
        if (!item.type.trim() || !item.value.trim()) {
          errors.push('Each business identifier needs a type and a number.')
          continue
        }
        const rule = known.find((k) => k.value.toUpperCase() === item.type.trim().toUpperCase())
        const digits = item.value.replace(/[\s.-]/g, '')
        if (rule?.digits && !new RegExp(`^\\d{${rule.digits}}$`).test(digits)) {
          errors.push(`Check the ${rule.value} format: ${rule.digits} digits.`)
        }
      }
    }
    if (s.registrationStatus === 'pending' || s.registrationStatus === 'no_number') {
      push(
        s.registrationNote.trim().length < 10,
        'Tell us about your registration status in at least 10 characters.',
      )
    }
    push(!s.taxStatus, 'Choose your tax registration status.')
    if (s.taxStatus === 'registered') {
      push(s.taxes.length === 0, 'Add at least one tax registration.')
      for (const tax of s.taxes) {
        if (!tax.country_id || !tax.scheme.trim() || !tax.number.trim()) {
          errors.push('Each tax registration needs a country, a tax type and a number.')
          break
        }
      }
    }
  }

  if (step === 1) {
    push(!s.contactName.trim(), 'Add the full name of the person managing this account.')
    push(!s.contactRole, 'Choose your role in the business.')
    push(!emailPattern.test(s.email.trim()), 'Enter a valid business email.')
    push(s.phone.replace(/\D/g, '').length < 7, 'Enter a contact phone number.')
    push(s.password.length < 8, 'Your password needs at least 8 characters.')
    push(s.password !== s.confirmPassword, 'The passwords don’t match.')
    push(!s.authorityConfirmed, 'Confirm you’re authorised to set up this seller account.')
  }

  if (step === 2) {
    errors.push(...addressErrors(s.registered, 'registered business address'))
    if (!s.pickupSame) errors.push(...addressErrors(s.pickup, 'pickup address'))
    if (!s.returnSame) errors.push(...addressErrors(s.returns, 'return address'))
    push(
      !hasCoordinates(pickupOrigin(s)),
      'Choose your pickup address from the search results. Delivery distance is measured from it.',
    )
  }

  if (step === 3) {
    push(!s.shopName.trim(), 'Add a shop display name.')
    push(
      !slugPattern.test(s.shopSlug),
      'Use lowercase letters, numbers and single hyphens for the shop URL name.',
    )
    push(ctx.slugStatus === 'taken', 'That shop URL name is taken. Try another.')
    push(s.description.trim().length < 20, 'Tell customers about your shop in at least 20 characters.')
    push(s.categories.length === 0, 'Choose at least one product category.')
    push(
      Boolean(s.website.trim()) && !/^https?:\/\/[^\s/]+\.[^\s]+$/i.test(s.website.trim()),
      'Use an http:// or https:// website address.',
    )
    push(
      Boolean(s.supportEmail.trim()) && !emailPattern.test(s.supportEmail.trim()),
      'Enter a valid public support email, or leave it blank.',
    )
    push(!s.timezone, 'Choose your business time zone.')
  }

  if (step === 4) {
    const currency = ctx.country?.default_currency ?? ''
    const decimals = currency ? currencyFractionDigits(currency) : 2
    push(s.bands.length === 0, 'Add at least one delivery band.')
    let previous = 0
    for (const band of s.bands) {
      const km = Number(band.max_km)
      if (!band.max_km.trim() || !Number.isFinite(km) || km <= 0) {
        errors.push('Each delivery band needs a distance above 0 km.')
        continue
      }
      if (km <= previous) errors.push('Each band must cover more kilometres than the one before it.')
      previous = km
      const price = Number(band.price_major)
      if (!band.price_major.trim() || !Number.isFinite(price) || price < 0) {
        errors.push('Each delivery band needs a price. Use 0 for free delivery.')
      } else if ((band.price_major.split('.')[1] ?? '').length > decimals) {
        errors.push(`${currency} prices use ${decimals} decimal places.`)
      }
      if (band.estimated_days === '0') {
        push(!timePattern.test(band.cutoff_time), 'A same-day band needs a cutoff time.')
      } else {
        const days = Number(band.estimated_days)
        push(!Number.isInteger(days) || days < 1, 'Delivery days must be a whole number of 1 or more.')
      }
    }
    push(s.workingDays.length === 0, 'Choose at least one working day.')
    push(s.returnsPolicy.trim().length < 10, 'Describe your returns process in at least 10 characters.')
  }

  if (step === 6) {
    push(!s.detailsConfirmed, 'Confirm your details are accurate.')
    push(!s.termsAccepted, 'Accept the seller terms and privacy notice.')
  }

  return [...new Set(errors)]
}

export function publicLocationText(s: SignupState, countryName: string): string {
  const origin = pickupOrigin(s)
  if (s.publicLocation === 'country_only') return countryName
  if (s.publicLocation === 'full_pickup') {
    return [origin.line1, origin.line2, origin.city, origin.region, countryName]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(', ')
  }
  return [origin.city.trim(), countryName].filter(Boolean).join(', ')
}

function addressInput(
  address: AddressDraft,
  countryId: string,
  type: SellerAddressInput['address_type'],
  isDefault = false,
): SellerAddressInput {
  return {
    country_id: countryId,
    address_type: type,
    line1: address.line1.trim(),
    line2: optionalString(address.line2),
    city: address.city.trim(),
    region: optionalString(address.region),
    postal_code: optionalString(address.postal_code),
    latitude: address.latitude,
    longitude: address.longitude,
    is_default: isDefault,
  }
}

export function bandsToZones(bands: BandDraft[], currency: string): ShopDeliveryZone[] {
  return bands.map((band) => {
    const days = Number(band.estimated_days)
    return {
      max_km: Math.round(Number(band.max_km) * 100) / 100,
      price_amount: majorToMinor(Number(band.price_major), currency),
      currency,
      estimated_days: days,
      ...(days === 0 ? { cutoff_time: band.cutoff_time } : {}),
    }
  })
}

/**
 * The one request that creates the account. The registered address is a
 * private record; the pickup address (a copy of it when "same as" is ticked)
 * is the delivery origin, and doubles as the return address when that box is
 * ticked too.
 */
export function buildRegisterRequest(s: SignupState, country: Country): SellerRegisterRequest {
  const addresses: SellerAddressInput[] = [addressInput(s.registered, s.countryId, 'registered')]
  addresses.push(addressInput(pickupOrigin(s), s.countryId, s.returnSame ? 'both' : 'pickup', true))
  if (!s.returnSame) addresses.push(addressInput(s.returns, s.countryId, 'return'))

  const registered = s.registrationStatus === 'registered'
  const taxRegistered = s.taxStatus === 'registered'

  return {
    country_id: s.countryId,
    seller_type: s.sellerType,
    legal_name: s.legalName.trim(),
    local_name: optionalString(s.localName),
    trading_name: optionalString(s.tradingName),
    registration_status: s.registrationStatus || undefined,
    registration_note: registered ? undefined : optionalString(s.registrationNote),
    identifiers: registered
      ? s.identifiers
          .filter((item) => item.type.trim() && item.value.trim())
          .map((item) => ({
            type: item.type.trim(),
            value: item.value.trim(),
            authority: optionalString(item.authority),
            jurisdiction: optionalString(item.jurisdiction),
          }))
      : undefined,
    tax_status: s.taxStatus || undefined,
    tax_registrations: taxRegistered
      ? s.taxes.map((tax) => ({
          country_id: tax.country_id,
          jurisdiction: optionalString(tax.jurisdiction),
          scheme: tax.scheme.trim(),
          number: tax.number.trim(),
        }))
      : undefined,

    contact_name: s.contactName.trim(),
    contact_role: s.contactRole || undefined,
    contact_job_title: optionalString(s.contactJobTitle),
    email: s.email.trim(),
    phone: optionalString(s.phone),
    password: s.password,
    authority_confirmed: s.authorityConfirmed,

    addresses,
    shop: {
      name: s.shopName.trim(),
      slug: s.shopSlug,
      description: s.description.trim(),
      country_id: s.countryId,
      timezone: s.timezone,
      customer_visible_location: publicLocationText(s, country.name),
      delivery_zones: bandsToZones(s.bands, country.default_currency),
      website: optionalString(s.website),
      support_email: optionalString(s.supportEmail),
      returns_policy: s.returnsPolicy.trim(),
      categories: s.categories,
      gift_options: s.giftOptions,
      working_days: s.workingDays,
      pickup_enabled: s.pickupEnabled,
    },

    terms_accepted: s.termsAccepted,
    marketing_opt_in: s.marketingOptIn,
  }
}

export function suggestedSlug(name: string): string {
  return slugify(name).slice(0, 60).replace(/-+$/, '')
}

const DRAFT_KEY = 'sendagift.seller-signup.v1'

type StoredDraft = { step: number; state: Partial<SignupState> }

/** Keeps progress across a refresh in this tab. Passwords are never stored. */
export function saveDraft(step: number, s: SignupState): void {
  try {
    const state: Partial<SignupState> = { ...s, password: '', confirmPassword: '' }
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ step, state } satisfies StoredDraft))
  } catch {
    // Storage full or disabled: the form still works, it just won't survive a refresh.
  }
}

export function loadDraft(): { step: number; state: SignupState } | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredDraft
    if (!parsed || typeof parsed !== 'object' || typeof parsed.state !== 'object') return null
    const step = Number.isInteger(parsed.step) ? Math.min(Math.max(parsed.step, 0), 6) : 0
    return { step, state: { ...initialSignupState(), ...parsed.state, password: '', confirmPassword: '' } }
  } catch {
    return null
  }
}

export function clearDraft(): void {
  try {
    sessionStorage.removeItem(DRAFT_KEY)
  } catch {
    // Nothing to clear.
  }
}
