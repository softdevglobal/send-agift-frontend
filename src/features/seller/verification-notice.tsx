import { Clock, LifeBuoy, ShieldAlert, ShieldQuestion } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Opens the seller's support conversation (or starts one) in the inbox. */
const SUPPORT_LINK = '/seller/inbox?support=1'

type Guide = {
  icon: typeof Clock
  title: string
  body: string
  tone: string
  action?: { label: string; to: string }
}

/**
 * What verification means for this seller right now. Sellers cannot verify
 * themselves: SendAGift's team reviews the business details given at
 * registration, so the notice says who acts, the current status, and what
 * the seller can do meanwhile.
 */
function guideFor(status: string): Guide | null {
  switch (status) {
    case 'verified':
      return null
    case 'pending':
      return {
        icon: Clock,
        title: 'Verification in review',
        body: 'SendAGift’s team is checking the business details from your registration. There is nothing you need to send unless we message you. You will see “Verified seller” here once it is approved.',
        tone: 'border-amber-300 bg-amber-50 text-amber-950',
        action: { label: 'Ask support', to: SUPPORT_LINK },
      }
    case 'rejected':
      return {
        icon: ShieldAlert,
        title: 'Verification was not approved',
        body: 'SendAGift could not verify your business with the details provided. Contact support to find out what needs to change, then we can review it again.',
        tone: 'border-destructive/40 bg-destructive/5 text-destructive',
        action: { label: 'Contact support', to: SUPPORT_LINK },
      }
    default:
      return {
        icon: ShieldQuestion,
        title: 'Not verified yet',
        body: 'SendAGift’s team verifies every seller from the business details given at registration. Keep your business details, pickup address and phone up to date on your profile; if anything is missing we will message you in your inbox.',
        tone: 'border-brand-ink/15 bg-accent text-foreground',
        action: { label: 'Contact support', to: SUPPORT_LINK },
      }
  }
}

/** The seller's verification status, who handles it, and the next step. Nothing once verified. */
export function VerificationNotice({ status, className }: { status: string; className?: string }) {
  const guide = guideFor(status)
  if (!guide) return null
  const Icon = guide.icon
  return (
    <section
      className={cn(
        'flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start sm:justify-between',
        guide.tone,
        className,
      )}
    >
      <div className="flex gap-3">
        <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div className="space-y-1">
          <p className="text-sm font-bold">{guide.title}</p>
          <p className="text-sm leading-relaxed opacity-90">{guide.body}</p>
        </div>
      </div>
      {guide.action ? (
        <Button asChild variant="outline" className="h-9 shrink-0 self-start rounded-full bg-card px-4">
          <Link to={guide.action.to}>
            <LifeBuoy className="size-4" />
            {guide.action.label}
          </Link>
        </Button>
      ) : null}
    </section>
  )
}
