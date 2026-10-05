import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Eye,
  EyeOff,
  FileText,
  Gift,
  HandHeart,
  Handshake,
  Landmark,
  LoaderCircle,
  Lock,
  MapPin,
  PackageCheck,
  Plus,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Store,
  Trash2,
  Truck,
  Upload,
  User,
  UserRound,
  Shapes,
  type LucideIcon,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import type { Country } from '@/api/countries'
import { registerSeller } from '@/api/sellers'
import type { ApplicationAddress, SellerApplication } from '@/api/types'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CountrySelectField } from '@/features/auth/country-select-field'
import { PasswordStrengthMeter } from '@/features/auth/password-strength'
import { PhoneField } from '@/features/auth/phone-field'
import {
  AddressFields,
  CheckRow,
  ChoiceCards,
  Chips,
  CountryCodeSelect,
  Field,
  SubHeading,
  ToggleCard,
} from '@/features/auth/seller-application/fields'
import {
  emptyAddress,
  inputClass,
  selectClass,
  textareaClass,
  type AddressDraft,
} from '@/features/auth/seller-application/form-values'
import { holdSellerDocument } from '@/features/auth/seller-application/held-document'
import {
  browserTimeZone,
  countryName,
  currencyDigits,
  currencyOptions,
  entityTypes,
  giftOptionChoices,
  identifierDigits,
  labelOf,
  languages,
  loadCountryRules,
  publicLocations,
  registrationStatuses,
  representativeRoles,
  ruleFor,
  shopCategories,
  taxStatuses,
  timeZoneOptions,
  weekDays,
  type CountryRule,
} from '@/features/auth/seller-application/options'
import { ApiError, getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

const entityIcons: Record<string, LucideIcon> = {
  sole_proprietor: User,
  company: Building2,
  partnership: Handshake,
  nonprofit: HandHeart,
  trust: Landmark,
  other: Shapes,
}

const steps: { label: string; title: string; subtitle: string; icon: LucideIcon }[] = [
  {
    label: 'Business',
    title: 'Let’s meet your business',
    subtitle: 'A few details to help us understand who’s behind the gifts.',
    icon: Building2,
  },
  {
    label: 'You',
    title: 'The person behind the business',
    subtitle: 'Who manages this seller account, and how you sign in.',
    icon: UserRound,
  },
  {
    label: 'Addresses',
    title: 'Where the magic happens',
    subtitle: 'Your registered, pickup and return addresses.',
    icon: MapPin,
  },
  {
    label: 'Shop',
    title: 'A little personality goes a long way',
    subtitle: 'The storefront customers will get to know.',
    icon: Store,
  },
  {
    label: 'Delivery',
    title: 'Deliver on the moment',
    subtitle: 'Where you deliver, what it costs and how long it takes.',
    icon: Truck,
  },
  {
    label: 'Payouts',
    title: 'A trusted shop starts here',
    subtitle: 'Your business document and where you’d like to be paid.',
    icon: ShieldCheck,
  },
  {
    label: 'Review',
    title: 'Looking good. Let’s review.',
    subtitle: 'Check your details, then send your application.',
    icon: FileText,
  },
]

const LAST = steps.length - 1
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024
const documentTypes = ['application/pdf', 'image/jpeg', 'image/png']

type Identifier = { label: string; value: string }
type TaxRow = { country: string; jurisdiction: string; scheme: string; number: string }
type Band = { km: string; fee: string; days: string }

type FormState = {
  countryId: string
  countryIso: string
  entityType: string
  entityOther: string
  legalName: string
  localName: string
  tradingName: string
  registrationStatus: string
  idType: string
  idTypeOther: string
  registrationNumber: string
  authority: string
  jurisdiction: string
  extraIds: Identifier[]
  registrationNote: string
  taxStatus: string
  taxes: TaxRow[]

  fullName: string
  role: string
  jobTitle: string
  email: string
  phone: string
  language: string
  languageOther: string
  password: string
  confirmPassword: string
  authorityConfirmed: boolean

  registered: AddressDraft
  pickupSame: boolean
  pickup: AddressDraft
  returnSame: boolean
  returns: AddressDraft

  shopName: string
  slug: string
  slugEdited: boolean
  description: string
  categories: string[]
  website: string
  currency: string
  currencyEdited: boolean
  timeZone: string
  timeZoneEdited: boolean
  supportEmail: string
  publicLocation: string
  giftOptions: string[]

  deliveryEnabled: boolean
  pickupEnabled: boolean
  bands: Band[]
  cutoff: string
  deliveryNotes: string
  workingDays: string[]
  pickupInstructions: string
  returnsPolicy: string
  crossBorder: boolean

  document: File | null
  bankCountry: string
  bankCountryOther: string
  payoutCurrency: string

  detailsConfirmed: boolean
  termsAccepted: boolean
  marketing: boolean
}

const initialState: FormState = {
  countryId: '',
  countryIso: '',
  entityType: '',
  entityOther: '',
  legalName: '',
  localName: '',
  tradingName: '',
  registrationStatus: '',
  idType: '',
  idTypeOther: '',
  registrationNumber: '',
  authority: '',
  jurisdiction: '',
  extraIds: [],
  registrationNote: '',
  taxStatus: '',
  taxes: [],
  fullName: '',
  role: '',
  jobTitle: '',
  email: '',
  phone: '',
  language: 'en',
  languageOther: '',
  password: '',
  confirmPassword: '',
  authorityConfirmed: false,
  registered: emptyAddress(),
  pickupSame: true,
  pickup: emptyAddress(),
  returnSame: true,
  returns: emptyAddress(),
  shopName: '',
  slug: '',
  slugEdited: false,
  description: '',
  categories: [],
  website: '',
  currency: '',
  currencyEdited: false,
  timeZone: browserTimeZone(),
  timeZoneEdited: false,
  supportEmail: '',
  publicLocation: 'city_country',
  giftOptions: [],
  deliveryEnabled: true,
  pickupEnabled: false,
  bands: [
    { km: '5', fee: '', days: '1' },
    { km: '15', fee: '', days: '2' },
  ],
  cutoff: '14:00',
  deliveryNotes: '',
  workingDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
  pickupInstructions: '',
  returnsPolicy: '',
  crossBorder: false,
  document: null,
  bankCountry: '',
  bankCountryOther: '',
  payoutCurrency: '',
  detailsConfirmed: false,
  termsAccepted: false,
  marketing: false,
}

type Errors = Record<string, string>

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
const compactPhone = (phone: string) => phone.replace(/[\s().-]/g, '')

/** What has to be fixed before leaving a step. */
function validateStep(step: number, f: FormState): Errors {
  const e: Errors = {}
  if (step === 0) {
    if (!f.countryId) e.countryId = 'Choose where your business is registered.'
    if (!f.entityType) e.entityType = 'Choose your business type.'
    if (f.entityType === 'other' && !f.entityOther.trim())
      e.entityOther = 'Enter your legal structure.'
    if (!f.legalName.trim()) e.legalName = 'Enter your legal business name.'
    if (!f.registrationStatus) e.registrationStatus = 'Choose your registration status.'
    if (f.registrationStatus === 'registered') {
      const n = f.registrationNumber.replace(/\s/g, '')
      if (!n) e.registrationNumber = 'Enter your business identifier.'
      else if (
        identifierDigits[f.idType] &&
        !new RegExp(`^\\d{${identifierDigits[f.idType]}}$`).test(n)
      )
        e.registrationNumber = `Check the ${f.idType}: it has ${identifierDigits[f.idType]} digits.`
      if (f.idType === 'OTHER' && !f.idTypeOther.trim()) e.idTypeOther = 'Name this identifier.'
      f.extraIds.forEach((id, i) => {
        if (!id.label.trim() || !id.value.trim()) e[`extraId${i}`] = 'Enter a name and a number.'
      })
    }
    if (
      ['pending', 'no_number'].includes(f.registrationStatus) &&
      f.registrationNote.trim().length < 10
    )
      e.registrationNote = 'Tell us a little more (at least 10 characters).'
    if (!f.taxStatus) e.taxStatus = 'Choose your tax status.'
    if (f.taxStatus === 'registered') {
      if (f.taxes.length === 0) e.taxStatus = 'Add at least one tax registration.'
      f.taxes.forEach((t, i) => {
        if (!t.country || !t.scheme.trim() || !t.number.trim())
          e[`tax${i}`] = 'Each tax registration needs a country, a type and a number.'
      })
    }
  }
  if (step === 1) {
    if (!f.fullName.trim()) e.fullName = 'Enter your full name.'
    if (!f.role) e.role = 'Choose your role.'
    if (!emailPattern.test(f.email.trim())) e.email = 'Enter a valid email.'
    if (!/^\+[1-9]\d{6,14}$/.test(compactPhone(f.phone)))
      e.phone = 'Enter your phone number with its country code.'
    if (f.language === 'other' && !f.languageOther.trim()) e.languageOther = 'Enter your language.'
    if (f.password.length < 8) e.password = 'Your password needs at least 8 characters.'
    else if (f.password !== f.confirmPassword) e.confirmPassword = 'The passwords don’t match.'
    if (!f.authorityConfirmed) e.authorityConfirmed = 'Confirm you can set up this account.'
  }
  if (step === 2) {
    const check = (key: string, a: AddressDraft) => {
      if (!a.country) e[`${key}.country`] = 'Choose the country.'
      if (a.country === 'ZZ' && !a.countryOther.trim())
        e[`${key}.countryOther`] = 'Enter the country.'
      if (!a.line1.trim()) e[`${key}.line1`] = 'Enter the street address.'
      if (!a.city.trim()) e[`${key}.city`] = 'Enter the city or town.'
    }
    check('registered', f.registered)
    if (!f.pickupSame) check('pickup', f.pickup)
    if (!f.returnSame) check('returns', f.returns)
  }
  if (step === 3) {
    if (!f.shopName.trim()) e.shopName = 'Give your shop a name.'
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(f.slug))
      e.slug = 'Use lowercase letters, numbers and single hyphens.'
    if (f.description.trim().length < 20)
      e.description = 'Add at least 20 characters about your shop.'
    if (f.categories.length === 0) e.categories = 'Choose at least one thing you’ll sell.'
    if (f.website.trim() && !/^https?:\/\/\S+\.\S+/i.test(f.website.trim()))
      e.website = 'Use a full web address starting with https://'
    if (!f.currency) e.currency = 'Choose your shop currency.'
    if (!f.timeZone) e.timeZone = 'Choose your time zone.'
    if (f.supportEmail.trim() && !emailPattern.test(f.supportEmail.trim()))
      e.supportEmail = 'Check the support email.'
  }
  if (step === 4) {
    if (!f.deliveryEnabled && !f.pickupEnabled) e.fulfilment = 'Choose delivery, pickup or both.'
    if (f.workingDays.length === 0) e.workingDays = 'Choose at least one working day.'
    if (f.deliveryEnabled) {
      if (f.bands.length === 0) e.bands = 'Add at least one delivery band.'
      const decimals = currencyDigits(f.currency || 'USD')
      let previous = 0
      f.bands.forEach((b, i) => {
        const km = Number(b.km)
        if (!b.km || !(km > previous) || km > 20000)
          e[`band${i}`] = 'Each band must reach further than the one before.'
        else if (b.fee === '' || Number(b.fee) < 0 || Number.isNaN(Number(b.fee)))
          e[`band${i}`] = 'Enter a delivery price (0 for free).'
        else if ((b.fee.split('.')[1] ?? '').length > decimals)
          e[`band${i}`] = `${f.currency} prices use ${decimals} decimal places.`
        else if (b.days === '' || !Number.isInteger(Number(b.days)) || Number(b.days) < 0)
          e[`band${i}`] = 'Delivery days must be a whole number.'
        previous = Number.isNaN(km) ? previous : km
      })
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(f.cutoff)) e.cutoff = 'Set your daily order cutoff.'
    }
    if (f.pickupEnabled && !f.pickupInstructions.trim())
      e.pickupInstructions = 'Tell customers how pickup works.'
    if (!f.returnsPolicy.trim()) e.returnsPolicy = 'Describe your returns process.'
  }
  if (step === 5) {
    if (f.document && !documentTypes.includes(f.document.type))
      e.document = 'Use a PDF, JPG or PNG.'
    if (f.document && f.document.size > MAX_DOCUMENT_BYTES) e.document = 'The file is over 10 MB.'
    if (!f.bankCountry) e.bankCountry = 'Choose your bank’s country.'
    if (f.bankCountry === 'ZZ' && !f.bankCountryOther.trim())
      e.bankCountryOther = 'Enter the country.'
    if (!f.payoutCurrency) e.payoutCurrency = 'Choose your payout currency.'
  }
  if (step === 6) {
    if (!f.detailsConfirmed) e.detailsConfirmed = 'Confirm your details are accurate.'
    if (!f.termsAccepted) e.termsAccepted = 'Accept the seller terms and privacy notice.'
  }
  return e
}

