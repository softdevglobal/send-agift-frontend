import type { LotSource, NextAction } from '@/api/competition-points'
import { formatPriceAmount } from '@/lib/money'

export const SOURCE_LABEL: Record<LotSource, string> = {
  gift: 'Gift points',
  member_bonus: 'Member bonus',
  sponsored: 'Sponsored',
  compensation: 'Compensation',
}

export function formatMoney(minor: number | undefined, currency: string | undefined): string {
  if (minor === undefined || !currency) return '-'
  return formatPriceAmount(minor, currency)
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso: string | undefined): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Where a next action takes the customer, and what the button says. */
export function nextActionLink(action: NextAction | undefined): { to: string; label: string } | null {
  switch (action) {
    case 'shop':
      return { to: '/products', label: 'Keep shopping' }
    case 'verify_phone':
      return { to: '/account/profile', label: 'Verify my number' }
    case 'add_date_of_birth':
      return { to: '/account/profile', label: 'Add my date of birth' }
    case 'view_offers':
      return { to: '/membership', label: 'See memberships' }
    case 'view_membership':
    case 'manage_renewal':
      return { to: '/account/membership', label: 'My membership' }
    case 'send_gift':
      return { to: '/products', label: 'Send a gift' }
    case 'track_gift':
      return { to: '/orders', label: 'Track my gift' }
    case 'view_points':
    case 'view_earning_rules':
      return { to: '/account/competition-points', label: 'My competition points' }
    case 'view_competitions':
      return { to: '/competitions', label: 'See competitions' }
    case 'contact_support':
      return { to: '/legal/complaints', label: 'Contact support' }
    default:
      return null
  }
}

/** A fresh key for a request the server must not repeat. */
export function newRequestKey(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}
