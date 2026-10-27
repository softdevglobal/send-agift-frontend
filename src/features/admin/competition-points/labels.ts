import type { ApprovalOperation, StopScope, VersionAction, VersionStatus } from '@/api/competition-points'

export const STATUS_TONE: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  awaiting_approval: 'bg-amber-100 text-amber-900',
  pending: 'bg-amber-100 text-amber-900',
  published: 'bg-emerald-100 text-emerald-900',
  active: 'bg-emerald-100 text-emerald-900',
  suspended: 'bg-orange-100 text-orange-900',
  retired: 'bg-muted text-muted-foreground',
  rejected: 'bg-red-100 text-red-900',
  revoked: 'bg-red-100 text-red-900',
  open: 'bg-amber-100 text-amber-900',
  resolved: 'bg-muted text-muted-foreground',
}

/** The status moves a versioned rule allows from where it is now. */
export function versionActions(status: VersionStatus): { action: VersionAction; label: string; danger?: boolean }[] {
  switch (status) {
    case 'draft':
      return [{ action: 'submit', label: 'Submit for approval' }]
    case 'awaiting_approval':
      return [
        { action: 'approve', label: 'Approve and publish' },
        { action: 'return_to_draft', label: 'Return to draft' },
      ]
    case 'published':
      return [
        { action: 'suspend', label: 'Suspend', danger: true },
        { action: 'retire', label: 'Retire', danger: true },
      ]
    case 'suspended':
      return [
        { action: 'resume', label: 'Resume' },
        { action: 'retire', label: 'Retire', danger: true },
      ]
    default:
      return []
  }
}

export const OPERATION_LABEL: Record<ApprovalOperation, string> = {
  membership_sale: 'Membership sales',
  membership_renewal: 'Membership renewals',
  gift_points_earning: 'Gift points earning',
  competition_entry: 'Competition entry',
  winner_payout: 'Winner payouts',
  seller_campaign_funding: 'Seller campaign funding',
}

export const STOP_LABEL: Record<StopScope, string> = {
  membership_sales: 'New membership sales',
  membership_renewals: 'Membership renewals',
  gift_points_earning: 'Gift points earning',
  competition_entries: 'New competition entries',
  competition_starts: 'Competition attempt starts',
  payouts: 'Winner payouts',
  campaign_commitments: 'Seller campaign commitments',
}

/**
 * What a Super Admin can do with a membership package. A draft is published
 * directly, with no second approver; the submit-and-approve steps stay for
 * reward policies.
 */
export function offerActions(status: VersionStatus): { action: VersionAction; label: string; danger?: boolean }[] {
  if (status === 'draft') return [{ action: 'publish', label: 'Publish' }]
  return versionActions(status)
}
