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
import { sellerTermsVersion } from '@/features/legal/assent'

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
  /** Agrees to the free gift marketing budget SendAGift sets. Required. */
  freeGiftBudgetAccepted: boolean
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

/** A band starts free ("0"): a real value, not an empty box that only looks filled. */
export function newBand(maxKm = '', days = '1', price = '0'): BandDraft {
  return { key: newKey(), max_km: maxKm, price_major: price, estimated_days: days, cutoff_time: '' }
}

/**
 * The band "Add delivery band" appends: 10 km further than the last one and a
 * day slower (a same-day band is followed by next day), at the last band's
 * price. Every box holds a value the seller can keep or change.
 */
export function nextBand(bands: BandDraft[]): BandDraft {
  const last = bands[bands.length - 1]
  const lastKm = Number(last?.max_km)
  const km = Number.isFinite(lastKm) && lastKm > 0 ? String(Math.round(lastKm + 10)) : '10'
  const lastDays = Number(last?.estimated_days)
  const days = Number.isInteger(lastDays) && lastDays >= 0 ? String(Math.min(lastDays + 1, 30)) : '1'
  const price = last?.price_major.trim() ? last.price_major.trim() : '0'
  return newBand(km, days, price)
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
    freeGiftBudgetAccepted: false,
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

/**
 * One reason a step cannot continue: the message for the seller, and the id
 * of the field it is about, so the form can mark that field in red, show the
 * message under it and scroll to it. field is null when no one box is at
 * fault (for example, a server error).
 */
export type FieldIssue = { field: string | null; message: string }

function addressIssues(address: AddressDraft, name: string, idPrefix: string): FieldIssue[] {
  const issues: FieldIssue[] = []
  if (!address.line1.trim()) issues.push({ field: `${idPrefix}-line1`, message: `Add the street line of the ${name}.` })
  if (!address.city.trim()) issues.push({ field: `${idPrefix}-city`, message: `Add the city or town of the ${name}.` })
  return issues
}

/** Every reason the step cannot continue, each tied to its field. Empty means valid. */
export function stepIssues(step: number, s: SignupState, ctx: StepContext): FieldIssue[] {
  const issues: FieldIssue[] = []
  const push = (condition: boolean, message: string, field: string | null) => {
    if (condition) issues.push({ field, message })
  }

  if (step === 0) {
    push(!s.countryId, 'Choose the country where your business is registered.', 'signup-country')
    push(!s.sellerType, 'Choose your business type.', 'signup-business-type')
    push(!s.legalName.trim(), 'Add your legal business name.', 'signup-legal-name')
    push(!s.registrationStatus, 'Choose your business registration status.', 'signup-registration-status')
    if (s.registrationStatus === 'registered') {
      const filled = s.identifiers.filter((item) => item.type.trim() || item.value.trim())
      push(
        filled.length === 0,
        'Add at least one business identifier.',
        s.identifiers[0] ? `signup-id-value-${s.identifiers[0].key}` : null,
      )
      const known = suggestionsFor(ctx.country)
      for (const item of filled) {
        if (!item.type.trim() || !item.value.trim()) {
          push(
            true,
            'Each business identifier needs a type and a number.',
            !item.type.trim() ? `signup-id-type-${item.key}` : `signup-id-value-${item.key}`,
          )
          continue
        }
        const rule = known.find((k) => k.value.toUpperCase() === item.type.trim().toUpperCase())
        const digits = item.value.replace(/[\s.-]/g, '')
        if (rule?.digits && !new RegExp(`^\\d{${rule.digits}}$`).test(digits)) {
          push(true, `Check the ${rule.value} format: ${rule.digits} digits.`, `signup-id-value-${item.key}`)
        }
      }
    }
    if (s.registrationStatus === 'pending' || s.registrationStatus === 'no_number') {
      push(
        s.registrationNote.trim().length < 10,
        'Tell us about your registration status in at least 10 characters.',
        'signup-registration-note',
      )
    }
    push(!s.taxStatus, 'Choose your tax registration status.', 'signup-tax-status')
    if (s.taxStatus === 'registered') {
      push(s.taxes.length === 0, 'Add at least one tax registration.', 'signup-tax-status')
      for (const tax of s.taxes) {
        const missing = !tax.country_id
          ? `signup-tax-country-${tax.key}`
          : !tax.scheme.trim()
            ? `signup-tax-scheme-${tax.key}`
            : !tax.number.trim()
              ? `signup-tax-number-${tax.key}`
              : null
        if (missing) {
          push(true, 'Each tax registration needs a country, a tax type and a number.', missing)
          break
        }
      }
    }
  }

  if (step === 1) {
    push(!s.contactName.trim(), 'Add the full name of the person managing this account.', 'signup-contact-name')
    push(!s.contactRole, 'Choose your role in the business.', 'signup-contact-role')
    push(!emailPattern.test(s.email.trim()), 'Enter a valid business email.', 'signup-email')
    push(s.phone.replace(/\D/g, '').length < 7, 'Enter a contact phone number.', 'signup-phone')
    push(s.password.length < 8, 'Your password needs at least 8 characters.', 'signup-password')
    push(s.password !== s.confirmPassword, 'The passwords don’t match.', 'signup-confirm-password')
    push(!s.authorityConfirmed, 'Confirm you’re authorised to set up this seller account.', 'signup-authority')
  }

  if (step === 2) {
    issues.push(...addressIssues(s.registered, 'registered business address', 'signup-registered'))
    if (!s.pickupSame) issues.push(...addressIssues(s.pickup, 'pickup address', 'signup-pickup'))
    if (!s.returnSame) issues.push(...addressIssues(s.returns, 'return address', 'signup-returns'))
    push(
      !hasCoordinates(pickupOrigin(s)),
      'Choose your pickup address from the search results. Delivery distance is measured from it.',
      s.pickupSame ? 'signup-registered-search' : 'signup-pickup-search',
    )
  }

  if (step === 3) {
    push(!s.shopName.trim(), 'Add a shop display name.', 'signup-shop-name')
    push(
      !slugPattern.test(s.shopSlug),
      'Use lowercase letters, numbers and single hyphens for the shop URL name.',
      'signup-shop-slug',
    )
    push(ctx.slugStatus === 'taken', 'That shop URL name is taken. Try another.', 'signup-shop-slug')
    push(
      s.description.trim().length < 20,
      'Tell customers about your shop in at least 20 characters.',
      'signup-description',
    )
    push(s.categories.length === 0, 'Choose at least one product category.', 'signup-categories')
    push(
      Boolean(s.website.trim()) && !/^https?:\/\/[^\s/]+\.[^\s]+$/i.test(s.website.trim()),
      'Use an http:// or https:// website address.',
      'signup-website',
    )
    push(
      Boolean(s.supportEmail.trim()) && !emailPattern.test(s.supportEmail.trim()),
      'Enter a valid public support email, or leave it blank.',
      'signup-support-email',
    )
    push(!s.timezone, 'Choose your business time zone.', 'signup-timezone')
  }

  if (step === 4) {
    const currency = ctx.country?.default_currency ?? ''
    const decimals = currency ? currencyFractionDigits(currency) : 2
    push(s.bands.length === 0, 'Add at least one delivery band.', 'signup-add-band')
    let previous = 0
    for (const band of s.bands) {
      const km = Number(band.max_km)
      if (!band.max_km.trim() || !Number.isFinite(km) || km <= 0) {
        push(true, 'Each delivery band needs a distance above 0 km.', `band-km-${band.key}`)
        continue
      }
      push(km <= previous, 'Each band must cover more kilometres than the one before it.', `band-km-${band.key}`)
      previous = km
      // A blank price is free delivery, the same as 0.
      const priceText = band.price_major.trim() || '0'
      const price = Number(priceText)
      if (!Number.isFinite(price) || price < 0) {
        push(true, 'Each delivery band needs a price. Use 0 for free delivery.', `band-price-${band.key}`)
      } else {
        push(
          (priceText.split('.')[1] ?? '').length > decimals,
          `${currency} prices use ${decimals} decimal places.`,
          `band-price-${band.key}`,
        )
      }
      if (band.estimated_days === '0') {
        push(!timePattern.test(band.cutoff_time), 'A same-day band needs a cutoff time.', `band-cutoff-${band.key}`)
      } else {
        const days = Number(band.estimated_days)
        push(
          !Number.isInteger(days) || days < 1,
          'Delivery days must be a whole number of 1 or more.',
          `band-days-${band.key}`,
        )
      }
    }
    push(s.workingDays.length === 0, 'Choose at least one working day.', 'signup-working-days')
    push(
      s.returnsPolicy.trim().length < 10,
      'Describe your returns process in at least 10 characters.',
      'signup-returns-policy',
    )
  }

  if (step === 5) {
    push(
      !s.freeGiftBudgetAccepted,
      'Agree to the free gift program terms to continue.',
      'signup-free-gift-budget',
    )
  }

  if (step === 6) {
    push(!s.detailsConfirmed, 'Confirm your details are accurate.', 'signup-details-confirmed')
    push(!s.termsAccepted, 'Accept the seller terms and privacy notice.', 'signup-terms')
  }

  return issues
}

/** The step's problems as messages only, each once. Empty means valid. */
export function validateStep(step: number, s: SignupState, ctx: StepContext): string[] {
  return [...new Set(stepIssues(step, s, ctx).map((issue) => issue.message))]
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
    terms_version: s.termsAccepted ? sellerTermsVersion : undefined,
    accept_free_gift_budget: s.freeGiftBudgetAccepted,
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
