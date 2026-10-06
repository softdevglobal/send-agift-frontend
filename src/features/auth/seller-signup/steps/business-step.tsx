import { Info, Lock, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { sellerTypes } from '@/features/auth/seller-register-options'
import { Field, inputClassName, Notice, Section } from '@/features/auth/seller-signup/fields'
import {
  registrationStatuses,
  taxSchemeSuggestions,
  taxStatuses,
} from '@/features/auth/seller-signup/options'
import {
  newIdentifier,
  newTax,
  suggestionsFor,
  type IdentifierDraft,
  type TaxDraft,
} from '@/features/auth/seller-signup/signup-state'
import type { StepProps } from '@/features/auth/seller-signup/steps/step-props'
import { countryOptionLabel } from '@/lib/country-options'
import { selectClassName, textareaClassName } from '@/lib/form-styles'

export function BusinessStep({ state, update, country, countries, disabled }: StepProps) {
  const suggestions = suggestionsFor(country)

  function setIdentifier(key: string, patch: Partial<IdentifierDraft>) {
    update({
      identifiers: state.identifiers.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    })
  }

  function setTax(key: string, patch: Partial<TaxDraft>) {
    update({ taxes: state.taxes.map((item) => (item.key === key ? { ...item, ...patch } : item)) })
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="signup-country"
          label="Where is your business registered?"
          required
          className="sm:col-span-2"
          hint="The country of the legal business. Your shop sells and prices in this country’s currency."
        >
          <select
            id="signup-country"
            value={state.countryId}
            onChange={(event) => update({ countryId: event.target.value })}
            className={selectClassName}
            disabled={disabled || countries.length === 0}
          >
            <option value="" disabled>
              {countries.length === 0 ? 'Loading countries…' : 'Choose country'}
            </option>
            {countries.map((item) => (
              <option key={item.id} value={item.id}>
                {countryOptionLabel(item)}
              </option>
            ))}
          </select>
        </Field>

        <Field id="signup-business-type" label="Business type" required>
          <select
            id="signup-business-type"
            value={state.sellerType}
            onChange={(event) => update({ sellerType: event.target.value })}
            className={selectClassName}
            disabled={disabled}
          >
            <option value="" disabled>
              Select business type
            </option>
            {sellerTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          id="signup-legal-name"
          label="Legal business name"
          required
          className="sm:col-span-2"
          hint="Exactly as registered. For a sole proprietor, the legal name your local registration uses."
        >
          <Input
            id="signup-legal-name"
            autoComplete="organization"
            maxLength={200}
            value={state.legalName}
            onChange={(event) => update({ legalName: event.target.value })}
            className={inputClassName}
            disabled={disabled}
          />
        </Field>

        <Field id="signup-local-name" label="Name in local script" optional>
          <Input
            id="signup-local-name"
            placeholder="If different from the legal name"
            maxLength={200}
            value={state.localName}
            onChange={(event) => update({ localName: event.target.value })}
            className={inputClassName}
            disabled={disabled}
          />
        </Field>

        <Field id="signup-trading-name" label="Trading / business name" optional>
          <Input
            id="signup-trading-name"
            placeholder="The name customers know"
            maxLength={200}
            value={state.tradingName}
            onChange={(event) => update({ tradingName: event.target.value })}
            className={inputClassName}
            disabled={disabled}
          />
        </Field>

        <Field id="signup-registration-status" label="Business registration status" required className="sm:col-span-2">
          <select
            id="signup-registration-status"
            value={state.registrationStatus}
            onChange={(event) =>
              update({ registrationStatus: event.target.value as typeof state.registrationStatus })
            }
            className={selectClassName}
            disabled={disabled}
          >
            <option value="" disabled>
              Choose status
            </option>
            {registrationStatuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {state.registrationStatus === 'registered' ? (
        <div className="space-y-4">
          <datalist id="signup-identifier-types">
            {suggestions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </datalist>
          {state.identifiers.map((item, index) => (
            <div key={item.key} className="grid gap-4 rounded-xl border border-border/60 p-4 sm:grid-cols-2">
              <Field
                id={`signup-id-type-${item.key}`}
                label="Identifier type"
                required
                hint={index === 0 && country ? `Suggestions for ${country.name}. You can type another.` : undefined}
              >
                <Input
                  id={`signup-id-type-${item.key}`}
                  list="signup-identifier-types"
                  placeholder={suggestions[0]?.value ?? 'Business registration number'}
                  maxLength={60}
                  value={item.type}
                  onChange={(event) => setIdentifier(item.key, { type: event.target.value })}
                  className={inputClassName}
                  disabled={disabled}
                />
              </Field>
              <Field id={`signup-id-value-${item.key}`} label="Business identifier" required>
                <Input
                  id={`signup-id-value-${item.key}`}
                  maxLength={120}
                  value={item.value}
                  onChange={(event) => setIdentifier(item.key, { value: event.target.value })}
                  className={inputClassName}
                  disabled={disabled}
                />
              </Field>
              <Field id={`signup-id-authority-${item.key}`} label="Issuing authority / register" optional>
                <Input
                  id={`signup-id-authority-${item.key}`}
                  placeholder="As shown on your certificate"
                  maxLength={200}
                  value={item.authority}
                  onChange={(event) => setIdentifier(item.key, { authority: event.target.value })}
                  className={inputClassName}
                  disabled={disabled}
                />
              </Field>
              <Field id={`signup-id-jurisdiction-${item.key}`} label="Registration state / region" optional>
                <Input
                  id={`signup-id-jurisdiction-${item.key}`}
                  placeholder="If your registration is regional"
                  maxLength={120}
                  value={item.jurisdiction}
                  onChange={(event) => setIdentifier(item.key, { jurisdiction: event.target.value })}
                  className={inputClassName}
                  disabled={disabled}
                />
              </Field>
              {state.identifiers.length > 1 ? (
                <div className="sm:col-span-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 rounded-full px-3 text-muted-foreground"
                    onClick={() =>
                      update({ identifiers: state.identifiers.filter((other) => other.key !== item.key) })
                    }
                    disabled={disabled}
                  >
                    <Trash2 className="size-4" />
                    Remove identifier
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
          {state.identifiers.length < 10 ? (
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-full px-3"
              onClick={() => update({ identifiers: [...state.identifiers, newIdentifier()] })}
              disabled={disabled}
            >
              <Plus className="size-3.5" />
              Add another business identifier
            </Button>
          ) : null}
        </div>
      ) : null}

      {state.registrationStatus === 'pending' || state.registrationStatus === 'no_number' ? (
        <div className="space-y-4">
          <Field id="signup-registration-note" label="Tell us about your registration status" required>
            <textarea
              id="signup-registration-note"
              placeholder="Explain what is pending, or why a number has not been issued."
              maxLength={1000}
              value={state.registrationNote}
              onChange={(event) => update({ registrationNote: event.target.value })}
              className={textareaClassName}
              disabled={disabled}
            />
          </Field>
          <Notice icon={<Info />} tone="amber">
            You can still register. Your eligibility will be reviewed before you can sell.
          </Notice>
        </div>
      ) : null}

      <Section
        title="Tax registration"
        intro="Tax registrations can belong to more than one country."
      >
        <Field id="signup-tax-status" label="Do you have business tax registration details?" required>
          <select
            id="signup-tax-status"
            value={state.taxStatus}
            onChange={(event) => {
              const taxStatus = event.target.value as typeof state.taxStatus
              update({
                taxStatus,
                taxes:
                  taxStatus === 'registered' && state.taxes.length === 0
                    ? [newTax(state.countryId)]
                    : state.taxes,
              })
            }}
            className={selectClassName}
            disabled={disabled}
          >
            <option value="" disabled>
              Choose tax status
            </option>
            {taxStatuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>

        {state.taxStatus === 'registered' ? (
          <div className="space-y-4">
            <datalist id="signup-tax-schemes">
              {taxSchemeSuggestions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            {state.taxes.map((tax) => (
              <div key={tax.key} className="grid gap-4 rounded-xl border border-border/60 p-4 sm:grid-cols-2">
                <Field id={`signup-tax-country-${tax.key}`} label="Tax country" required>
                  <select
                    id={`signup-tax-country-${tax.key}`}
                    value={tax.country_id}
                    onChange={(event) => setTax(tax.key, { country_id: event.target.value })}
                    className={selectClassName}
                    disabled={disabled}
                  >
                    <option value="" disabled>
                      Choose country
                    </option>
                    {countries.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id={`signup-tax-jurisdiction-${tax.key}`} label="State / region" optional>
                  <Input
                    id={`signup-tax-jurisdiction-${tax.key}`}
                    maxLength={120}
                    value={tax.jurisdiction}
                    onChange={(event) => setTax(tax.key, { jurisdiction: event.target.value })}
                    className={inputClassName}
                    disabled={disabled}
                  />
                </Field>
                <Field id={`signup-tax-scheme-${tax.key}`} label="Tax type" required>
                  <Input
                    id={`signup-tax-scheme-${tax.key}`}
                    list="signup-tax-schemes"
                    placeholder="GST, VAT…"
                    maxLength={80}
                    value={tax.scheme}
                    onChange={(event) => setTax(tax.key, { scheme: event.target.value })}
                    className={inputClassName}
                    disabled={disabled}
                  />
                </Field>
                <Field id={`signup-tax-number-${tax.key}`} label="Tax registration number" required>
                  <Input
                    id={`signup-tax-number-${tax.key}`}
                    maxLength={60}
                    value={tax.number}
                    onChange={(event) => setTax(tax.key, { number: event.target.value })}
                    className={inputClassName}
                    disabled={disabled}
                  />
                </Field>
                {state.taxes.length > 1 ? (
                  <div className="sm:col-span-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 rounded-full px-3 text-muted-foreground"
                      onClick={() => update({ taxes: state.taxes.filter((other) => other.key !== tax.key) })}
                      disabled={disabled}
                    >
                      <Trash2 className="size-4" />
                      Remove tax registration
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
            {state.taxes.length < 10 ? (
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-full px-3"
                onClick={() => update({ taxes: [...state.taxes, newTax()] })}
                disabled={disabled}
              >
                <Plus className="size-3.5" />
                Add a tax registration
              </Button>
            ) : null}
          </div>
        ) : null}

        <Notice icon={<Lock />}>
          Enter business registration details only. Personal tax IDs and identity documents
          belong in the secure verification process.
        </Notice>
      </Section>
    </div>
  )
}
