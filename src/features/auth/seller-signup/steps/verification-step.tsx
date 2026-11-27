import { Gift, Info } from 'lucide-react'

import { CheckRow, Notice } from '@/features/auth/seller-signup/fields'
import type { StepProps } from '@/features/auth/seller-signup/steps/step-props'

/**
 * The one thing to do here: agree to the free gift program's terms. The
 * budget amount is set later by SendAGift and shown before anything is
 * offered, so the step says plainly that nothing is charged now.
 */
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
          your shop later, and you choose which of your products can be sent.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            <b className="text-foreground">Nothing is charged now.</b> You will see your budget amount
            under Free gifts in your dashboard before any free gift is offered.
          </li>
          <li>
            No free gift is offered until you pick the products and switch free gifts on yourself.
          </li>
          <li>
            Each free gift costs you the product price. It is held when a customer orders, spent when
            you mark it delivered, and given back if they cancel before you dispatch.
          </li>
          <li>The customer pays the delivery. You can pause free gifts at any time.</li>
        </ul>
        <CheckRow
          id="signup-free-gift-budget"
          checked={state.freeGiftBudgetAccepted}
          onChange={(freeGiftBudgetAccepted) => update({ freeGiftBudgetAccepted })}
          label="I agree to take part in the free gift program on these terms."
          hint="Required to register. You choose whether to switch it on once you have seen your budget amount."
          disabled={disabled}
        />
      </div>
      <Notice icon={<Info />}>
        Your seller account and shop are created as soon as you register on the next step.
      </Notice>
    </div>
  )
}
