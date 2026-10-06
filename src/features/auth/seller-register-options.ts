export const sellerTypes = [
  { value: 'individual', label: 'Individual / Sole trader' },
  { value: 'company', label: 'Registered company' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'nonprofit', label: 'Nonprofit / charity' },
  { value: 'trust', label: 'Trust' },
  { value: 'brand', label: 'Brand / Marketplace seller' },
  { value: 'other', label: 'Other legal structure' },
] as const

export type SellerTypeValue = (typeof sellerTypes)[number]['value']

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
