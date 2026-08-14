import type { SellerDetails } from '@/api/sellers'
import {
  verificationStatusLabel,
  type VerificationStatus,
} from '@/features/auth/seller-register-options'

export function sellerDisplayName(profile: SellerDetails) {
  return profile.trading_name?.trim() || profile.legal_name
}

export function sellerInitials(profile: SellerDetails) {
  const name = sellerDisplayName(profile)
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'S'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export function sellerVerificationLabel(status: string) {
  if (status in verificationStatusLabel) {
    return verificationStatusLabel[status as VerificationStatus]
  }
  return status
}

export function sellerSetupSteps(profile: SellerDetails) {
  return [
    {
      id: 'shop',
      label: 'Create a shop',
      done: (profile.shops?.length ?? 0) > 0,
    },
    {
      id: 'address',
      label: 'Add a pickup address',
      done: (profile.addresses?.length ?? 0) > 0,
    },
    {
      id: 'phone',
      label: 'Add a phone number',
      done: Boolean(profile.phone?.trim()),
    },
    {
      id: 'verify',
      label: 'Get verified',
      done: profile.verification_status === 'verified',
    },
  ]
}

export function sellerSetupProgress(profile: SellerDetails) {
  const steps = sellerSetupSteps(profile)
  const done = steps.filter((step) => step.done).length
  return {
    done,
    total: steps.length,
    percent: Math.round((done / steps.length) * 100),
  }
}

export function sellerVerificationTone(status: string) {
  if (status === 'verified') return 'bg-accent text-primary'
  if (status === 'pending') return 'bg-[oklch(0.96_0.04_85)] text-[oklch(0.48_0.1_80)]'
  if (status === 'rejected') return 'bg-destructive/10 text-destructive'
  return 'bg-muted text-muted-foreground'
}
