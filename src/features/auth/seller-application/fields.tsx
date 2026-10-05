import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

import { addressFieldsFromPlace } from '@/api/places'
import { AddressAutocomplete } from '@/components/common/place-autocomplete'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  inputClass,
  selectClass,
  type AddressDraft,
} from '@/features/auth/seller-application/form-values'
import { countryOptions, type CountryRule } from '@/features/auth/seller-application/options'
import { cn } from '@/lib/utils'


export function Field({
  id,
  label,
  optional,
  hint,
  error,
  className,
  children,
}: {
  id: string
  label: string
  optional?: boolean
  hint?: ReactNode
  error?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('min-w-0 space-y-2', className)} data-error={error ? true : undefined}>
      <Label htmlFor={id}>
        {label}
        {optional ? (
          <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

/** A short heading inside a step. */
export function SubHeading({ title, note }: { title: string; note?: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className="min-w-0">
        <h4 className="font-display text-lg leading-tight text-foreground">{title}</h4>
        {note ? <p className="mt-0.5 text-xs text-muted-foreground">{note}</p> : null}
      </div>
      <span className="h-px flex-1 bg-border/70" />
    </div>
  )
}

/** Picture cards for a choice of one. */
export function ChoiceCards({
  name,
  value,
  onChange,
  options,
  columns = 'grid-cols-2 sm:grid-cols-3',
  error,
}: {
  name: string
  value: string
  onChange: (value: string) => void
  options: readonly { value: string; label: string; hint?: string; icon?: LucideIcon }[]
  columns?: string
  error?: boolean
}) {
  return (
    <div className={cn('grid gap-2.5', columns)} role="radiogroup">
      {options.map((option) => {
        const active = value === option.value
        const Icon = option.icon
        return (
          <label
            key={option.value}
            className={cn(
              'flex min-w-0 cursor-pointer items-start gap-2.5 rounded-2xl p-3 ring-1 transition-all',
              active
                ? 'bg-primary/[0.06] shadow-[0_8px_24px_-12px] shadow-primary/50 ring-2 ring-primary'
                : cn(
                    'bg-card hover:-translate-y-0.5 hover:ring-primary/40',
                    error ? 'ring-destructive/50' : 'ring-border/70',
                  ),
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={active}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {Icon ? (
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors',
                  active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}
              >
                <Icon className="size-4.5" />
              </span>
            ) : null}
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{option.label}</span>
              {option.hint ? (
                <span className="block text-[11px] leading-tight text-muted-foreground">
                  {option.hint}
                </span>
              ) : null}
            </span>
          </label>
        )
      })}
    </div>
  )
}

/** Pill toggles for a choice of many. */
export function Chips({
  values,
  onChange,
  options,
  error,
}: {
  values: string[]
  onChange: (values: string[]) => void
  options: readonly (readonly [string, string])[]
  error?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([value, label]) => {
        const active = values.includes(value)
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() =>
              onChange(active ? values.filter((v) => v !== value) : [...values, value])
            }
            className={cn(
              'rounded-full px-3.5 py-2 text-sm font-medium ring-1 transition-all',
              active
                ? 'bg-primary text-primary-foreground ring-primary'
                : cn(
                    'bg-card text-foreground hover:ring-primary/50',
                    error ? 'ring-destructive/50' : 'ring-border',
                  ),
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

/** A card with a switch, for turning a whole option on or off. */
export function ToggleCard({
  id,
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}: {
  id: string
  icon: LucideIcon
  title: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-2xl p-3.5 ring-1 transition-all',
        checked ? 'bg-primary/[0.05] ring-2 ring-primary' : 'bg-card ring-border/70',
      )}
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-xl',
          checked ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </label>
  )
}

/** A checkbox with a sentence beside it. */
export function CheckRow({
  id,
  checked,
  onChange,
  label,
  note,
  error,
}: {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  note?: string
  error?: string
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className={cn(
          'flex cursor-pointer items-start gap-3 rounded-xl p-3 ring-1 transition-colors',
          checked ? 'bg-primary/[0.04] ring-primary/30' : 'bg-card ring-border/70',
          error && !checked && 'ring-destructive/50',
        )}
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-primary"
        />
        <span className="min-w-0 text-sm leading-snug">
          {label}
          {note ? <span className="mt-0.5 block text-xs text-muted-foreground">{note}</span> : null}
        </span>
      </label>
      {error && !checked ? (
        <p className="mt-1.5 text-xs font-medium text-destructive">{error}</p>
      ) : null}
    </div>
  )
}

export function CountryCodeSelect({
  id,
  value,
  onChange,
  placeholder = 'Choose country / territory',
}: {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={selectClass}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {countryOptions.map(([code, name]) => (
        <option key={code} value={code}>
          {name}
        </option>
      ))}
    </select>
  )
}


/** Country, search and the lines of one address. */
export function AddressFields({
  id,
  value,
  onChange,
  rule,
  errors,
}: {
  id: string
  value: AddressDraft
  onChange: (value: AddressDraft) => void
  rule: CountryRule
  errors: Record<string, string>
}) {
  const set = (patch: Partial<AddressDraft>) => onChange({ ...value, ...patch })
  return (
    <div className="space-y-4">
      <Field id={`${id}-country`} label="Country / territory" error={errors[`${id}.country`]}>
        <CountryCodeSelect
          id={`${id}-country`}
          value={value.country}
          onChange={(country) => set({ country, latitude: null, longitude: null })}
        />
      </Field>
      {value.country === 'ZZ' ? (
        <Field
          id={`${id}-country-other`}
          label="Country / territory name"
          error={errors[`${id}.countryOther`]}
        >
          <Input
            id={`${id}-country-other`}
            value={value.countryOther}
            onChange={(event) => set({ countryOther: event.target.value })}
            className={inputClass}
          />
        </Field>
      ) : null}
      {value.country && value.country !== 'ZZ' ? (
        <AddressAutocomplete
          id={`${id}-search`}
          countryCode={value.country}
          helperText="Pick a result to fill the address below."
          onSelect={(place) => {
            const f = addressFieldsFromPlace(place)
            set({
              line1: f.line1,
              line2: f.line2,
              city: f.city,
              region: f.region,
              postal: f.postal_code,
              latitude: f.latitude,
              longitude: f.longitude,
            })
          }}
        />
      ) : null}
      <Field id={`${id}-line1`} label="Address line 1" error={errors[`${id}.line1`]}>
        <Input
          id={`${id}-line1`}
          autoComplete="address-line1"
          placeholder="Street, building and number"
          dir="auto"
          value={value.line1}
          onChange={(event) => set({ line1: event.target.value })}
          className={inputClass}
        />
      </Field>
      <Field id={`${id}-line2`} label="Address line 2" optional>
        <Input
          id={`${id}-line2`}
          autoComplete="address-line2"
          placeholder="Unit, floor, district or landmark"
          dir="auto"
          value={value.line2}
          onChange={(event) => set({ line2: event.target.value })}
          className={inputClass}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${id}-city`} label="City / town" error={errors[`${id}.city`]}>
          <Input
            id={`${id}-city`}
            autoComplete="address-level2"
            dir="auto"
            value={value.city}
            onChange={(event) => set({ city: event.target.value })}
            className={inputClass}
          />
        </Field>
        <Field id={`${id}-region`} label={rule.region} optional>
          <Input
            id={`${id}-region`}
            autoComplete="address-level1"
            dir="auto"
            value={value.region}
            onChange={(event) => set({ region: event.target.value })}
            className={inputClass}
          />
        </Field>
      </div>
      <Field id={`${id}-postal`} label={rule.postal.replace(/\s*\(.*?\)\s*$/, '')} optional>
        <Input
          id={`${id}-postal`}
          autoComplete="postal-code"
          value={value.postal}
          onChange={(event) => set({ postal: event.target.value })}
          className={inputClass}
        />
      </Field>
    </div>
  )
}
