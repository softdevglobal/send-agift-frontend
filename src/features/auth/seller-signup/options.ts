import {
  Building2,
  FileCheck2,
  MapPin,
  ShieldCheck,
  Store,
  Truck,
  UserRound,
  type LucideIcon,
} from 'lucide-react'

import type {
  SellerContactRole,
  SellerRegistrationStatus,
  SellerTaxStatus,
} from '@/api/sellers'

export type SignupStep = {
  title: string
  caption: string
  heading: string
  intro: string
  icon: LucideIcon
}

export const signupSteps: SignupStep[] = [
  {
    title: 'Business',
    caption: 'Your legal details',
    heading: 'Let’s meet your business',
    intro: 'A few details to help us understand who’s behind the gifts.',
    icon: Building2,
  },
  {
    title: 'Your contact',
    caption: 'Who we can reach',
    heading: 'The person behind the business',
    intro: 'Tell us who will manage this seller account, and set your sign-in.',
    icon: UserRound,
  },
  {
    title: 'Addresses',
    caption: 'Where you operate',
    heading: 'Where the magic happens',
    intro: 'Keep your business, pickup and return locations organised.',
    icon: MapPin,
  },
  {
    title: 'Your shop',
    caption: 'Make it your own',
    heading: 'A little personality goes a long way',
    intro: 'Create the storefront customers will get to know.',
    icon: Store,
  },
  {
    title: 'Delivery',
    caption: 'Set your coverage',
    heading: 'Deliver on the moment',
    intro: 'Choose how far you deliver, what it costs and how long it takes.',
    icon: Truck,
  },
  {
    title: 'Verification',
    caption: 'Business & payouts',
    heading: 'A trusted shop starts here',
    intro: 'What happens after you register, before you can sell and get paid.',
    icon: ShieldCheck,
  },
  {
    title: 'Review',
    caption: 'One final look',
    heading: 'Looking good. Let’s review.',
    intro: 'Check your details, then create your seller account.',
    icon: FileCheck2,
  },
]

export const registrationStatuses: { value: SellerRegistrationStatus; label: string }[] = [
  { value: 'registered', label: 'Registered: I have a business identifier' },
  { value: 'pending', label: 'Registration is in progress' },
  { value: 'no_number', label: 'No business registration number has been issued' },
]

export const taxStatuses: { value: SellerTaxStatus; label: string }[] = [
  { value: 'registered', label: 'Yes: add my registration details' },
  { value: 'not_registered', label: 'No tax registration to add' },
  { value: 'unsure', label: 'Not sure: review needed' },
]

export const contactRoles: { value: SellerContactRole; label: string }[] = [
  { value: 'owner', label: 'Owner / sole proprietor' },
  { value: 'director', label: 'Director / partner' },
  { value: 'authorised', label: 'Authorised representative' },
]

export const shopCategories = [
  { value: 'flowers', label: 'Flowers & plants' },
  { value: 'hampers', label: 'Gift hampers' },
  { value: 'food', label: 'Food & treats' },
  { value: 'personalised', label: 'Personalised gifts' },
  { value: 'home', label: 'Home & lifestyle' },
  { value: 'beauty', label: 'Beauty & wellbeing' },
  { value: 'jewellery', label: 'Jewellery & accessories' },
  { value: 'toys', label: 'Toys & baby gifts' },
  { value: 'art', label: 'Art & handmade' },
  { value: 'other', label: 'Other physical gifts' },
]

export const giftOptions = [
  { value: 'message', label: 'Gift messages' },
  { value: 'wrapping', label: 'Gift wrapping' },
  { value: 'personalisation', label: 'Personalisation' },
]

export const workingDays = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
]

export type PublicLocation = 'city_country' | 'country_only' | 'full_pickup'

export const publicLocations: { value: PublicLocation; label: string }[] = [
  { value: 'city_country', label: 'City and country only' },
  { value: 'country_only', label: 'Country only' },
  { value: 'full_pickup', label: 'Full pickup address (physical shop)' },
]

export type IdentifierSuggestion = {
  value: string
  label: string
  /** Exact digit count, checked when the seller picks this type. */
  digits?: number
}

/** Common identifiers by ISO country code. Sellers can type any other. */
export const identifierSuggestions: Record<string, IdentifierSuggestion[]> = {
  AU: [
    { value: 'ABN', label: 'ABN, Australian Business Number', digits: 11 },
    { value: 'ACN', label: 'ACN, Australian Company Number', digits: 9 },
  ],
  NZ: [{ value: 'NZBN', label: 'NZBN, New Zealand Business Number', digits: 13 }],
  GB: [{ value: 'CRN', label: 'Companies House registration number' }],
  US: [{ value: 'EIN', label: 'EIN, Employer Identification Number', digits: 9 }],
  CA: [{ value: 'BN', label: 'BN, Business Number', digits: 9 }],
  FR: [
    { value: 'SIREN', label: 'SIREN', digits: 9 },
    { value: 'SIRET', label: 'SIRET', digits: 14 },
  ],
  JP: [{ value: 'JP_CN', label: 'Corporate Number (法人番号)', digits: 13 }],
  IN: [
    { value: 'CIN', label: 'CIN, Corporate Identification Number' },
    { value: 'UDYAM', label: 'Udyam registration number' },
  ],
  LK: [{ value: 'BRN', label: 'Business registration number' }],
  SG: [{ value: 'UEN', label: 'UEN, Unique Entity Number' }],
  AE: [{ value: 'TRADE_LICENCE', label: 'Trade / commercial licence number' }],
}

export const genericIdentifierSuggestions: IdentifierSuggestion[] = [
  { value: 'BUSINESS_REGISTRATION', label: 'Business registration number' },
  { value: 'TRADE_LICENCE', label: 'Trade licence number' },
  { value: 'COMPANY_NUMBER', label: 'Company number' },
]

export const taxSchemeSuggestions = ['GST', 'VAT', 'Sales tax', 'Income tax (business)']
