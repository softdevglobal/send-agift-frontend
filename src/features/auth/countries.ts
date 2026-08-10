export const countries = [
  { value: 'LK', label: 'Sri Lanka' },
  { value: 'AU', label: 'Australia' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'SG', label: 'Singapore' },
  { value: 'IN', label: 'India' },
  { value: 'CA', label: 'Canada' },
] as const

export type CountryCode = (typeof countries)[number]['value']
