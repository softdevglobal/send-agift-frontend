import { Clock, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useFieldIssues } from '@/features/auth/seller-signup/field-issues'
import { CheckRow, ChipGroup, Field, FieldMessage, Notice, Section } from '@/features/auth/seller-signup/fields'
import { workingDays } from '@/features/auth/seller-signup/options'
import { nextBand, type BandDraft } from '@/features/auth/seller-signup/signup-state'
import type { StepProps } from '@/features/auth/seller-signup/steps/step-props'
import { textareaClassName } from '@/lib/form-styles'
import { TimePicker } from '@/components/common/time-picker'

export function DeliveryStep({ state, update, country, disabled }: StepProps) {
  const currency = country?.default_currency ?? ''

  function setBand(key: string, patch: Partial<BandDraft>) {
    update({ bands: state.bands.map((band) => (band.key === key ? { ...band, ...patch } : band)) })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h3 className="font-display text-lg tracking-tight">Your delivery bands</h3>
            <p className="text-sm text-muted-foreground">
              Distance from your pickup address. The smallest band that covers the recipient sets
              the price and delivery time.
            </p>
          </div>
          <span className="rounded-md bg-accent px-2.5 py-1 text-xs font-bold text-brand-ink">
            Prices in {currency || '—'}
          </span>
        </div>

        <ul className="space-y-3">
          {state.bands.map((band) => {
            const sameDay = band.estimated_days === '0'
            return (
              <li key={band.key} className="rounded-xl border border-border/60 p-3">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[6.5rem] flex-1 space-y-1">
                    <Label htmlFor={`band-km-${band.key}`}>Up to (km)</Label>
                    <Input
                      id={`band-km-${band.key}`}
                      inputMode="decimal"
                      placeholder="e.g. 10"
                      value={band.max_km}
                      onChange={(event) => setBand(band.key, { max_km: event.target.value })}
                      disabled={disabled}
                    />
                  </div>
                  <div className="min-w-[6.5rem] flex-1 space-y-1">
                    <Label htmlFor={`band-price-${band.key}`}>Price ({currency || '-'})</Label>
                    <Input
                      id={`band-price-${band.key}`}
                      inputMode="decimal"
                      placeholder="0 = free"
                      value={band.price_major}
                      onChange={(event) => setBand(band.key, { price_major: event.target.value })}
                      disabled={disabled}
                    />
                  </div>
                  {sameDay ? (
                    <div className="w-36 space-y-1">
                      <Label htmlFor={`band-cutoff-${band.key}`}>Order by</Label>
                      <TimePicker
                        id={`band-cutoff-${band.key}`}
                        value={band.cutoff_time}
                        onChange={(cutoff_time) => setBand(band.key, { cutoff_time })}
                        disabled={disabled}
                      />
                    </div>
                  ) : (
                    <div className="w-24 space-y-1">
                      <Label htmlFor={`band-days-${band.key}`}>Days</Label>
                      <Input
                        id={`band-days-${band.key}`}
                        inputMode="numeric"
                        value={band.estimated_days}
                        onChange={(event) => setBand(band.key, { estimated_days: event.target.value })}
                        disabled={disabled}
                      />
                    </div>
                  )}
                  <Button
                    type="button"
                    variant={sameDay ? 'default' : 'outline'}
                    className="h-10 rounded-full px-3"
                    aria-pressed={sameDay}
                    onClick={() =>
                      setBand(
                        band.key,
                        sameDay ? { estimated_days: '1', cutoff_time: '' } : { estimated_days: '0', cutoff_time: '14:00' },
                      )
                    }
                    disabled={disabled}
                  >
                    Same day
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10 rounded-full px-3 text-muted-foreground"
                    disabled={disabled || state.bands.length === 1}
                    onClick={() => update({ bands: state.bands.filter((other) => other.key !== band.key) })}
                    aria-label="Remove band"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <BandMessages band={band} />
              </li>
            )
          })}
        </ul>
        {state.bands.length < 20 ? (
          <Button
            id="signup-add-band"
            type="button"
            variant="outline"
            className="h-8 rounded-full px-3"
            onClick={() => update({ bands: [...state.bands, nextBand(state.bands)] })}
            disabled={disabled}
          >
            <Plus className="size-3.5" />
            Add delivery band
          </Button>
        ) : null}
        <p className="text-xs text-muted-foreground">
          A price of 0 is free delivery. Bands must increase in distance. A same-day band takes
          orders until its cutoff; later orders arrive the next day. Recipients beyond your last band
          can’t order delivery from you.
        </p>
      </div>

      <Section title="Working days">
        <ChipGroup
          id="signup-working-days"
          label="Working days"
          options={workingDays}
          value={state.workingDays}
          onChange={(next) => update({ workingDays: next })}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Time zone: <b>{state.timezone || 'set on the previous step'}</b>. Holiday closures are
          managed in shop settings.
        </p>
      </Section>

      <Section title="Customer pickup">
        <CheckRow
          id="signup-pickup-enabled"
          checked={state.pickupEnabled}
          onChange={(pickupEnabled) => update({ pickupEnabled })}
          label="Customers can also collect from my pickup address"
          hint="Delivery bands are still required. Pickup is offered alongside them."
          disabled={disabled}
        />
      </Section>

      <Notice icon={<Clock />} tone="green">
        <b>Preparation time belongs to each product.</b> Receive-by estimates add a product’s
        preparation time to these delivery days.
      </Notice>

      <Section title="Returns & customer care" intro="Explain your process. Mandatory customer rights still apply.">
        <Field id="signup-returns-policy" label="Your returns process" required>
          <textarea
            id="signup-returns-policy"
            placeholder="How customers request a return, which products have conditions, and who they contact."
            maxLength={2000}
            value={state.returnsPolicy}
            onChange={(event) => update({ returnsPolicy: event.target.value })}
            className={textareaClassName}
            disabled={disabled}
          />
        </Field>
      </Section>
    </div>
  )
}

/** What is wrong with one band, under its row, so the seller sees which band to fix. */
function BandMessages({ band }: { band: BandDraft }) {
  const messages = useFieldIssues([
    `band-km-${band.key}`,
    `band-price-${band.key}`,
    `band-days-${band.key}`,
    `band-cutoff-${band.key}`,
  ])
  if (!messages.length) return null
  return (
    <div className="mt-2 space-y-1">
      {messages.map((message) => (
        <FieldMessage key={message} message={message} />
      ))}
    </div>
  )
}