/** Which step an error from the server belongs to. */
function stepForField(field: string | undefined): number {
  if (!field) return LAST
  const section = field.split('.')[0]
  return (
    {
      business: 0,
      phone: 1,
      representative: 1,
      addresses: 2,
      shop: 3,
      fulfilment: 4,
      payout: 5,
      consents: 6,
    }[section] ?? LAST
  )
}

const opt = (s: string) => (s.trim() ? s.trim() : null)

function toAddress(a: AddressDraft): ApplicationAddress {
  return {
    country: a.country,
    country_other: a.country === 'ZZ' ? opt(a.countryOther) : null,
    line1: a.line1.trim(),
    line2: opt(a.line2),
    city: a.city.trim(),
    region: opt(a.region),
    postal_code: opt(a.postal),
    latitude: a.latitude,
    longitude: a.longitude,
  }
}

function toApplication(f: FormState): SellerApplication {
  const registered = toAddress(f.registered)
  const pickup = f.pickupSame ? registered : toAddress(f.pickup)
  return {
    business: {
      country: f.countryIso,
      entity_type: f.entityType,
      entity_type_other: f.entityType === 'other' ? opt(f.entityOther) : null,
      legal_name: f.legalName.trim(),
      local_name: opt(f.localName),
      trading_name: opt(f.tradingName),
      registration_status:
        f.registrationStatus as SellerApplication['business']['registration_status'],
      registration_note: f.registrationStatus === 'registered' ? null : opt(f.registrationNote),
      identifiers:
        f.registrationStatus === 'registered'
          ? [
              {
                type: f.idType,
                type_label: f.idType === 'OTHER' ? opt(f.idTypeOther) : null,
                value: f.registrationNumber.trim(),
                authority: opt(f.authority),
                jurisdiction: opt(f.jurisdiction),
              },
              ...f.extraIds.map((id) => ({
                type: 'OTHER',
                type_label: opt(id.label),
                value: id.value.trim(),
              })),
            ]
          : [],
      tax_status: f.taxStatus as SellerApplication['business']['tax_status'],
      tax_registrations:
        f.taxStatus === 'registered'
          ? f.taxes.map((t) => ({
              country: t.country,
              jurisdiction: opt(t.jurisdiction),
              scheme: t.scheme.trim(),
              number: t.number.trim(),
            }))
          : [],
    },
    representative: {
      full_name: f.fullName.trim(),
      role: f.role,
      job_title: opt(f.jobTitle),
      language: f.language,
      language_other: f.language === 'other' ? opt(f.languageOther) : null,
      authority_confirmed: f.authorityConfirmed,
    },
    addresses: {
      registered,
      pickup,
      return: f.returnSame ? pickup : toAddress(f.returns),
      pickup_same_as_registered: f.pickupSame,
      return_same_as_pickup: f.returnSame,
    },
    shop: {
      display_name: f.shopName.trim(),
      slug: f.slug,
      description: f.description.trim(),
      categories: f.categories,
      website: opt(f.website),
      currency: f.currency,
      time_zone: f.timeZone,
      support_email: opt(f.supportEmail),
      public_location: f.publicLocation,
      gift_options: f.giftOptions,
    },
    fulfilment: {
      delivery_enabled: f.deliveryEnabled,
      pickup_enabled: f.pickupEnabled,
      bands: f.deliveryEnabled
        ? f.bands.map((b) => ({ up_to_km: Number(b.km), fee: Number(b.fee), days: Number(b.days) }))
        : [],
      order_cutoff: f.deliveryEnabled ? f.cutoff : null,
      delivery_notes: f.deliveryEnabled ? opt(f.deliveryNotes) : null,
      working_days: f.workingDays,
      pickup_instructions: f.pickupEnabled ? opt(f.pickupInstructions) : null,
      returns_policy: f.returnsPolicy.trim(),
      cross_border_interest: f.crossBorder,
    },
    payout: {
      bank_country: f.bankCountry,
      bank_country_other: f.bankCountry === 'ZZ' ? opt(f.bankCountryOther) : null,
      currency: f.payoutCurrency,
    },
    consents: {
      details_confirmed: f.detailsConfirmed,
      terms_accepted: f.termsAccepted,
      marketing_opt_in: f.marketing,
    },
  }
}

