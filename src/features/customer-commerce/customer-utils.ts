import type { CustomerDetails } from '@/api/customers'
import {
  customerStatusLabel as statusCopy,
  type CustomerStatus,
} from '@/features/auth/customer-register-options'

export function customerDisplayName(profile: CustomerDetails) {
  return profile.display_name?.trim() || profile.email || 'Customer'
}

export function customerInitials(profile: CustomerDetails | null) {
  const source = profile?.display_name?.trim() || profile?.email || 'C'
  const parts = source.split(/[\s@._-]+/).filter(Boolean)
  const letters = parts.slice(0, 2).map((part) => part[0] ?? '')
  return (letters.join('') || 'C').toUpperCase()
}

export function customerAccountStatus(status: string) {
  if (status in statusCopy) {
    return statusCopy[status as CustomerStatus]
  }
  return status
}
