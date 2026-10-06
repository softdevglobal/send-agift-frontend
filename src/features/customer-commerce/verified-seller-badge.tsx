import { BadgeCheck } from 'lucide-react'

import { cn } from '@/lib/utils'

/** Business check shown on product cards, shops, and seller profiles. */
export function VerifiedSellerBadge({
  status,
  className,
}: {
  status?: string
  className?: string
}) {
  if (!status) return null
  if (status === 'verified') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-primary',
          className,
        )}
      >
        <BadgeCheck className="size-3.5" />
        Verified seller
      </span>
    )
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground',
        className,
      )}
    >
      Not verified
    </span>
  )
}
