import { CircleCheck, MapPinOff } from 'lucide-react'
import type { ReactNode } from 'react'

import { addressFieldsFromPlace } from '@/api/places'
import { AddressAutocomplete } from '@/components/common/place-autocomplete'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AddressDraft } from '@/features/auth/seller-signup/signup-state'
import { cn } from '@/lib/utils'

export const inputClassName = 'h-11 bg-surface px-3'

type FieldProps = {
  id: string
  label: string
  required?: boolean
  optional?: boolean
  hint?: ReactNode
  className?: string
  children: ReactNode
}

export function Field({ id, label, required, optional, hint, className, children }: FieldProps) {
  return (
    <div className={cn('min-w-0 space-y-2', className)}>
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
        {optional ? (
          <span className="text-xs font-normal text-muted-foreground"> optional</span>
        ) : null}
      </Label>
      {children}
      {hint ? <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

type ChipGroupProps = {
  label: string
  options: { value: string; label: string }[]
  value: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
}

/** Toggle chips for a multi-choice list. Order follows `options`, not click order. */
export function ChipGroup({ label, options, value, onChange, disabled }: ChipGroupProps) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = value.includes(option.value)
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() =>
              onChange(
                active
                  ? value.filter((item) => item !== option.value)
                  : options.map((o) => o.value).filter((v) => v === option.value || value.includes(v)),
              )
            }
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-sm transition-colors disabled:opacity-50',
              active
                ? 'border-primary bg-primary/10 font-medium text-primary'
                : 'border-border bg-surface text-foreground hover:border-primary/40',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

type CheckRowProps = {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  hint?: ReactNode
  disabled?: boolean
}

export function CheckRow({ id, checked, onChange, label, hint, disabled }: CheckRowProps) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(next) => onChange(next === true)}
        disabled={disabled}
        className="mt-0.5"
      />
      <div className="space-y-0.5">
        <Label htmlFor={id} className="leading-snug font-medium">
          {label}
        </Label>
        {hint ? <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  )
}

type AddressFieldsProps = {
  idPrefix: string
  value: AddressDraft
  onChange: (next: AddressDraft) => void
  countryCode?: string
  /** Shows whether the address has a map position. Needed for the delivery origin. */
  showLocation?: boolean
  disabled?: boolean
}

export function AddressFields({
  idPrefix,
  value,
  onChange,
  countryCode,
  showLocation,
  disabled,
}: AddressFieldsProps) {
  const located = value.latitude !== null && value.longitude !== null

  // A typed change to the street or city moves the address, so the old pin no longer fits.
  function setText(field: 'line1' | 'line2' | 'city' | 'region' | 'postal_code', text: string) {
    const moves = field === 'line1' || field === 'city'
    onChange({
      ...value,
      [field]: text,
      ...(moves ? { latitude: null, longitude: null } : {}),
    })
  }

  return (
    <div className="space-y-4">
      <AddressAutocomplete
        id={`${idPrefix}-search`}
        countryCode={countryCode}
        disabled={disabled}
        onSelect={(place) => {
          const fields = addressFieldsFromPlace(place)
          onChange({
            line1: fields.line1,
            line2: fields.line2,
            city: fields.city,
            region: fields.region,
            postal_code: fields.postal_code,
            latitude: fields.latitude,
            longitude: fields.longitude,
          })
        }}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${idPrefix}-line1`} label="Address line 1" required className="sm:col-span-2">
          <Input
            id={`${idPrefix}-line1`}
            autoComplete="address-line1"
            placeholder="Street, building and street number"
            maxLength={240}
            value={value.line1}
            onChange={(event) => setText('line1', event.target.value)}
            className={inputClassName}
            disabled={disabled}
          />
        </Field>
        <Field id={`${idPrefix}-line2`} label="Address line 2" optional className="sm:col-span-2">
          <Input
            id={`${idPrefix}-line2`}
            autoComplete="address-line2"
            placeholder="Unit, floor, district or landmark"
            maxLength={240}
            value={value.line2}
            onChange={(event) => setText('line2', event.target.value)}
            className={inputClassName}
            disabled={disabled}
          />
        </Field>
        <Field id={`${idPrefix}-city`} label="City / town" required>
          <Input
            id={`${idPrefix}-city`}
            autoComplete="address-level2"
            value={value.city}
            onChange={(event) => setText('city', event.target.value)}
            className={inputClassName}
            disabled={disabled}
          />
        </Field>
        <Field id={`${idPrefix}-region`} label="State / province / region" optional>
          <Input
            id={`${idPrefix}-region`}
            autoComplete="address-level1"
            value={value.region}
            onChange={(event) => setText('region', event.target.value)}
            className={inputClassName}
            disabled={disabled}
          />
        </Field>
        <Field id={`${idPrefix}-postal`} label="Postal / ZIP code" optional>
          <Input
            id={`${idPrefix}-postal`}
            autoComplete="postal-code"
            maxLength={24}
            value={value.postal_code}
            onChange={(event) => setText('postal_code', event.target.value)}
            className={inputClassName}
            disabled={disabled}
          />
        </Field>
      </div>
      {showLocation ? (
        located ? (
          <p className="flex items-center gap-2 text-xs font-medium text-primary">
            <CircleCheck className="size-4" />
            Located on the map. Delivery distance is measured from here.
          </p>
        ) : (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPinOff className="size-4" />
            Not located yet. Pick this address from the search results.
          </p>
        )
      ) : null}
    </div>
  )
}

type NoticeProps = {
  icon: ReactNode
  tone?: 'neutral' | 'amber' | 'green'
  children: ReactNode
}

export function Notice({ icon, tone = 'neutral', children }: NoticeProps) {
  return (
    <div
      className={cn(
        'flex gap-3 rounded-xl px-3.5 py-3 text-sm leading-relaxed ring-1 [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0',
        tone === 'amber' && 'bg-amber-50 text-amber-900 ring-amber-200',
        tone === 'green' && 'bg-primary/5 text-foreground ring-primary/20',
        tone === 'neutral' && 'bg-muted/50 text-muted-foreground ring-border/60',
      )}
    >
      {icon}
      <div>{children}</div>
    </div>
  )
}

export function Section({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <section className="space-y-4 border-t border-border/60 pt-6">
      <div className="space-y-1">
        <h3 className="font-display text-lg tracking-tight">{title}</h3>
        {intro ? <p className="text-sm text-muted-foreground">{intro}</p> : null}
      </div>
      {children}
    </section>
  )
}