/**
 * Seller sign-up: a seven-step application about the business, the person
 * applying, addresses, the shop, delivery and payouts. After it, the seller
 * confirms their email with a code, then an admin reviews the application.
 */
export function SellerRegisterForm() {
  const navigate = useNavigate()
  const topRef = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState<FormState>(initialState)
  const [step, setStep] = useState(0)
  const [reached, setReached] = useState(0)
  const [errors, setErrors] = useState<Errors>({})
  const [rules, setRules] = useState<Record<string, CountryRule> | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailTaken, setEmailTaken] = useState(false)
  const [blockedByCountry, setBlockedByCountry] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    loadCountryRules()
      .then((r) => !cancelled && setRules(r))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  const rule = ruleFor(rules, form.countryIso, form.entityType)
  const idOptions = [...rule.ids, ['OTHER', 'Another business identifier'] as [string, string]]
  const registrationBlocked = Boolean(form.countryId && blockedByCountry[form.countryId])

  // Keep the identifier type valid for the country and business type.
  const idCodes = idOptions.map(([code]) => code).join(',')
  useEffect(() => {
    const codes = idCodes.split(',')
    if (!codes.includes(form.idType)) setForm((f) => ({ ...f, idType: codes[0] }))
  }, [idCodes, form.idType])

  function update(patch: Partial<FormState>) {
    setForm((f) => ({ ...f, ...patch }))
    const touched = Object.keys(patch)
    setErrors((current) => {
      const next = { ...current }
      for (const key of Object.keys(next)) {
        if (touched.some((t) => key === t || key.startsWith(`${t}.`))) delete next[key]
      }
      return next
    })
  }

  function handleCountry(country: Country | null) {
    if (!country) return
    const iso = country.iso_code.toUpperCase()
    setError(blockedByCountry[country.id] ?? null)
    setForm((f) => {
      const previous = f.countryIso
      const follow = (value: string) => !value || value === previous
      const currency = f.currencyEdited ? f.currency : country.default_currency || f.currency
      return {
        ...f,
        countryId: country.id,
        countryIso: iso,
        // A new country has different identifiers and tax schemes.
        idType: '',
        registrationNumber: f.countryIso === iso ? f.registrationNumber : '',
        authority: f.countryIso === iso ? f.authority : '',
        registered: follow(f.registered.country) ? { ...f.registered, country: iso } : f.registered,
        pickup: follow(f.pickup.country) ? { ...f.pickup, country: iso } : f.pickup,
        returns: follow(f.returns.country) ? { ...f.returns, country: iso } : f.returns,
        bankCountry: follow(f.bankCountry) ? iso : f.bankCountry,
        currency,
        payoutCurrency:
          !f.payoutCurrency || f.payoutCurrency === f.currency ? currency : f.payoutCurrency,
        timeZone: f.timeZoneEdited ? f.timeZone : country.default_timezone || f.timeZone,
      }
    })
  }

  function goTo(next: number) {
    setStep(next)
    setReached((r) => Math.max(r, next))
    setErrors({})
    requestAnimationFrame(() =>
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    )
  }

  function firstInvalidStep(): number | null {
    for (let i = 0; i <= LAST; i++) {
      if (Object.keys(validateStep(i, form)).length) return i
    }
    return null
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const stepErrors = validateStep(step, form)
    if (Object.keys(stepErrors).length) {
      setErrors(stepErrors)
      return
    }
    if (step < LAST) {
      goTo(step + 1)
      return
    }
    const invalid = firstInvalidStep()
    if (invalid !== null) {
      goTo(invalid)
      setErrors(validateStep(invalid, form))
      return
    }
    if (registrationBlocked) return setError(blockedByCountry[form.countryId])

    setIsSubmitting(true)
    setEmailTaken(false)
    try {
      const created = await registerSeller({
        country_id: form.countryId,
        legal_name: form.legalName.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: compactPhone(form.phone),
        application: toApplication(form),
      })
      holdSellerDocument(created.email, form.document)
      navigate(`/seller/verify-email?email=${encodeURIComponent(created.email)}`, { replace: true })
    } catch (err) {
      setIsSubmitting(false)
      if (err instanceof ApiError && err.status === 409) {
        setEmailTaken(true)
        goTo(1)
        return
      }
      const message = getErrorMessage(err, 'We couldn’t send your application.')
      if (err instanceof ApiError && err.status === 400) {
        const field = (err.body as { field?: string } | undefined)?.field
        const target = stepForField(field)
        if (target !== step) goTo(target)
      }
      setError(message)
      if (err instanceof ApiError && err.status === 403 && form.countryId) {
        setBlockedByCountry((current) => ({ ...current, [form.countryId]: message }))
        goTo(0)
      }
    }
  }

  const current = steps[step]
  const errorCount = Object.keys(errors).length

  return (
    <form
      onSubmit={handleSubmit}
      className="animate-fade-up mx-auto w-full max-w-[36rem] min-w-0 scroll-mt-6 space-y-7"
      style={{ animationDelay: '120ms' }}
      noValidate
    >
      <div ref={topRef} className="scroll-mt-6 space-y-5">
        <div className="space-y-2">
          <h2 className="font-display text-3xl leading-[1.05] tracking-tight text-foreground sm:text-4xl">
            Open your{' '}
            <span className="bg-gradient-to-r from-primary via-fuchsia-600 to-pink-500 bg-clip-text text-transparent">
              shop
            </span>
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Seven short steps. Our team reviews your application, then your shop goes live.
          </p>
        </div>
        <StepRail step={step} reached={reached} onSelect={goTo} disabled={isSubmitting} />
      </div>

      <section
        key={step}
        className="animate-fade-up space-y-6 rounded-3xl bg-background/80 p-5 shadow-[0_24px_60px_-40px] shadow-primary/40 ring-1 ring-border/60 sm:p-7"
      >
        <header className="flex items-start gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <current.icon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-primary">
              STEP {String(step + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
            </p>
            <h3 className="font-display text-2xl leading-tight text-foreground">{current.title}</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">{current.subtitle}</p>
          </div>
        </header>

        {errorCount > 0 ? (
          <p
            role="alert"
            className="rounded-xl bg-destructive/[0.06] px-3.5 py-2.5 text-sm text-destructive ring-1 ring-destructive/20"
          >
            Please check {errorCount === 1 ? '1 item' : `${errorCount} items`} below.
          </p>
        ) : null}

        <fieldset disabled={isSubmitting} className="min-w-0 space-y-5">
          {step === 0 ? (
            <BusinessStep
              form={form}
              update={update}
              errors={errors}
              rule={rule}
              idOptions={idOptions}
              onCountry={handleCountry}
            />
          ) : null}
          {step === 1 ? (
            <ContactStep
              form={form}
              update={update}
              errors={errors}
              emailTaken={emailTaken}
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword((v) => !v)}
              onUseOtherEmail={() => {
                setEmailTaken(false)
                update({ email: '' })
              }}
            />
          ) : null}
          {step === 2 ? (
            <AddressStep form={form} update={update} errors={errors} rules={rules} />
          ) : null}
          {step === 3 ? <ShopStep form={form} update={update} errors={errors} /> : null}
          {step === 4 ? <DeliveryStep form={form} update={update} errors={errors} /> : null}
          {step === 5 ? <PayoutStep form={form} update={update} errors={errors} /> : null}
          {step === 6 ? (
            <ReviewStep form={form} update={update} errors={errors} onEdit={goTo} />
          ) : null}
        </fieldset>

        <FormAlert error={error} />

        <div className="flex items-center gap-3 pt-1">
          {step > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => goTo(step - 1)}
              disabled={isSubmitting}
              className="h-12 rounded-full bg-background/70 px-5"
            >
              <ArrowLeft />
              Back
            </Button>
          ) : null}
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting || (step === 0 && registrationBlocked)}
            className="group h-12 flex-1 rounded-full text-sm font-semibold"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="animate-spin" />
                Sending your application…
              </>
            ) : step === LAST ? (
              <>
                Submit application
                <Sparkles />
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </Button>
        </div>
        {step === LAST ? (
          <p className="text-center text-xs text-muted-foreground">
            Next: a 6-digit code to confirm your email, then our team reviews your application.
          </p>
        ) : null}
      </section>

      <p className="text-center text-sm text-muted-foreground">
        Already registered?{' '}
        <Link to="/seller/login" className="font-medium text-primary hover:text-primary/80">
          Seller sign in
        </Link>
      </p>
    </form>
  )
}

