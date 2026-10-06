import type { CustomerDetails } from '@/api/customers'
import {
  customerStatusLabel as statusCopy,
  type CustomerStatus,
} from '@/features/auth/customer-register-options'

export function customerDisplayName(profile: CustomerDetails) {
  return profile.display_name?.trim() || profile.email || 'Customer'
}

/** What the header greets someone with: their first name, never the whole thing. */
export function customerFirstName(profile: CustomerDetails) {
  const name = profile.display_name?.trim()
  if (name) return name.split(/\s+/)[0]
  return profile.email?.split('@')[0] || 'Customer'
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
