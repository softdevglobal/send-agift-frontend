import { Gift, Info } from 'lucide-react'

import { CheckRow, Notice } from '@/features/auth/seller-signup/fields'
import type { StepProps } from '@/features/auth/seller-signup/steps/step-props'

/** The one thing to do here: agree to the free gift marketing budget SendAGift sets. */
export function VerificationStep({ state, update, disabled }: StepProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border-2 border-brand-ink/15 p-4">
        <h3 className="flex items-center gap-2 font-medium [&>svg]:size-4 [&>svg]:text-primary">
          <Gift />
          Free gift marketing budget
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Every SendAGift customer has one free gift to send. SendAGift sets a marketing budget for
          your shop and you choose which products are offered. A gift only costs your budget when
          it is delivered, the customer pays the delivery, and you can pause it at any time.
        </p>
        <CheckRow
          id="signup-free-gift-budget"
          checked={state.freeGiftBudgetAccepted}
          onChange={(freeGiftBudgetAccepted) => update({ freeGiftBudgetAccepted })}
          label="I agree to the free gift marketing budget that SendAGift sets for my shop."
          hint="Required to register. You can see the amount in your dashboard once it is set."
          disabled={disabled}
        />
      </div>
      <Notice icon={<Info />}>
        Your seller account and shop are created as soon as you register on the next step.
      </Notice>
    </div>
  )
}