function StepRail({
  step,
  reached,
  onSelect,
  disabled,
}: {
  step: number
  reached: number
  onSelect: (step: number) => void
  disabled: boolean
}) {
  return (
    <nav aria-label="Application steps" className="space-y-2.5">
      <ol className="flex items-center">
        {steps.map((s, i) => {
          const done = i !== step && i < Math.max(step, reached)
          const canOpen = i <= reached && !disabled
          return (
            <li key={s.label} className="flex flex-1 items-center last:flex-none">
              <button
                type="button"
                onClick={() => canOpen && onSelect(i)}
                disabled={!canOpen}
                aria-current={i === step ? 'step' : undefined}
                aria-label={`Step ${i + 1}: ${s.label}`}
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1 transition-all',
                  i === step
                    ? 'scale-110 bg-primary text-primary-foreground shadow-md shadow-primary/30 ring-primary'
                    : done
                      ? 'bg-primary/10 text-primary ring-primary/30 hover:bg-primary/20'
                      : 'bg-background text-muted-foreground ring-border',
                  canOpen && i !== step && 'cursor-pointer',
                )}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </button>
              {i < steps.length - 1 ? (
                <span
                  className={cn(
                    'mx-1 h-0.5 flex-1 rounded-full transition-colors',
                    i < step ? 'bg-primary/40' : 'bg-border',
                  )}
                />
              ) : null}
            </li>
          )
        })}
      </ol>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{steps[step].label}</span>
        <span className="text-muted-foreground">
          Step {step + 1} of {steps.length}
        </span>
      </div>
    </nav>
  )
}

type StepProps = {
  form: FormState
  update: (patch: Partial<FormState>) => void
  errors: Errors
}

