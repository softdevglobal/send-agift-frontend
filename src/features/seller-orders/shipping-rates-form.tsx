import type { FormEvent } from 'react'

import {
  CUSTOMS_CONTENTS_TYPES,
  CUSTOMS_NON_DELIVERY_OPTIONS,
  PARCEL_DISTANCE_UNITS,
  PARCEL_MASS_UNITS,
} from '@/api/types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { sellerPanelClass } from '@/features/seller'
import type { CustomsFormState, ParcelFormState } from '@/features/seller-orders/order-item-display'
import { selectClassName } from '@/lib/form-styles'
import { cn } from '@/lib/utils'

type ShippingRatesFormProps = {
  international: boolean
  originIso: string | null
  destIso: string | null
  parcel: ParcelFormState
  customs: CustomsFormState
  onParcelChange: (patch: Partial<ParcelFormState>) => void
  onCustomsChange: (patch: Partial<CustomsFormState>) => void
}

export function ShippingRatesForm({
  international,
  originIso,
  destIso,
  parcel,
  customs,
  onParcelChange,
  onCustomsChange,
}: ShippingRatesFormProps) {
  function ignoreSubmit(event: FormEvent) {
    event.preventDefault()
  }

  return (
    <section className={cn(sellerPanelClass, 'p-5 sm:p-6')}>
      <h2 className="font-medium">{international ? 'International parcel & customs' : 'Parcel'}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {international
          ? `Ship-from ${originIso ?? 'shop country'} → ship-to ${destIso ?? 'recipient country'}. Parcel and customs are required for rates.`
          : 'Optional for domestic rates. Leave blank to request rates without parcel details.'}
      </p>

      <form className="mt-4 space-y-5" onSubmit={ignoreSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            id="parcel-length"
            label="Length"
            value={parcel.length}
            onChange={(value) => onParcelChange({ length: value })}
          />
          <Field
            id="parcel-width"
            label="Width"
            value={parcel.width}
            onChange={(value) => onParcelChange({ width: value })}
          />
          <Field
            id="parcel-height"
            label="Height"
            value={parcel.height}
            onChange={(value) => onParcelChange({ height: value })}
          />
          <Field
            id="parcel-weight"
            label="Weight"
            value={parcel.weight}
            onChange={(value) => {
              onParcelChange({ weight: value })
              if (international) onCustomsChange({ net_weight: value })
            }}
          />
          <div className="space-y-1.5">
            <Label htmlFor="parcel-distance">Distance unit</Label>
            <select
              id="parcel-distance"
              className={selectClassName}
              value={parcel.distance_unit}
              onChange={(event) =>
                onParcelChange({
                  distance_unit: event.target.value as ParcelFormState['distance_unit'],
                })
              }
            >
              {PARCEL_DISTANCE_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="parcel-mass">Mass unit</Label>
            <select
              id="parcel-mass"
              className={selectClassName}
              value={parcel.mass_unit}
              onChange={(event) => {
                const mass_unit = event.target.value as ParcelFormState['mass_unit']
                onParcelChange({ mass_unit })
                if (international) onCustomsChange({ mass_unit })
              }}
            >
              {PARCEL_MASS_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
        </div>

        {international ? (
          <div className="space-y-4 border-t border-border/50 pt-5">
            <h3 className="text-sm font-medium">Customs declaration</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="customs-contents">Contents type</Label>
                <select
                  id="customs-contents"
                  className={selectClassName}
                  value={customs.contents_type}
                  onChange={(event) => onCustomsChange({ contents_type: event.target.value })}
                >
                  {CUSTOMS_CONTENTS_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.replaceAll('_', ' ').toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customs-nondelivery">If undeliverable</Label>
                <select
                  id="customs-nondelivery"
                  className={selectClassName}
                  value={customs.non_delivery_option}
                  onChange={(event) =>
                    onCustomsChange({ non_delivery_option: event.target.value })
                  }
                >
                  {CUSTOMS_NON_DELIVERY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option === 'RETURN' ? 'Return' : 'Abandon'}
                    </option>
                  ))}
                </select>
              </div>
              <Field
                id="customs-signer"
                label="Certify signer"
                value={customs.certify_signer}
                onChange={(value) => onCustomsChange({ certify_signer: value })}
                className="sm:col-span-2"
              />
              <Field
                id="customs-explanation"
                label="Contents explanation (optional)"
                value={customs.contents_explanation}
                onChange={(value) => onCustomsChange({ contents_explanation: value })}
                className="sm:col-span-2"
              />
              <Field
                id="customs-description"
                label="Item description"
                value={customs.description}
                onChange={(value) => onCustomsChange({ description: value })}
                className="sm:col-span-2"
              />
              <Field
                id="customs-qty"
                label="Quantity"
                value={customs.quantity}
                onChange={(value) => onCustomsChange({ quantity: value })}
              />
              <Field
                id="customs-net-weight"
                label="Net weight"
                value={customs.net_weight}
                onChange={(value) => onCustomsChange({ net_weight: value })}
              />
              <Field
                id="customs-value"
                label="Value"
                value={customs.value_amount}
                onChange={(value) => onCustomsChange({ value_amount: value })}
              />
              <Field
                id="customs-currency"
                label="Value currency"
                value={customs.value_currency}
                onChange={(value) => onCustomsChange({ value_currency: value })}
              />
              <Field
                id="customs-origin"
                label="Origin country (ISO 2)"
                value={customs.origin_country}
                onChange={(value) => onCustomsChange({ origin_country: value.toUpperCase() })}
              />
              <Field
                id="customs-hs"
                label="HS tariff (optional)"
                value={customs.tariff_number}
                onChange={(value) => onCustomsChange({ tariff_number: value })}
              />
              <Field
                id="customs-eel"
                label="EEL/PFC (optional)"
                value={customs.eel_pfc}
                onChange={(value) => onCustomsChange({ eel_pfc: value })}
              />
              <Field
                id="customs-incoterm"
                label="Incoterm (optional)"
                value={customs.incoterm}
                onChange={(value) => onCustomsChange({ incoterm: value })}
              />
            </div>
          </div>
        ) : null}
      </form>
    </section>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  className,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-lg bg-surface px-3"
      />
    </div>
  )
}
