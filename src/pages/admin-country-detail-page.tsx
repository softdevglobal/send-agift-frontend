import { useCallback, useEffect, useState } from 'react'
import { Check, Globe2, Pencil, X } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { listCountryCapabilities } from '@/api/admin'
import { listCountries, type Country } from '@/api/countries'
import { COUNTRY_CAPABILITY_FLAGS, type CountryCapability } from '@/api/types'
import { BackLink } from '@/components/common/back-link'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { AdminPageHeader, CountryCapabilitiesPanel, formatDate } from '@/features/admin'
import { FLAG_COPY } from '@/features/admin/country-capabilities-panel'
import { AdminFacts, AdminRecordSection } from '@/features/admin/admin-record'
import { Loading } from '@/features/admin/games-ui'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

function flagEmoji(iso: string): string {
  const code = iso.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return '🌐'
  return String.fromCodePoint(...[...code].map((char) => 127397 + char.charCodeAt(0)))
}

/** One market on its own page: its facts, and every rule it switches on or off. */
export function AdminCountryDetailPage() {
  const { countryId = '' } = useParams()
  const [country, setCountry] = useState<Country | null>(null)
  const [capability, setCapability] = useState<CountryCapability | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [countries, entries] = await Promise.all([
        listCountries(),
        listCountryCapabilities().catch(() => []),
      ])
      const found = (Array.isArray(countries) ? countries : []).find((c) => c.id === countryId)
      setCountry(found ?? null)
      const entry = (Array.isArray(entries) ? entries : []).find(
        (item) => item.country?.id === countryId,
      )
      setCapability(entry?.capability ?? null)
      if (!found) setError('That country no longer exists.')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load this country.'))
    } finally {
      setLoading(false)
    }
  }, [countryId])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <Loading />

  const enabledCount = capability
    ? COUNTRY_CAPABILITY_FLAGS.filter((flag) => capability[flag]).length
    : 0

  return (
    <>
      <BackLink to="/admin/countries" label="All countries" className="mb-4" />

      {country ? (
        <>
          <AdminPageHeader
            eyebrow={`${country.iso_code} · ${country.status || 'unknown'}`}
            title={`${flagEmoji(country.iso_code)} ${country.name}`}
            description="Market details and the rules this country runs on."
            action={
              <Button asChild className="h-10 rounded-full px-4">
                <Link to={`/admin/countries?edit=${country.id}`}>
                  <Pencil className="size-4" />
                  Edit country
                </Link>
              </Button>
            }
          />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)] lg:items-start">
            <div className="space-y-6">
              <AdminRecordSection title="Market">
                <AdminFacts
                  items={[
                    { label: 'ISO code', value: country.iso_code },
                    { label: 'Status', value: country.status },
                    { label: 'Currency', value: country.default_currency },
                    { label: 'Timezone', value: country.default_timezone },
                    { label: 'Created', value: formatDate(country.created_at) },
                    { label: 'Updated', value: formatDate(country.updated_at) },
                  ]}
                />
              </AdminRecordSection>

              <AdminRecordSection
                title="At a glance"
                count={capability ? enabledCount : undefined}
              >
                {capability ? (
                  <ul className="flex flex-wrap gap-2">
                    {COUNTRY_CAPABILITY_FLAGS.map((flag) => {
                      const on = Boolean(capability[flag])
                      return (
                        <li
                          key={flag}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold',
                            on
                              ? 'bg-brand-teal/20 text-brand-ink dark:text-foreground'
                              : 'bg-muted text-muted-foreground line-through',
                          )}
                        >
                          {on ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                          {FLAG_COPY[flag].label}
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No rules are set for this market yet. Use the panel on the right.
                  </p>
                )}
              </AdminRecordSection>
            </div>

            {/* The rules live in a side panel, so they are always one glance
                from the facts they govern. */}
            <aside className="rounded-xl border-2 border-brand-ink/10 bg-card p-5 lg:sticky lg:top-4 lg:max-h-[calc(100svh-8rem)] lg:overflow-y-auto">
              <CountryCapabilitiesPanel
                key={country.id}
                countryId={country.id}
                existing={capability}
                onChanged={setCapability}
              />
            </aside>
          </div>
        </>
      ) : (
        <div className="rounded-xl border-2 border-brand-ink/10 bg-card px-6 py-16 text-center">
          <Globe2 className="mx-auto mb-3 size-8 text-muted-foreground" />
          <FormAlert error={error} />
        </div>
      )}
    </>
  )
}
