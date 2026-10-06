import { Building2, Info, Landmark } from 'lucide-react'
import type { ReactNode } from 'react'

import { Notice } from '@/features/auth/seller-signup/fields'

function StatusCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="space-y-2 rounded-xl border border-border/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-medium [&>svg]:size-4 [&>svg]:text-primary">
          {icon}
          {title}
        </h3>
        <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-bold text-brand-ink">
          Not connected yet
        </span>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  )
}

/** Nothing to fill in: business checks and payout providers are not connected yet. */
export function VerificationStep() {
  return (
    <div className="space-y-4">
      <StatusCard icon={<Building2 />} title="Business verification">
        The business details you entered are saved with your account so they can be checked.
        Document upload is not available yet.
      </StatusCard>
      <StatusCard icon={<Landmark />} title="Payout setup">
        Bank and account-holder details will be entered with a secure payout provider. We never
        ask for bank details in this form.
      </StatusCard>
      <Notice icon={<Info />}>
        Your seller account and shop are created as soon as you register on the next step.
      </Notice>
    </div>
  )
}
