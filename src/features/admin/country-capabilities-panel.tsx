import { useState } from 'react'
import { LoaderCircle, Shield } from 'lucide-react'

import { createCountryCapabilities, updateCountryCapabilities } from '@/api/admin'
import {
  COUNTRY_CAPABILITY_FLAGS,
  DEFAULT_COUNTRY_CAPABILITY_INPUT,
  type CountryCapability,
  type CountryCapabilityFlag,
  type CountryCapabilityInput,
} from '@/api/types'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { adminPanelClass } from '@/features/admin/admin-styles'
import { ApiError, getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

const FLAG_COPY: Record<CountryCapabilityFlag, { label: string; hint: string }> = {
  customer_registration_enabled: {
    label: 'Customer registration',
    hint: 'Allow new customers to sign up in this market.',
  },
  seller_registration_enabled: {
    label: 'Seller registration',
    hint: 'Allow new sellers to sign up in this market.',
  },
  seller_payouts_enabled: {
    label: 'Seller payouts',
    hint: 'Sellers in this market can receive payouts.',
  },
  domestic_delivery_enabled: {
    label: 'Domestic delivery',
    hint: 'Gifts can be delivered inside this country.',
  },
  international_delivery_enabled: {
    label: 'International delivery',
    hint: 'Gifts can be sent into or out of this country.',
  },
  memberships_enabled: {
    label: 'Memberships',
    hint: 'Membership plans are available in this market.',
  },
  points_earning_enabled: {
    label: 'Points earning',
    hint: 'Customers can earn loyalty points.',
  },
  points_usage_enabled: {
    label: 'Points usage',
    hint: 'Customers can spend loyalty points.',
  },
  skill_competitions_enabled: {
    label: 'Skill competitions',
    hint: 'Skill-based competitions are available.',
  },
  app_store_available: {
    label: 'App store',
    hint: 'The consumer app is listed for this market.',
  },
}

function flagsFromCapability(capability: CountryCapability): CountryCapabilityInput {
  const flags = { ...DEFAULT_COUNTRY_CAPABILITY_INPUT }
  for (const key of COUNTRY_CAPABILITY_FLAGS) {
    flags[key] = Boolean(capability[key])
  }
  return flags
}

type CountryCapabilitiesPanelProps = {
  countryId: string
  /** From GET /admin/country-capabilities — skip GET-one when this is missing. */
  existing?: CountryCapability | null
  onChanged?: (capability: CountryCapability) => void
}

export function CountryCapabilitiesPanel({
  countryId,
  existing = null,
  onChanged,
}: CountryCapabilitiesPanelProps) {
  const [flags, setFlags] = useState<CountryCapabilityInput>(() =>
    existing ? flagsFromCapability(existing) : { ...DEFAULT_COUNTRY_CAPABILITY_INPUT },
  )
  const [capability, setCapability] = useState<CountryCapability | null>(existing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const savedFlags = capability
    ? flagsFromCapability(capability)
    : DEFAULT_COUNTRY_CAPABILITY_INPUT
  const isDirty = COUNTRY_CAPABILITY_FLAGS.some((flag) => flags[flag] !== savedFlags[flag])

  function toggle(flag: CountryCapabilityFlag, enabled: boolean) {
    setFlags((current) => ({ ...current, [flag]: enabled }))
    setNotice(null)
  }

  async function handleSave() {
    setError(null)
    setNotice(null)
    setSaving(true)
    try {
      const body: CountryCapabilityInput = { ...flags }
      let saved: CountryCapability
      if (capability) {
        try {
          saved = await updateCountryCapabilities(countryId, body)
        } catch (err) {
          if (!(err instanceof ApiError && err.status === 404)) throw err
          saved = await createCountryCapabilities(countryId, body)
        }
      } else {
        saved = await createCountryCapabilities(countryId, body)
      }
      setCapability(saved)
      setFlags(flagsFromCapability(saved))
      setNotice('Changes saved.')
      onChanged?.(saved)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save capabilities.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            <Shield className="size-3.5" />
            Feature gates
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Toggle what this market allows, then save changes.
          </p>
        </div>
        <span
          className={cn(
            adminPanelClass,
            'shrink-0 px-3 py-1.5 text-xs font-medium text-muted-foreground',
          )}
        >
          Rule v{capability?.rule_version ?? '—'}
        </span>
      </div>

      <FormAlert error={error} notice={notice} />

      <ul className="space-y-2">
        {COUNTRY_CAPABILITY_FLAGS.map((flag) => {
          const copy = FLAG_COPY[flag]
          return (
            <li
              key={flag}
              className="flex items-start justify-between gap-3 rounded-xl border border-border/40 bg-surface/90 px-3.5 py-3"
            >
              <div className="min-w-0">
                <Label htmlFor={`cap-${flag}`} className="text-sm font-medium">
                  {copy.label}
                </Label>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{copy.hint}</p>
              </div>
              <Checkbox
                id={`cap-${flag}`}
                checked={flags[flag]}
                onCheckedChange={(value) => toggle(flag, value === true)}
                className="mt-0.5"
              />
            </li>
          )
        })}
      </ul>

      <Button
        type="button"
        className="h-10"
        disabled={saving || !isDirty}
        onClick={() => void handleSave()}
      >
        {saving ? (
          <>
            <LoaderCircle className="animate-spin" />
            Saving…
          </>
        ) : (
          'Save changes'
        )}
      </Button>
    </section>
  )
}
