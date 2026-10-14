import type { ReactNode } from 'react'

import { CheckRow, Section } from '@/features/auth/seller-signup/fields'
import {
  contactRoles,
  giftOptions,
  registrationStatuses,
  shopCategories,
  taxStatuses,
  workingDays,
} from '@/features/auth/seller-signup/options'
import {
  pickupOrigin,
  publicLocationText,
  type AddressDraft,
} from '@/features/auth/seller-signup/signup-state'
import type { StepProps } from '@/features/auth/seller-signup/steps/step-props'
import { sellerTypes } from '@/features/auth/seller-register-options'
import { formatPriceAmount, majorToMinor } from '@/lib/money'

type Options = readonly { value: string; label: string }[]

function labelOf(options: Options, value: string): string {
  return options.find((option) => option.value === value)?.label ?? value
}

function labelsOf(options: Options, values: string[]): string {
  return values.map((value) => labelOf(options, value)).join(', ')
}

function addressLine(address: AddressDraft): string {
  return [address.line1, address.line2, address.city, address.region, address.postal_code]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ')
}

function ReviewCard({
  title,
  onEdit,
  rows,
}: {
  title: string
  onEdit: () => void
  rows: [string, ReactNode][]
}) {
  return (
    <div className="rounded-xl border border-border/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-medium">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          Edit
        </button>
      </div>
      <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[10rem_1fr]">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-words">{value || '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export function ReviewStep({
  state,
  update,
  country,
  countries,
  disabled,
  onEdit,
}: StepProps & { onEdit: (step: number) => void }) {
  const currency = country?.default_currency ?? ''
  const countryName = (id: string) => countries.find((item) => item.id === id)?.name ?? ''
  const pickup = pickupOrigin(state)

  const identifiers =
    state.registrationStatus === 'registered'
      ? state.identifiers
          .filter((item) => item.type.trim() && item.value.trim())
          .map((item) => `${item.type.trim()} ${item.value.trim()}`)
          .join(' · ')
      : state.registrationNote.trim()
  const taxes =
    state.taxStatus === 'registered'
      ? state.taxes.map((tax) => `${tax.scheme.trim()} ${tax.number.trim()}`).join(' · ')
      : labelOf(taxStatuses, state.taxStatus)

  const bands = state.bands.map((band) => {
    const price = Number(band.price_major)
    const priceText =
      currency && Number.isFinite(price)
        ? price === 0
          ? 'Free'
          : formatPriceAmount(majorToMinor(price, currency), currency)
        : band.price_major
    const timing =
      band.estimated_days === '0'
        ? `same day, order by ${band.cutoff_time}`
        : `${band.estimated_days} day${band.estimated_days === '1' ? '' : 's'}`
    return `Up to ${band.max_km} km: ${priceText}, ${timing}`
  })

  return (
    <div className="space-y-4">
      <ReviewCard
        title="Business"
        onEdit={() => onEdit(0)}
        rows={[
          ['Country', country?.name],
          ['Business type', labelOf(sellerTypes, state.sellerType)],
          ['Legal name', state.legalName.trim()],
          ['Trading name', state.tradingName.trim()],
          ['Registration', labelOf(registrationStatuses, state.registrationStatus)],
          [state.registrationStatus === 'registered' ? 'Identifiers' : 'Note', identifiers],
          ['Tax', taxes],
        ]}
      />
      <ReviewCard
        title="Contact"
        onEdit={() => onEdit(1)}
        rows={[
          ['Name', state.contactName.trim()],
          ['Role', labelOf(contactRoles, state.contactRole)],
          ['Email', state.email.trim()],
          ['Phone', state.phone],
        ]}
      />
      <ReviewCard
        title="Addresses"
        onEdit={() => onEdit(2)}
        rows={[
          ['Registered', addressLine(state.registered)],
          ['Pickup', state.pickupSame ? 'Same as registered' : addressLine(pickup)],
          ['Returns', state.returnSame ? 'Same as pickup' : addressLine(state.returns)],
        ]}
      />
      <ReviewCard
        title="Shop"
        onEdit={() => onEdit(3)}
        rows={[
          ['Name', state.shopName.trim()],
          ['URL name', state.shopSlug],
          ['Categories', labelsOf(shopCategories, state.categories)],
          ['Time zone', state.timezone],
          ['Customers see', country ? publicLocationText(state, country.name) : ''],
          ['Gift options', labelsOf(giftOptions, state.giftOptions)],
        ]}
      />
      <ReviewCard
        title="Delivery"
        onEdit={() => onEdit(4)}
        rows={[
          [
            'Bands',
            <ul key="bands" className="space-y-0.5">
              {bands.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>,
          ],
          ['Working days', labelsOf(workingDays, state.workingDays)],
          ['Customer pickup', state.pickupEnabled ? 'Offered' : 'Not offered'],
        ]}
      />
      {state.taxStatus === 'registered' && state.taxes.some((tax) => tax.country_id !== state.countryId) ? (
        <p className="text-xs text-muted-foreground">
          Tax registrations in:{' '}
          {[...new Set(state.taxes.map((tax) => countryName(tax.country_id)))].join(', ')}
        </p>
      ) : null}

      <Section title="Confirm and agree">
        <div className="space-y-4">
          <CheckRow
            id="signup-details-confirmed"
            checked={state.detailsConfirmed}
            onChange={(detailsConfirmed) => update({ detailsConfirmed })}
            label="I confirm these details are accurate."
            disabled={disabled}
          />
          <CheckRow
            id="signup-terms"
            checked={state.termsAccepted}
            onChange={(termsAccepted) => update({ termsAccepted })}
            label="I agree to the seller terms and privacy notice."
            disabled={disabled}
          />
          <CheckRow
            id="signup-marketing"
            checked={state.marketingOptIn}
            onChange={(marketingOptIn) => update({ marketingOptIn })}
            label="Send me seller tips and product updates."
            hint="Optional. You can unsubscribe at any time."
            disabled={disabled}
          />
        </div>
      </Section>
    </div>
  )
}