function BusinessStep({
  form,
  update,
  errors,
  rule,
  idOptions,
  onCountry,
}: StepProps & {
  rule: CountryRule
  idOptions: [string, string][]
  onCountry: (country: Country | null) => void
}) {
  const idLabel =
    form.idType === 'OTHER'
      ? 'Registration / identifier number'
      : (idOptions.find(([code]) => code === form.idType)?.[1] ?? 'Business identifier')

  return (
    <>
      <div className="space-y-2">
        <CountrySelectField
          id="business-country"
          label="Where is your business registered?"
          value={form.countryId}
          onChange={(countryId) => update({ countryId })}
          onCountrySelected={onCountry}
          className="h-12"
        />
        {errors.countryId ? (
          <p className="text-xs font-medium text-destructive">{errors.countryId}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            The country of the legal business, even if you sell elsewhere.
          </p>
        )}
      </div>

      <Field id="entity-type" label="Business type" error={errors.entityType}>
        <ChoiceCards
          name="entity-type"
          value={form.entityType}
          onChange={(entityType) => update({ entityType })}
          error={Boolean(errors.entityType)}
          options={entityTypes.map((t) => ({ ...t, icon: entityIcons[t.value] }))}
        />
      </Field>
      {form.entityType === 'other' ? (
        <Field id="entity-other" label="Local legal structure" error={errors.entityOther}>
          <Input
            id="entity-other"
            placeholder="The legal form used in your country"
            value={form.entityOther}
            onChange={(e) => update({ entityOther: e.target.value })}
            className={inputClass}
          />
        </Field>
      ) : null}

      <Field
        id="legal-name"
        label="Legal business name"
        error={errors.legalName}
        hint="Exactly as registered. Sole traders use the name on their registration."
      >
        <Input
          id="legal-name"
          autoComplete="organization"
          placeholder="Exactly as registered"
          dir="auto"
          value={form.legalName}
          onChange={(e) => update({ legalName: e.target.value })}
          className={inputClass}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="local-name" label="Name in local script" optional>
          <Input
            id="local-name"
            placeholder="If different"
            dir="auto"
            value={form.localName}
            onChange={(e) => update({ localName: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field id="trading-name" label="Trading name" optional>
          <Input
            id="trading-name"
            placeholder="The name customers know"
            dir="auto"
            value={form.tradingName}
            onChange={(e) => update({ tradingName: e.target.value })}
            className={inputClass}
          />
        </Field>
      </div>

      <SubHeading title="Registration" />
      <Field id="registration-status" label="Registration status" error={errors.registrationStatus}>
        <ChoiceCards
          name="registration-status"
          value={form.registrationStatus}
          onChange={(registrationStatus) => update({ registrationStatus })}
          error={Boolean(errors.registrationStatus)}
          options={registrationStatuses}
        />
      </Field>

      {form.registrationStatus === 'registered' ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="id-type" label="Identifier type">
              <select
                id="id-type"
                value={form.idType}
                onChange={(e) => update({ idType: e.target.value })}
                className={selectClass}
              >
                {idOptions.map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="registration-number" label={idLabel} error={errors.registrationNumber}>
              <Input
                id="registration-number"
                placeholder="As on your certificate"
                value={form.registrationNumber}
                onChange={(e) => update({ registrationNumber: e.target.value })}
                className={inputClass}
              />
            </Field>
          </div>
          {form.idType === 'OTHER' ? (
            <Field id="id-type-other" label="Identifier name" error={errors.idTypeOther}>
              <Input
                id="id-type-other"
                placeholder="Name of your local identifier"
                value={form.idTypeOther}
                onChange={(e) => update({ idTypeOther: e.target.value })}
                className={inputClass}
              />
            </Field>
          ) : null}
          {rule.example ? (
            <p className="rounded-xl bg-accent/60 px-3.5 py-2.5 text-xs leading-relaxed text-accent-foreground ring-1 ring-primary/10">
              {rule.example}
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="authority" label="Issuing authority" optional>
              <Input
                id="authority"
                list="authority-suggestions"
                placeholder="Choose or type"
                value={form.authority}
                onChange={(e) => update({ authority: e.target.value })}
                className={inputClass}
              />
              <datalist id="authority-suggestions">
                {rule.authorities.map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            </Field>
            <Field id="jurisdiction" label={`Registration ${rule.region.toLowerCase()}`} optional>
              <Input
                id="jurisdiction"
                placeholder="If registered regionally"
                value={form.jurisdiction}
                onChange={(e) => update({ jurisdiction: e.target.value })}
                className={inputClass}
              />
            </Field>
          </div>
          {form.extraIds.map((id, i) => (
            <RecordCard
              key={i}
              title="Another identifier"
              error={errors[`extraId${i}`]}
              onRemove={() => update({ extraIds: form.extraIds.filter((_, j) => j !== i) })}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  aria-label="Identifier name"
                  placeholder="Identifier name"
                  value={id.label}
                  onChange={(e) =>
                    update({
                      extraIds: form.extraIds.map((x, j) =>
                        j === i ? { ...x, label: e.target.value } : x,
                      ),
                    })
                  }
                  className={inputClass}
                />
                <Input
                  aria-label="Identifier number"
                  placeholder="Number"
                  value={id.value}
                  onChange={(e) =>
                    update({
                      extraIds: form.extraIds.map((x, j) =>
                        j === i ? { ...x, value: e.target.value } : x,
                      ),
                    })
                  }
                  className={inputClass}
                />
              </div>
            </RecordCard>
          ))}
          {form.extraIds.length < 5 ? (
            <AddButton
              onClick={() => update({ extraIds: [...form.extraIds, { label: '', value: '' }] })}
            >
              Add another identifier
            </AddButton>
          ) : null}
        </div>
      ) : null}

      {['pending', 'no_number'].includes(form.registrationStatus) ? (
        <Field
          id="registration-note"
          label="Tell us about your registration"
          error={errors.registrationNote}
          hint="You can still apply. Our team will review your eligibility."
        >
          <textarea
            id="registration-note"
            rows={3}
            maxLength={1000}
            dir="auto"
            placeholder="What is pending, or why no number has been issued."
            value={form.registrationNote}
            onChange={(e) => update({ registrationNote: e.target.value })}
            className={textareaClass}
          />
        </Field>
      ) : null}

      <SubHeading title="Tax registration" note="Registrations can be in more than one country." />
      <Field
        id="tax-status"
        label="Do you have business tax registration details?"
        error={errors.taxStatus}
      >
        <select
          id="tax-status"
          value={form.taxStatus}
          onChange={(e) => {
            const taxStatus = e.target.value
            update({
              taxStatus,
              taxes:
                taxStatus === 'registered' && form.taxes.length === 0
                  ? [{ country: form.countryIso, jurisdiction: '', scheme: rule.tax, number: '' }]
                  : form.taxes,
            })
          }}
          className={selectClass}
        >
          <option value="" disabled>
            Choose tax status
          </option>
          {taxStatuses.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>
      {form.taxStatus === 'registered' ? (
        <div className="space-y-3">
          {form.taxes.map((t, i) => (
            <TaxRecord
              key={i}
              row={t}
              error={errors[`tax${i}`]}
              onChange={(row) => update({ taxes: form.taxes.map((x, j) => (j === i ? row : x)) })}
              onRemove={() => update({ taxes: form.taxes.filter((_, j) => j !== i) })}
            />
          ))}
          {form.taxes.length < 10 ? (
            <AddButton
              onClick={() =>
                update({
                  taxes: [
                    ...form.taxes,
                    { country: form.countryIso, jurisdiction: '', scheme: rule.tax, number: '' },
                  ],
                })
              }
            >
              Add a tax registration
            </AddButton>
          ) : null}
        </div>
      ) : null}
      <Notice icon={Lock}>
        Business details only. Personal tax IDs and identity documents are never asked for here.
      </Notice>
    </>
  )
}

function TaxRecord({
  row,
  error,
  onChange,
  onRemove,
}: {
  row: TaxRow
  error?: string
  onChange: (row: TaxRow) => void
  onRemove: () => void
}) {
  const [rules, setRules] = useState<Record<string, CountryRule> | null>(null)
  useEffect(() => {
    void loadCountryRules().then(setRules)
  }, [])
  const rule = ruleFor(rules, row.country, '')
  const listId = `tax-schemes-${row.country || 'none'}`
  return (
    <RecordCard title="Tax registration" error={error} onRemove={onRemove}>
      <div className="grid gap-3 sm:grid-cols-2">
        <CountryCodeSelect
          id={`tax-country-${listId}`}
          value={row.country}
          onChange={(country) => {
            const next = ruleFor(rules, country, '')
            onChange({ ...row, country, scheme: next.tax, number: '', jurisdiction: '' })
          }}
          placeholder="Tax country"
        />
        <Input
          aria-label={`${rule.region} or tax authority`}
          placeholder={`${rule.region} (optional)`}
          value={row.jurisdiction}
          onChange={(e) => onChange({ ...row, jurisdiction: e.target.value })}
          className={inputClass}
        />
        <Input
          aria-label="Tax type"
          list={listId}
          placeholder="VAT, GST or local tax"
          value={row.scheme}
          onChange={(e) => onChange({ ...row, scheme: e.target.value })}
          className={inputClass}
        />
        <datalist id={listId}>
          {[...new Set([rule.tax, ...rule.taxTypes])].map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <Input
          aria-label="Tax registration number"
          placeholder="Registration number"
          value={row.number}
          onChange={(e) => onChange({ ...row, number: e.target.value })}
          className={inputClass}
        />
      </div>
    </RecordCard>
  )
}

function ContactStep({
  form,
  update,
  errors,
  emailTaken,
  showPassword,
  onTogglePassword,
  onUseOtherEmail,
}: StepProps & {
  emailTaken: boolean
  showPassword: boolean
  onTogglePassword: () => void
  onUseOtherEmail: () => void
}) {
  const matches = form.confirmPassword.length > 0 && form.confirmPassword === form.password
  return (
    <>
      <Field id="full-name" label="Full name" error={errors.fullName}>
        <Input
          id="full-name"
          autoComplete="name"
          placeholder="The authorised representative"
          dir="auto"
          value={form.fullName}
          onChange={(e) => update({ fullName: e.target.value })}
          className={inputClass}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="role" label="Your role" error={errors.role}>
          <select
            id="role"
            value={form.role}
            onChange={(e) => update({ role: e.target.value })}
            className={selectClass}
          >
            <option value="" disabled>
              Select role
            </option>
            {representativeRoles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="job-title" label="Job title" optional>
          <Input
            id="job-title"
            autoComplete="organization-title"
            placeholder="e.g. Operations manager"
            value={form.jobTitle}
            onChange={(e) => update({ jobTitle: e.target.value })}
            className={inputClass}
          />
        </Field>
      </div>
      <Field
        id="seller-register-email"
        label="Business email"
        error={errors.email}
        hint="You sign in with it, and we send your code here. It isn’t shown on your shop."
      >
        <Input
          id="seller-register-email"
          type="email"
          autoComplete="email"
          placeholder="you@yourbusiness.com"
          value={form.email}
          onChange={(e) => update({ email: e.target.value })}
          className={cn(inputClass, emailTaken && 'ring-2 ring-amber-400')}
        />
      </Field>
      {emailTaken ? (
        <EmailTakenCard email={form.email.trim()} onUseOther={onUseOtherEmail} />
      ) : null}
      <Field
        id="seller-phone"
        label="Mobile / contact phone"
        error={errors.phone}
        hint="It can be from a different country to your business."
      >
        <PhoneField
          id="seller-phone"
          value={form.phone}
          onChange={(phone) => update({ phone })}
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="language" label="Preferred language">
          <select
            id="language"
            value={form.language}
            onChange={(e) => update({ language: e.target.value })}
            className={selectClass}
          >
            {languages.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </Field>
        {form.language === 'other' ? (
          <Field id="language-other" label="Language name" error={errors.languageOther}>
            <Input
              id="language-other"
              value={form.languageOther}
              onChange={(e) => update({ languageOther: e.target.value })}
              className={inputClass}
            />
          </Field>
        ) : null}
      </div>

      <SubHeading title="Secure your account" />
      <Field id="seller-create-password" label="Create a password" error={errors.password}>
        <div className="relative">
          <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="seller-create-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={(e) => update({ password: e.target.value })}
            className="h-12 bg-surface pr-11 pl-10"
          />
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute top-1/2 right-2.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <PasswordStrengthMeter password={form.password} />
      </Field>
      <Field id="seller-confirm-password" label="Confirm password" error={errors.confirmPassword}>
        <div className="relative">
          <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="seller-confirm-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Type it once more"
            value={form.confirmPassword}
            onChange={(e) => update({ confirmPassword: e.target.value })}
            className={cn(
              'h-12 bg-surface pr-11 pl-10',
              form.confirmPassword && !matches && 'ring-1 ring-destructive/40',
            )}
          />
          {matches ? (
            <span className="absolute top-1/2 right-3 flex size-6 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check className="size-3.5" />
            </span>
          ) : null}
        </div>
      </Field>
      <CheckRow
        id="authority-confirmed"
        checked={form.authorityConfirmed}
        onChange={(authorityConfirmed) => update({ authorityConfirmed })}
        label="I’m authorised to set up this seller account."
        note="If you’re applying for someone else, we may ask you to confirm it."
        error={errors.authorityConfirmed}
      />
    </>
  )
}

function AddressStep({
  form,
  update,
  errors,
  rules,
}: StepProps & { rules: Record<string, CountryRule> | null }) {
  return (
    <>
      <SubHeading title="Registered business address" note="Private. Only our team sees it." />
      <AddressFields
        id="registered"
        value={form.registered}
        onChange={(registered) => update({ registered })}
        rule={ruleFor(rules, form.registered.country, '')}
        errors={errors}
      />

      <SubHeading title="Pickup / dispatch address" note="Where your deliveries start from." />
      <CheckRow
        id="pickup-same"
        checked={form.pickupSame}
        onChange={(pickupSame) =>
          update({
            pickupSame,
            pickup:
              pickupSame || form.pickup.country
                ? form.pickup
                : emptyAddress(form.registered.country),
          })
        }
        label="Same as my registered address"
      />
      {!form.pickupSame ? (
        <AddressFields
          id="pickup"
          value={form.pickup}
          onChange={(pickup) => update({ pickup })}
          rule={ruleFor(rules, form.pickup.country, '')}
          errors={errors}
        />
      ) : null}

      <SubHeading title="Return address" note="Where returns are sent." />
      <CheckRow
        id="return-same"
        checked={form.returnSame}
        onChange={(returnSame) =>
          update({
            returnSame,
            returns:
              returnSame || form.returns.country
                ? form.returns
                : emptyAddress(form.registered.country),
          })
        }
        label="Same as my pickup address"
      />
      {!form.returnSame ? (
        <AddressFields
          id="returns"
          value={form.returns}
          onChange={(returns) => update({ returns })}
          rule={ruleFor(rules, form.returns.country, '')}
          errors={errors}
        />
      ) : null}
      <Notice icon={ShieldCheck}>
        You choose what customers see of your location in the next step. Home addresses stay hidden.
      </Notice>
    </>
  )
}

function ShopStep({ form, update, errors }: StepProps) {
  const pickup = form.pickupSame ? form.registered : form.pickup
  const location =
    form.publicLocation === 'country_only'
      ? countryName(pickup.country)
      : form.publicLocation === 'full_pickup'
        ? [pickup.line1, pickup.city, countryName(pickup.country)].filter(Boolean).join(', ')
        : [pickup.city, countryName(pickup.country)].filter(Boolean).join(', ')
  return (
    <>
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-accent to-pink-50 p-4 ring-1 ring-primary/15">
        <p className="text-[10px] font-semibold tracking-[0.18em] text-primary">SHOP PREVIEW</p>
        <p className="mt-1 font-display text-xl leading-tight break-words text-foreground">
          {form.shopName.trim() || form.tradingName.trim() || 'Your next great gift shop'}
        </p>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {form.description.trim() ||
            'A few words about your shop help customers find a gift that means more.'}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
          {location ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 ring-1 ring-border/60">
              <MapPin className="size-3 text-primary" />
              {location}
            </span>
          ) : null}
          {form.categories.slice(0, 2).map((c) => (
            <span
              key={c}
              className="rounded-full bg-background/80 px-2 py-0.5 ring-1 ring-border/60"
            >
              {labelOf(shopCategories, c)}
            </span>
          ))}
        </div>
      </div>

      <Field id="shop-name" label="Shop name" error={errors.shopName}>
        <Input
          id="shop-name"
          placeholder="A name worth remembering"
          dir="auto"
          maxLength={80}
          value={form.shopName}
          onChange={(e) =>
            update({
              shopName: e.target.value,
              ...(form.slugEdited ? {} : { slug: slugify(e.target.value) }),
            })
          }
          className={inputClass}
        />
      </Field>
      <Field
        id="shop-slug"
        label="Shop web address"
        error={errors.slug}
        hint="Lowercase letters, numbers and hyphens."
      >
        <div className="flex h-12 items-center overflow-hidden rounded-lg border border-input bg-surface focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
          <span className="shrink-0 pl-3 text-sm text-muted-foreground">sendagift.win/shop/</span>
          <input
            id="shop-slug"
            maxLength={60}
            placeholder="your-gift-shop"
            value={form.slug}
            onChange={(e) => update({ slug: e.target.value.toLowerCase(), slugEdited: true })}
            className="h-full min-w-0 flex-1 bg-transparent pr-3 text-sm outline-none"
          />
        </div>
      </Field>
      <Field
        id="shop-description"
        label="Tell customers about your shop"
        error={errors.description}
        hint={`${form.description.trim().length}/1000 · at least 20 characters`}
      >
        <textarea
          id="shop-description"
          rows={4}
          maxLength={1000}
          dir="auto"
          placeholder="What do you create or curate? What makes your gifts special?"
          value={form.description}
          onChange={(e) => update({ description: e.target.value })}
          className={textareaClass}
        />
      </Field>
      <Field id="categories" label="What will you sell?" error={errors.categories}>
        <Chips
          values={form.categories}
          onChange={(categories) => update({ categories })}
          options={shopCategories}
          error={Boolean(errors.categories)}
        />
      </Field>
      <Field id="website" label="Website or social profile" optional error={errors.website}>
        <Input
          id="website"
          type="url"
          placeholder="https://"
          value={form.website}
          onChange={(e) => update({ website: e.target.value })}
          className={inputClass}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="currency" label="Shop currency" error={errors.currency}>
          <select
            id="currency"
            value={form.currency}
            onChange={(e) => update({ currency: e.target.value, currencyEdited: true })}
            className={selectClass}
          >
            <option value="" disabled>
              Choose currency
            </option>
            {currencyOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field id="time-zone" label="Business time zone" error={errors.timeZone}>
          <select
            id="time-zone"
            value={form.timeZone}
            onChange={(e) => update({ timeZone: e.target.value, timeZoneEdited: true })}
            className={selectClass}
          >
            {timeZoneOptions.map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field
        id="support-email"
        label="Public support email"
        optional
        error={errors.supportEmail}
        hint="Shown to customers. Your sign-in email stays private."
      >
        <Input
          id="support-email"
          type="email"
          placeholder="support@yourbusiness.com"
          value={form.supportEmail}
          onChange={(e) => update({ supportEmail: e.target.value })}
          className={inputClass}
        />
      </Field>
      <Field id="public-location" label="Show on my shop">
        <select
          id="public-location"
          value={form.publicLocation}
          onChange={(e) => update({ publicLocation: e.target.value })}
          className={selectClass}
        >
          {publicLocations.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>
      <Field id="gift-options" label="Little extras you offer" optional>
        <Chips
          values={form.giftOptions}
          onChange={(giftOptions) => update({ giftOptions })}
          options={giftOptionChoices}
        />
      </Field>
    </>
  )
}

function DeliveryStep({ form, update, errors }: StepProps) {
  const currency = form.currency || 'your currency'
  const step = (() => {
    const d = currencyDigits(form.currency || 'USD')
    return d === 0 ? '1' : String(10 ** -d)
  })()
  return (
    <>
      <div className="space-y-2.5">
        <ToggleCard
          id="delivery-enabled"
          icon={Truck}
          title="I deliver"
          description="Yourself, or with a courier you arrange."
          checked={form.deliveryEnabled}
          onChange={(deliveryEnabled) => update({ deliveryEnabled })}
        />
        <ToggleCard
          id="pickup-enabled"
          icon={PackageCheck}
          title="Customers can pick up"
          description="They collect from your pickup address."
          checked={form.pickupEnabled}
          onChange={(pickupEnabled) => update({ pickupEnabled })}
        />
        {errors.fulfilment ? (
          <p className="text-xs font-medium text-destructive">{errors.fulfilment}</p>
        ) : null}
      </div>

      {form.deliveryEnabled ? (
        <div className="space-y-4">
          <SubHeading
            title="Delivery bands"
            note={`Distance from your pickup address. Prices in ${currency}.`}
          />
          <div className="space-y-2.5">
            <div className="grid grid-cols-[1fr_1fr_1fr_2.25rem] gap-2 px-1 text-[11px] font-medium text-muted-foreground">
              <span>Up to (km)</span>
              <span>Price</span>
              <span>Days</span>
              <span />
            </div>
            {form.bands.map((band, i) => {
              const set = (patch: Partial<Band>) =>
                update({ bands: form.bands.map((b, j) => (j === i ? { ...b, ...patch } : b)) })
              return (
                <div key={i}>
                  <div className="grid grid-cols-[1fr_1fr_1fr_2.25rem] items-center gap-2">
                    <Input
                      aria-label={`Band ${i + 1} distance in km`}
                      type="number"
                      inputMode="decimal"
                      min="0.1"
                      step="0.1"
                      placeholder="10"
                      value={band.km}
                      onChange={(e) => set({ km: e.target.value })}
                      className={inputClass}
                    />
                    <Input
                      aria-label={`Band ${i + 1} price`}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step={step}
                      placeholder="8"
                      value={band.fee}
                      onChange={(e) => set({ fee: e.target.value })}
                      className={inputClass}
                    />
                    <Input
                      aria-label={`Band ${i + 1} delivery days`}
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      placeholder="2"
                      value={band.days}
                      onChange={(e) => set({ days: e.target.value })}
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => update({ bands: form.bands.filter((_, j) => j !== i) })}
                      aria-label={`Remove band ${i + 1}`}
                      className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  {errors[`band${i}`] ? (
                    <p className="mt-1 text-xs font-medium text-destructive">
                      {errors[`band${i}`]}
                    </p>
                  ) : null}
                </div>
              )
            })}
            {errors.bands ? (
              <p className="text-xs font-medium text-destructive">{errors.bands}</p>
            ) : null}
            {form.bands.length < 10 ? (
              <AddButton
                onClick={() => {
                  const last = Number(form.bands.at(-1)?.km || 0)
                  update({
                    bands: [...form.bands, { km: String(last ? last * 2 : 5), fee: '', days: '' }],
                  })
                }}
              >
                Add delivery band
              </AddButton>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Bands go further each time. The first band that reaches a customer sets the price and
              days.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="cutoff"
              label="Daily order cutoff"
              error={errors.cutoff}
              hint="Later orders start the next working day."
            >
              <Input
                id="cutoff"
                type="time"
                value={form.cutoff}
                onChange={(e) => update({ cutoff: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field id="delivery-notes" label="Delivery notes" optional>
              <Input
                id="delivery-notes"
                placeholder="Delivery windows, access"
                value={form.deliveryNotes}
                onChange={(e) => update({ deliveryNotes: e.target.value })}
                className={inputClass}
              />
            </Field>
          </div>
        </div>
      ) : null}

      <Field
        id="working-days"
        label="Working days"
        error={errors.workingDays}
        hint={`In your time zone: ${form.timeZone.replace(/_/g, ' ')}`}
      >
        <Chips
          values={form.workingDays}
          onChange={(workingDays) => update({ workingDays })}
          options={weekDays}
          error={Boolean(errors.workingDays)}
        />
      </Field>

      {form.pickupEnabled ? (
        <Field
          id="pickup-instructions"
          label="Pickup instructions"
          error={errors.pickupInstructions}
        >
          <textarea
            id="pickup-instructions"
            rows={3}
            maxLength={1000}
            dir="auto"
            placeholder="Pickup times, how to book a collection, access"
            value={form.pickupInstructions}
            onChange={(e) => update({ pickupInstructions: e.target.value })}
            className={textareaClass}
          />
        </Field>
      ) : null}

      <Notice icon={Gift}>
        Preparation time is set on each product. Delivery estimates add it to these delivery days.
      </Notice>

      <SubHeading title="Returns & customer care" />
      <Field
        id="returns-policy"
        label="Your returns process"
        error={errors.returnsPolicy}
        hint="Customers’ legal rights always apply."
      >
        <textarea
          id="returns-policy"
          rows={4}
          maxLength={2000}
          dir="auto"
          placeholder="How customers ask for a return, which products have conditions, and who they contact."
          value={form.returnsPolicy}
          onChange={(e) => update({ returnsPolicy: e.target.value })}
          className={textareaClass}
        />
      </Field>
      <CheckRow
        id="cross-border"
        checked={form.crossBorder}
        onChange={(crossBorder) => update({ crossBorder })}
        label="I’m interested in delivering internationally."
        note="Just letting us know. International delivery needs a separate review."
      />
    </>
  )
}

function PayoutStep({ form, update, errors }: StepProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <Field
        id="business-document"
        label="Business registration document"
        optional
        error={errors.document}
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex w-full items-center gap-3.5 rounded-2xl border-2 border-dashed p-4 text-left transition-colors',
            form.document
              ? 'border-primary/40 bg-primary/[0.04]'
              : 'border-border bg-card hover:border-primary/40',
          )}
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {form.document ? <FileText className="size-5" /> : <Upload className="size-5" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">
              {form.document ? form.document.name : 'Upload your certificate or licence'}
            </span>
            <span className="block text-xs text-muted-foreground">
              {form.document
                ? `${(form.document.size / 1024 / 1024).toFixed(1)} MB · uploads after you confirm your email`
                : 'PDF, JPG or PNG, up to 10 MB. No personal ID.'}
            </span>
          </span>
          {form.document ? (
            <span
              role="button"
              tabIndex={0}
              aria-label="Remove document"
              onClick={(e) => {
                e.stopPropagation()
                update({ document: null })
                if (inputRef.current) inputRef.current.value = ''
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  update({ document: null })
                }
              }}
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </span>
          ) : null}
        </button>
        <input
          ref={inputRef}
          id="business-document"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className="sr-only"
          onChange={(e) => update({ document: e.target.files?.[0] ?? null })}
        />
      </Field>

      <SubHeading
        title="Payout preferences"
        note="Bank details are collected securely after approval."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="bank-country" label="Bank account country" error={errors.bankCountry}>
          <CountryCodeSelect
            id="bank-country"
            value={form.bankCountry}
            onChange={(bankCountry) => update({ bankCountry })}
          />
        </Field>
        <Field id="payout-currency" label="Payout currency" error={errors.payoutCurrency}>
          <select
            id="payout-currency"
            value={form.payoutCurrency}
            onChange={(e) => update({ payoutCurrency: e.target.value })}
            className={selectClass}
          >
            <option value="" disabled>
              Choose currency
            </option>
            {currencyOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {form.bankCountry === 'ZZ' ? (
        <Field id="bank-country-other" label="Bank country name" error={errors.bankCountryOther}>
          <Input
            id="bank-country-other"
            value={form.bankCountryOther}
            onChange={(e) => update({ bankCountryOther: e.target.value })}
            className={inputClass}
          />
        </Field>
      ) : null}
      <Notice icon={ShieldCheck}>
        You can apply now. Selling and payouts switch on once our team approves your account.
      </Notice>
    </>
  )
}

function ReviewStep({
  form,
  update,
  errors,
  onEdit,
}: StepProps & { onEdit: (step: number) => void }) {
  const address = (a: AddressDraft) =>
    [
      a.line1,
      a.line2,
      a.city,
      a.region,
      a.postal,
      a.country === 'ZZ' ? a.countryOther : countryName(a.country),
    ]
      .filter((x) => x && x.trim())
      .join(', ')
  const pickup = form.pickupSame ? form.registered : form.pickup
  const returns = form.returnSame ? pickup : form.returns
  const sections: [string, number, [string, string][]][] = [
    [
      'Business',
      0,
      [
        ['Country', countryName(form.countryIso)],
        [
          'Type',
          form.entityType === 'other'
            ? form.entityOther
            : labelOf(
                entityTypes.map((t) => [t.value, t.label] as const),
                form.entityType,
              ),
        ],
        ['Legal name', form.legalName],
        ['Trading name', form.tradingName],
        [
          'Registration',
          form.registrationStatus === 'registered'
            ? `${form.idType === 'OTHER' ? form.idTypeOther : form.idType} ${form.registrationNumber}`
            : labelOf(
                registrationStatuses.map((r) => [r.value, r.label] as const),
                form.registrationStatus,
              ),
        ],
        [
          'Tax',
          form.taxStatus === 'registered'
            ? form.taxes.map((t) => `${t.scheme} ${t.number}`).join('; ')
            : labelOf(
                taxStatuses.map((t) => [t.value, t.label] as const),
                form.taxStatus,
              ),
        ],
      ],
    ],
    [
      'You',
      1,
      [
        ['Name', form.fullName],
        [
          'Role',
          labelOf(
            representativeRoles.map((r) => [r.value, r.label] as const),
            form.role,
          ),
        ],
        ['Email', form.email],
        ['Phone', form.phone],
      ],
    ],
    [
      'Addresses',
      2,
      [
        ['Registered', address(form.registered)],
        ['Pickup', form.pickupSame ? 'Same as registered' : address(pickup)],
        ['Returns', form.returnSame ? 'Same as pickup' : address(returns)],
      ],
    ],
    [
      'Shop',
      3,
      [
        ['Name', form.shopName],
        ['Web address', `sendagift.win/shop/${form.slug}`],
        ['Sells', form.categories.map((c) => labelOf(shopCategories, c)).join(', ')],
        ['Currency', `${form.currency} · ${form.timeZone.replace(/_/g, ' ')}`],
      ],
    ],
    [
      'Delivery',
      4,
      [
        [
          'Delivery',
          form.deliveryEnabled
            ? form.bands
                .map((b) => `${b.km} km: ${form.currency} ${b.fee}, ${b.days} d`)
                .join(' · ')
            : 'Off',
        ],
        ['Pickup', form.pickupEnabled ? 'On' : 'Off'],
        ['Working days', form.workingDays.map((d) => labelOf(weekDays, d)).join(', ')],
      ],
    ],
    [
      'Payouts',
      5,
      [
        ['Document', form.document?.name ?? 'Not added'],
        [
          'Bank country',
          form.bankCountry === 'ZZ' ? form.bankCountryOther : countryName(form.bankCountry),
        ],
        ['Payout currency', form.payoutCurrency],
      ],
    ],
  ]
  return (
    <>
      <div className="space-y-3">
        {sections.map(([title, target, rows]) => (
          <div key={title} className="rounded-2xl bg-card p-4 ring-1 ring-border/60">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold">{title}</h4>
              <button
                type="button"
                onClick={() => onEdit(target)}
                className="text-xs font-semibold text-primary hover:text-primary/80"
              >
                Edit
              </button>
            </div>
            <dl className="grid grid-cols-[minmax(0,7rem)_1fr] gap-x-3 gap-y-1.5 text-sm">
              {rows.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="min-w-0 break-words">
                    {v?.trim() ? v : <span className="text-muted-foreground">Not given</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
      <div className="space-y-2.5">
        <CheckRow
          id="details-confirmed"
          checked={form.detailsConfirmed}
          onChange={(detailsConfirmed) => update({ detailsConfirmed })}
          label="These details are accurate and I’m authorised to apply."
          error={errors.detailsConfirmed}
        />
        <CheckRow
          id="terms-accepted"
          checked={form.termsAccepted}
          onChange={(termsAccepted) => update({ termsAccepted })}
          label={
            <>
              I accept the seller terms and{' '}
              <span className="inline-flex items-center gap-1 font-medium text-primary">
                <ScrollText className="size-3.5" />
                privacy notice
              </span>
              .
            </>
          }
          error={errors.termsAccepted}
        />
        <CheckRow
          id="marketing"
          checked={form.marketing}
          onChange={(marketing) => update({ marketing })}
          label="Send me seller tips and product updates."
          note="Optional."
        />
      </div>
    </>
  )
}

function RecordCard({
  title,
  error,
  onRemove,
  children,
}: {
  title: string
  error?: string
  onRemove: () => void
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'space-y-3 rounded-2xl bg-card p-3.5 ring-1',
        error ? 'ring-destructive/40' : 'ring-border/60',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${title.toLowerCase()}`}
          className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      {children}
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  )
}

function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full px-1 text-sm font-semibold text-primary hover:text-primary/80"
    >
      <Plus className="size-4" />
      {children}
    </button>
  )
}

function Notice({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <p className="flex items-start gap-2.5 rounded-xl bg-muted/60 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
      <Icon className="mt-px size-4 shrink-0 text-primary" />
      <span>{children}</span>
    </p>
  )
}

function EmailTakenCard({ email, onUseOther }: { email: string; onUseOther: () => void }) {
  return (
    <div
      role="status"
      className="animate-fade-up overflow-hidden rounded-2xl bg-gradient-to-br from-accent to-pink-50 p-5 ring-1 ring-primary/20"
    >
      <div className="flex items-start gap-3.5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-xl text-primary-foreground shadow-sm">
          👋
        </span>
        <div className="min-w-0">
          <p className="font-display text-xl leading-tight text-foreground">
            This email already has an account
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            <span className="font-medium break-all text-foreground">{email}</span> is already
            registered with SendAGift. Sign in to continue, or use a different email.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2.5">
        <Button asChild className="h-10 rounded-full px-5">
          <Link to={`/seller/login?email=${encodeURIComponent(email)}`}>
            Seller sign in
            <ArrowRight className="size-4" />
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-full bg-background/70 px-5"
          onClick={onUseOther}
        >
          Use a different email
        </Button>
      </div>
    </div>
  )
}
