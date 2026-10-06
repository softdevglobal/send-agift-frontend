import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

import { Input } from '@/components/ui/input'
import { PasswordStrengthMeter } from '@/features/auth/password-strength'
import { PhoneField } from '@/features/auth/phone-field'
import { CheckRow, Field, inputClassName, Section } from '@/features/auth/seller-signup/fields'
import { contactRoles } from '@/features/auth/seller-signup/options'
import type { StepProps } from '@/features/auth/seller-signup/steps/step-props'
import { selectClassName } from '@/lib/form-styles'

export function ContactStep({ state, update, disabled }: StepProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="signup-contact-name" label="Full name" required className="sm:col-span-2">
          <Input
            id="signup-contact-name"
            autoComplete="name"
            placeholder="Name of the authorised representative"
            maxLength={150}
            value={state.contactName}
            onChange={(event) => update({ contactName: event.target.value })}
            className={inputClassName}
            disabled={disabled}
          />
        </Field>
        <Field id="signup-contact-role" label="Your role" required>
          <select
            id="signup-contact-role"
            value={state.contactRole}
            onChange={(event) => update({ contactRole: event.target.value as typeof state.contactRole })}
            className={selectClassName}
            disabled={disabled}
          >
            <option value="" disabled>
              Select role
            </option>
            {contactRoles.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="signup-contact-title" label="Job title" optional>
          <Input
            id="signup-contact-title"
            autoComplete="organization-title"
            placeholder="e.g. Operations manager"
            maxLength={100}
            value={state.contactJobTitle}
            onChange={(event) => update({ contactJobTitle: event.target.value })}
            className={inputClassName}
            disabled={disabled}
          />
        </Field>
        <Field
          id="signup-email"
          label="Business email"
          required
          className="sm:col-span-2"
          hint="Your private sign-in and account contact. A public support email is set on your shop."
        >
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            placeholder="you@yourbusiness.com"
            maxLength={254}
            value={state.email}
            onChange={(event) => update({ email: event.target.value })}
            className={inputClassName}
            disabled={disabled}
          />
        </Field>
        <Field
          id="signup-phone"
          label="Mobile / contact phone"
          required
          className="sm:col-span-2"
          hint="Include the international calling code. It can differ from your business country."
        >
          <PhoneField
            id="signup-phone"
            value={state.phone}
            onChange={(phone) => update({ phone })}
            disabled={disabled}
          />
        </Field>
      </div>

      <Section title="Sign-in password">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="signup-password" label="Create password" required>
            <div className="relative">
              <Input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={state.password}
                onChange={(event) => update({ password: event.target.value })}
                className={`${inputClassName} pr-11`}
                disabled={disabled}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute top-1/2 right-2.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <PasswordStrengthMeter password={state.password} />
          </Field>
          <Field id="signup-confirm-password" label="Confirm password" required>
            <Input
              id="signup-confirm-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={state.confirmPassword}
              onChange={(event) => update({ confirmPassword: event.target.value })}
              className={inputClassName}
              disabled={disabled}
            />
          </Field>
        </div>
      </Section>

      <Section title="Authority">
        <CheckRow
          id="signup-authority"
          checked={state.authorityConfirmed}
          onChange={(authorityConfirmed) => update({ authorityConfirmed })}
          label="I’m authorised to set up this seller account."
          hint="If you’re registering for someone else, your authority may need to be confirmed."
          disabled={disabled}
        />
      </Section>
    </div>
  )
}
