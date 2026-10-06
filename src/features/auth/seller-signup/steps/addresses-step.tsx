import { ShieldCheck } from 'lucide-react'

import { AddressFields, CheckRow, Notice, Section } from '@/features/auth/seller-signup/fields'
import type { StepProps } from '@/features/auth/seller-signup/steps/step-props'

export function AddressesStep({ state, update, country, disabled }: StepProps) {
  const countryCode = country?.iso_code

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-lg tracking-tight">Registered business address</h3>
          <span className="text-xs text-muted-foreground">
            Private record{country ? ` · ${country.name}` : ''}
          </span>
        </div>
        <AddressFields
          idPrefix="signup-registered"
          value={state.registered}
          onChange={(registered) => update({ registered })}
          countryCode={countryCode}
          showLocation={state.pickupSame}
          disabled={disabled}
        />
      </div>

      <Section
        title="Pickup / dispatch address"
        intro="Where your gifts leave from. Delivery distance and price are measured from here."
      >
        <CheckRow
          id="signup-pickup-same"
          checked={state.pickupSame}
          onChange={(pickupSame) => update({ pickupSame })}
          label="Same as registered business address"
          disabled={disabled}
        />
        {state.pickupSame ? null : (
          <AddressFields
            idPrefix="signup-pickup"
            value={state.pickup}
            onChange={(pickup) => update({ pickup })}
            countryCode={countryCode}
            showLocation
            disabled={disabled}
          />
        )}
      </Section>

      <Section title="Return address" intro="Where eligible returns should be sent.">
        <CheckRow
          id="signup-return-same"
          checked={state.returnSame}
          onChange={(returnSame) => update({ returnSame })}
          label="Same as pickup / dispatch address"
          disabled={disabled}
        />
        {state.returnSame ? null : (
          <AddressFields
            idPrefix="signup-returns"
            value={state.returns}
            onChange={(returns) => update({ returns })}
            countryCode={countryCode}
            disabled={disabled}
          />
        )}
      </Section>

      <Notice icon={<ShieldCheck />}>
        Addresses are in your business country. You choose what customers can see on the next step;
        your registered address is never shown.
      </Notice>
    </div>
  )
}
