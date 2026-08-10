export const sellerCountries = [
  { value: 'LK', label: 'Sri Lanka' },
  { value: 'AU', label: 'Australia' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'SG', label: 'Singapore' },
  { value: 'IN', label: 'India' },
  { value: 'CA', label: 'Canada' },
] as const

export const sellerTypes = [
  { value: 'individual', label: 'Individual / Sole trader' },
  { value: 'company', label: 'Registered company' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'brand', label: 'Brand / Marketplace seller' },
] as const

export type VerificationStatus =
  | 'unverified'
  | 'pending'
  | 'verified'
  | 'rejected'

export const verificationStatusLabel: Record<VerificationStatus, string> = {
  unverified: 'Unverified',
  pending: 'Pending review',
  verified: 'Verified',
  rejected: 'Rejected',
}
