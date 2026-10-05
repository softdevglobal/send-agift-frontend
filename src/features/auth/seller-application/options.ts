/** Choices and country data for the seller application. */

export type CountryRule = {
  ids: [string, string][]
  tax: string
  region: string
  postal: string
  example: string
  taxTypes: string[]
  authorities: string[]
}

export const genericRule: CountryRule = {
  ids: [['BUSINESS_REG', 'Business / commercial registration number']],
  tax: 'Business tax registration',
  region: 'State / province / region',
  postal: 'Postal code',
  example: 'Enter the registration number and authority on your business certificate.',
  taxTypes: [],
  authorities: [],
}

let rulesPromise: Promise<Record<string, CountryRule>> | null = null

/** Country registration rules, loaded once and on demand (they are large). */
export function loadCountryRules() {
  rulesPromise ??= import('./world-rules.json').then(
    (m) => m.default as unknown as Record<string, CountryRule>,
  )
  return rulesPromise
}

const companyOnlyIds = ['ACN', 'CIN', 'LLPIN', 'COMPANY_NUMBER', 'JP_CN', 'CORPORATE_REG', 'NIPC']

/** The rule for a country, without company-only identifiers for sole traders. */
export function ruleFor(
  rules: Record<string, CountryRule> | null,
  country: string,
  entityType: string,
): CountryRule {
  const base = rules?.[country] ?? genericRule
  if (entityType !== 'sole_proprietor') return base
  const ids = base.ids.filter(([code]) => !companyOnlyIds.includes(code))
  return {
    ...base,
    ids: ids.length ? ids : [['BUSINESS_REG', 'Local business / sole trader registration number']],
  }
}

/** Identifiers with a fixed number of digits. */
export const identifierDigits: Record<string, number> = {
  ABN: 11,
  ACN: 9,
  BN: 9,
  NZBN: 13,
  SIREN: 9,
  SIRET: 14,
  JP_CN: 13,
}

const COUNTRY_CODES =
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(
    ' ',
  )

const regionNames =
  typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['en'], { type: 'region' }) : null

export function countryName(code: string | null | undefined): string {
  if (!code) return ''
  if (code === 'ZZ') return 'Other / not listed'
  try {
    return regionNames?.of(code) ?? code
  } catch {
    return code
  }
}

/** Every country and territory, by name, then "not listed". */
export const countryOptions: [string, string][] = [
  ...COUNTRY_CODES.map((c): [string, string] => [c, countryName(c)]).sort((a, b) =>
    a[1].localeCompare(b[1]),
  ),
  ['ZZ', 'Other / not listed'],
]

const supportedValuesOf = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] })
  .supportedValuesOf

export const currencyOptions: string[] = (
  supportedValuesOf?.('currency') ?? [
    'AUD',
    'CAD',
    'CHF',
    'CNY',
    'EUR',
    'GBP',
    'HKD',
    'INR',
    'JPY',
    'LKR',
    'NZD',
    'SGD',
    'USD',
    'ZAR',
  ]
).filter((c) => !/^(XAU|XAG|XPD|XPT|XTS|XXX)$/.test(c))

export const timeZoneOptions: string[] = [
  ...new Set([
    ...(supportedValuesOf?.('timeZone') ?? [
      'Africa/Johannesburg',
      'America/New_York',
      'Asia/Colombo',
      'Asia/Dubai',
      'Asia/Kolkata',
      'Asia/Singapore',
      'Australia/Sydney',
      'Europe/London',
      'Pacific/Auckland',
    ]),
    'UTC',
  ]),
].sort()

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** How many decimal places a currency uses. */
export function currencyDigits(code: string): number {
  try {
    return (
      new Intl.NumberFormat('en', {
        style: 'currency',
        currency: code,
      }).resolvedOptions().maximumFractionDigits ?? 2
    )
  } catch {
    return 2
  }
}

export const entityTypes = [
  { value: 'sole_proprietor', label: 'Individual', hint: 'Sole proprietor' },
  { value: 'company', label: 'Company', hint: 'Corporation' },
  { value: 'partnership', label: 'Partnership', hint: 'Or LLP' },
  { value: 'nonprofit', label: 'Nonprofit', hint: 'Charity' },
  { value: 'trust', label: 'Trust', hint: 'Trust structure' },
  { value: 'other', label: 'Other', hint: 'Local structure' },
] as const

export const registrationStatuses = [
  {
    value: 'registered',
    label: 'Registered',
    hint: 'I have a business identifier',
  },
  { value: 'pending', label: 'In progress', hint: 'Registration is pending' },
  { value: 'no_number', label: 'No number', hint: 'None has been issued' },
] as const

export const taxStatuses = [
  { value: 'registered', label: 'Yes, add my registration details' },
  { value: 'not_registered', label: 'No tax registration to add' },
  { value: 'unsure', label: 'Not sure, please review' },
] as const

export const representativeRoles = [
  { value: 'owner', label: 'Owner / sole proprietor' },
  { value: 'director', label: 'Director / partner' },
  { value: 'authorised', label: 'Authorised representative' },
] as const

export const languages: [string, string][] = [
  ['en', 'English'],
  ['ar', 'Arabic'],
  ['bn', 'Bengali'],
  ['zh', 'Chinese'],
  ['fr', 'French'],
  ['de', 'German'],
  ['hi', 'Hindi'],
  ['id', 'Indonesian'],
  ['it', 'Italian'],
  ['ja', 'Japanese'],
  ['ko', 'Korean'],
  ['ms', 'Malay'],
  ['ne', 'Nepali'],
  ['pt', 'Portuguese'],
  ['ru', 'Russian'],
  ['si', 'Sinhala'],
  ['es', 'Spanish'],
  ['ta', 'Tamil'],
  ['th', 'Thai'],
  ['tr', 'Turkish'],
  ['ur', 'Urdu'],
  ['vi', 'Vietnamese'],
  ['other', 'Other'],
]

export const shopCategories: [string, string][] = [
  ['flowers', 'Flowers & plants'],
  ['hampers', 'Gift hampers'],
  ['food', 'Food & treats'],
  ['personalised', 'Personalised gifts'],
  ['home', 'Home & lifestyle'],
  ['beauty', 'Beauty & wellbeing'],
  ['jewellery', 'Jewellery & accessories'],
  ['toys', 'Toys & baby gifts'],
  ['art', 'Art & handmade'],
  ['other', 'Other physical gifts'],
]

export const giftOptionChoices: [string, string][] = [
  ['message', 'Gift messages'],
  ['wrapping', 'Gift wrapping'],
  ['personalisation', 'Personalisation'],
]

export const publicLocations = [
  { value: 'city_country', label: 'City and country only' },
  { value: 'country_only', label: 'Country only' },
  { value: 'full_pickup', label: 'Full pickup address (physical shop)' },
] as const

export const weekDays: [string, string][] = [
  ['mon', 'Mon'],
  ['tue', 'Tue'],
  ['wed', 'Wed'],
  ['thu', 'Thu'],
  ['fri', 'Fri'],
  ['sat', 'Sat'],
  ['sun', 'Sun'],
]

export function labelOf(list: readonly (readonly [string, string])[], value: string) {
  return list.find(([v]) => v === value)?.[1] ?? value
}
