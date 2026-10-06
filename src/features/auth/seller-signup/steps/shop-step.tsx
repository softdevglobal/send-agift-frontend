import { CircleCheck, CircleX, LoaderCircle } from 'lucide-react'
import { useMemo } from 'react'

import { Input } from '@/components/ui/input'
import { ChipGroup, Field, inputClassName, Section } from '@/features/auth/seller-signup/fields'
import { giftOptions, publicLocations, shopCategories } from '@/features/auth/seller-signup/options'
import {
  publicLocationText,
  suggestedSlug,
  type SlugStatus,
} from '@/features/auth/seller-signup/signup-state'
import type { StepProps } from '@/features/auth/seller-signup/steps/step-props'
import { selectClassName, textareaClassName } from '@/lib/form-styles'

const slugMessages: Record<SlugStatus, { text: string; tone: string } | null> = {
  idle: null,
  checking: { text: 'Checking availability…', tone: 'text-muted-foreground' },
  available: { text: 'Available', tone: 'text-primary' },
  taken: { text: 'Already taken. Try another.', tone: 'text-destructive' },
  error: { text: 'Couldn’t check right now. We’ll check again when you register.', tone: 'text-muted-foreground' },
}

function timeZones(countryDefault: string | undefined): string[] {
  const zones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []
  return [...new Set([...zones, 'UTC', ...(countryDefault ? [countryDefault] : [])])].sort()
}

export function ShopStep({
  state,
  update,
  country,
  disabled,
  slugStatus,
}: StepProps & { slugStatus: SlugStatus }) {
  const zones = useMemo(() => timeZones(country?.default_timezone), [country?.default_timezone])
  const slugMessage = slugMessages[slugStatus]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="signup-shop-name" label="Shop display name" required className="sm:col-span-2">
          <Input
            id="signup-shop-name"
            placeholder="A name worth remembering"
            maxLength={80}
            value={state.shopName}
            onChange={(event) =>
              update({
                shopName: event.target.value,
                ...(state.slugEdited ? {} : { shopSlug: suggestedSlug(event.target.value) }),
              })
            }
            className={inputClassName}
            disabled={disabled}
          />
        </Field>

        <Field
          id="signup-shop-slug"
          label="Shop URL name"
          required
          className="sm:col-span-2"
          hint="Lowercase letters, numbers and hyphens."
        >
          <Input
            id="signup-shop-slug"
            placeholder="your-gift-shop"
            maxLength={60}
            value={state.shopSlug}
            onChange={(event) =>
              update({ shopSlug: event.target.value.toLowerCase(), slugEdited: true })
            }
            className={inputClassName}
            disabled={disabled}
          />
          {slugMessage ? (
            <p className={`flex items-center gap-1.5 text-xs font-medium ${slugMessage.tone}`} aria-live="polite">
              {slugStatus === 'checking' ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
              {slugStatus === 'available' ? <CircleCheck className="size-3.5" /> : null}
              {slugStatus === 'taken' ? <CircleX className="size-3.5" /> : null}
              {slugMessage.text}
            </p>
          ) : null}
        </Field>

        <Field
          id="signup-description"
          label="Tell customers about your shop"
          required
          className="sm:col-span-2"
          hint={`${state.description.trim().length} / 20 characters minimum. Shown on your public shop profile.`}
        >
          <textarea
            id="signup-description"
            placeholder="What do you create or curate? What makes your gifts special?"
            maxLength={1000}
            value={state.description}
            onChange={(event) => update({ description: event.target.value })}
            className={textareaClassName}
            disabled={disabled}
          />
        </Field>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">
          What will you sell?<span className="text-destructive"> *</span>
        </p>
        <ChipGroup
          label="Product categories"
          options={shopCategories}
          value={state.categories}
          onChange={(categories) => update({ categories })}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Some products need additional approval or licences before listing.
        </p>
      </div>

      <Section title="Shop details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="signup-website" label="Website / social profile" optional className="sm:col-span-2">
            <Input
              id="signup-website"
              type="url"
              placeholder="https://"
              maxLength={500}
              value={state.website}
              onChange={(event) => update({ website: event.target.value })}
              className={inputClassName}
              disabled={disabled}
            />
          </Field>
          <Field
            id="signup-currency"
            label="Shop currency"
            hint="Gift prices and delivery prices both use your business country’s currency."
          >
            <Input
              id="signup-currency"
              value={country?.default_currency ?? 'Choose a country first'}
              readOnly
              className={`${inputClassName} text-muted-foreground`}
            />
          </Field>
          <Field
            id="signup-timezone"
            label="Business time zone"
            required
            hint="Used for same-day cutoffs."
          >
            <select
              id="signup-timezone"
              value={state.timezone}
              onChange={(event) => update({ timezone: event.target.value })}
              className={selectClassName}
              disabled={disabled}
            >
              <option value="" disabled>
                Choose time zone
              </option>
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </Field>
          <Field
            id="signup-support-email"
            label="Public support email"
            optional
            hint="Shown to customers. Your private email is never published automatically."
          >
            <Input
              id="signup-support-email"
              type="email"
              placeholder="support@yourbusiness.com"
              maxLength={254}
              value={state.supportEmail}
              onChange={(event) => update({ supportEmail: event.target.value })}
              className={inputClassName}
              disabled={disabled}
            />
          </Field>
          <Field
            id="signup-public-location"
            label="Show on my shop profile"
            required
            hint={country ? `Customers see: ${publicLocationText(state, country.name) || '—'}` : undefined}
          >
            <select
              id="signup-public-location"
              value={state.publicLocation}
              onChange={(event) =>
                update({ publicLocation: event.target.value as typeof state.publicLocation })
              }
              className={selectClassName}
              disabled={disabled}
            >
              {publicLocations.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">
            Little extras you can offer
            <span className="text-xs font-normal text-muted-foreground"> optional</span>
          </p>
          <ChipGroup
            label="Gift options"
            options={giftOptions}
            value={state.giftOptions}
            onChange={(next) => update({ giftOptions: next })}
            disabled={disabled}
          />
        </div>
      </Section>
    </div>
  )
}
