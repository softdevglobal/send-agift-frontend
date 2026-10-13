import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Calendar,
  Clock,
  Coins,
  Eye,
  ExternalLink,
  Globe2,
  LoaderCircle,
  Pencil,
  Plus,
  Shield,
  Trash2,
  X,
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

import { createCountry, deleteCountry, listCountryCapabilities, updateCountry } from '@/api/admin'
import { listCountries, type Country, type CountryInput } from '@/api/countries'
import {
  COUNTRY_CAPABILITY_FLAGS,
  DEFAULT_COUNTRY_CAPABILITY_INPUT,
  KNOWN_CURRENCIES,
  type CountryCapability,
  type CountryCapabilityInput,
} from '@/api/types'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { FormAlert } from '@/components/common/form-alert'
import { PageNav, usePagedList } from '@/components/common/page-nav'
import { TimezoneSelect } from '@/components/common/timezone-select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  AdminPageHeader,
  CapabilityFlagList,
  CountryCapabilitiesPanel,
  adminPanelClass,
  formatDate,
  flagsFromCapability,
  saveCountryCapabilities,
} from '@/features/admin'
import { WizardDialog, type WizardStep } from '@/features/seller/wizard-dialog'
import { ApiError, getErrorMessage } from '@/lib/api'
import { optionalString } from '@/lib/form'
import { selectClassName } from '@/lib/form-styles'
import { cn } from '@/lib/utils'

const emptyCountry: CountryInput = {
  iso_code: '',
  name: '',
  default_currency: '',
  default_timezone: '',
  status: 'active',
}

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const

function toInput(country: Country): CountryInput {
  return {
    iso_code: country.iso_code,
    name: country.name,
    default_currency: country.default_currency,
    default_timezone: country.default_timezone,
    status: country.status,
  }
}

/**
 * The IANA zones the browser knows for a country code, most relevant first.
 * Empty when the code is unknown or the browser has no region data.
 */
function timezonesForIso(iso: string): string[] {
  const code = iso.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return []
  try {
    const locale = new Intl.Locale(`und-${code}`) as Intl.Locale & {
      getTimeZones?: () => string[]
      timeZones?: string[]
    }
    return locale.getTimeZones?.() ?? locale.timeZones ?? []
  } catch {
    return []
  }
}

function flagEmoji(iso: string): string {
  const code = iso.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return '🌐'
  const points = [...code].map((char) => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...points)
}

/** Live facts for the preview: what money and the clock look like in this market. */
function marketSample(currency: string, timezone: string) {
  let price = ''
  let time = ''
  let offset = ''
  try {
    if (currency.trim()) {
      price = new Intl.NumberFormat('en', {
        style: 'currency',
        currency: currency.trim().toUpperCase(),
      }).format(25)
    }
  } catch {
    // unknown currency code: leave the sample blank
  }
  try {
    if (timezone.trim()) {
      const now = new Date()
      time = new Intl.DateTimeFormat('en', {
        timeZone: timezone.trim(),
        hour: 'numeric',
        minute: '2-digit',
        weekday: 'short',
      }).format(now)
      offset =
        new Intl.DateTimeFormat('en', { timeZone: timezone.trim(), timeZoneName: 'longOffset' })
          .formatToParts(now)
          .find((part) => part.type === 'timeZoneName')
          ?.value.replace('GMT', 'UTC') ?? ''
    }
  } catch {
    // unknown zone: leave the clock blank
  }
  return { price, time, offset }
}

/** The last step of the country wizard: a passport page for the new market. */
function CountryPassport({
  form,
  rules,
}: {
  form: CountryInput
  rules?: { on: number; total: number }
}) {
  const iso = form.iso_code.trim().toUpperCase()
  const name = form.name.trim()
  const currency = form.default_currency.trim().toUpperCase()
  const timezone = form.default_timezone.trim()
  const active = (form.status ?? 'active') === 'active'
  const { price, time, offset } = marketSample(currency, timezone)
  const city = timezone.split('/').pop()?.replace(/_/g, ' ') ?? ''

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl bg-brand-violet text-white shadow-lg">
        {/* The flag, huge and ghosted, behind everything. */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-4 -right-4 text-[9rem] leading-none opacity-20 select-none"
        >
          {flagEmoji(iso)}
        </span>

        <p className="relative px-6 pt-5 text-[10px] font-bold tracking-[0.2em] text-white/70 uppercase">
          Send A Gift · Market pass
        </p>

        <div className="relative flex items-center gap-4 px-6 pt-4 pb-5">
          <span className="text-6xl leading-none drop-shadow">{flagEmoji(iso)}</span>
          <div className="min-w-0">
            <p className="truncate font-poster text-3xl leading-tight">
              {name || 'Unnamed market'}
            </p>
            <p className="font-mono text-sm tracking-[0.3em] text-white/75">
              {iso || '--'}
              <span className="font-sans tracking-normal">
                {' · '}
                {active ? 'Open for gifts' : 'Closed'}
              </span>
            </p>
          </div>
        </div>

        {/* Tear line. */}
        <div aria-hidden className="relative mx-6 border-t-2 border-dashed border-white/30" />

        <div className="relative grid grid-cols-2 gap-px bg-white/10">
          <div className="bg-brand-ink/30 px-6 py-4">
            <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] text-white/60 uppercase">
              <Coins className="size-3.5" />
              Currency
            </p>
            <p className="mt-1 font-poster text-2xl">{currency || '-'}</p>
            <p className="text-xs text-white/70">
              {price ? `Prices read like ${price}` : 'Pick a currency'}
            </p>
          </div>
          <div className="bg-brand-ink/30 px-6 py-4">
            <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] text-white/60 uppercase">
              <Clock className="size-3.5" />
              Local time
            </p>
            <p className="mt-1 font-poster text-2xl">{time || '-'}</p>
            <p className="truncate text-xs text-white/70">
              {timezone ? `${city} · ${offset}` : 'Pick a timezone'}
            </p>
          </div>
        </div>
      </div>

      {rules ? (
        <p className="flex items-center justify-center gap-2 rounded-lg bg-accent/60 px-3 py-2 text-xs font-bold text-brand-ink dark:text-foreground">
          <Shield className="size-3.5" />
          {rules.on} of {rules.total} rules switched on
        </p>
      ) : null}

      <p className="text-center text-xs text-muted-foreground">
        This is how {name || 'this market'} will appear across registration forms and the
        countries list.
      </p>
    </div>
  )
}

export function AdminCountriesPage() {
  const [countries, setCountries] = useState<Country[]>([])
  const [countryToDelete, setCountryToDelete] = useState<Country | null>(null)
  const [deleting, setDeleting] = useState(false)
  const countryPages = usePagedList(countries, 9)
  const [capabilities, setCapabilities] = useState<Record<string, CountryCapability>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [form, setForm] = useState<CountryInput>(emptyCountry)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [ruleFlags, setRuleFlags] = useState<CountryCapabilityInput>({
    ...DEFAULT_COUNTRY_CAPABILITY_INPUT,
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewCountry, setViewCountry] = useState<Country | null>(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  const load = useCallback(async () => {
    const list = await listCountries()
    setCountries(Array.isArray(list) ? list : [])
    try {
      const entries = await listCountryCapabilities()
      const map: Record<string, CountryCapability> = {}
      for (const entry of Array.isArray(entries) ? entries : []) {
        const countryId = entry.capability?.country_id || entry.country?.id
        if (countryId && entry.capability) map[countryId] = entry.capability
      }
      setCapabilities(map)
    } catch {
      setCapabilities({})
    }
  }, [])

  // /admin/countries?edit=<id> (from a country's own page) opens the edit wizard.
  const editParam = searchParams.get('edit')
  useEffect(() => {
    if (!editParam || loading) return
    const match = countries.find((country) => country.id === editParam)
    const next = new URLSearchParams(searchParams)
    next.delete('edit')
    setSearchParams(next, { replace: true })
    if (match) openEdit(match)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editParam, loading, countries])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    load()
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load countries.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [load])

  /** The last zone filled in from the ISO code, so a hand-picked zone is never overwritten. */
  const autoZone = useRef('')

  function updateField<K extends keyof CountryInput>(key: K, value: CountryInput[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function handleIsoChange(value: string) {
    const zone = timezonesForIso(value)[0] ?? ''
    setForm((current) => {
      const untouched =
        !current.default_timezone || current.default_timezone === autoZone.current
      if (!zone || !untouched) return { ...current, iso_code: value }
      autoZone.current = zone
      return { ...current, iso_code: value, default_timezone: zone }
    })
  }

  function autofillTimezone() {
    const zone = timezonesForIso(form.iso_code)[0]
    if (!zone) {
      setFormError('No time zone found for that ISO code. Pick one from the list.')
      return
    }
    setFormError(null)
    autoZone.current = zone
    updateField('default_timezone', zone)
  }

  function openCreate() {
    setEditingId(null)
    autoZone.current = ''
    setForm(emptyCountry)
    setRuleFlags({ ...DEFAULT_COUNTRY_CAPABILITY_INPUT })
    setFormError(null)
    setNotice(null)
    setDialogOpen(true)
  }

  function openEdit(country: Country) {
    setViewOpen(false)
    setEditingId(country.id)
    autoZone.current = ''
    setForm(toInput(country))
    const existing = capabilities[country.id]
    setRuleFlags(
      existing ? flagsFromCapability(existing) : { ...DEFAULT_COUNTRY_CAPABILITY_INPUT },
    )
    setFormError(null)
    setNotice(null)
    setDialogOpen(true)
  }

  function openView(country: Country) {
    setViewCountry(country)
    setViewOpen(true)
  }

  function handleDialogChange(open: boolean) {
    setDialogOpen(open)
    if (!open) {
      setEditingId(null)
      setForm(emptyCountry)
      setFormError(null)
      }
  }

  function buildBody(): CountryInput | null {
    const iso = form.iso_code.trim().toUpperCase()
    if (iso.length !== 2) {
      setFormError('ISO code must be 2 letters.')
      return null
    }
    if (!form.name.trim() || !form.default_currency.trim() || !form.default_timezone.trim()) {
      setFormError('Fill in every field before continuing.')
      return null
    }
    return {
      iso_code: iso,
      name: form.name.trim(),
      default_currency: form.default_currency.trim().toUpperCase(),
      default_timezone: form.default_timezone.trim(),
      status: optionalString(form.status ?? ''),
    }
  }

  async function submitCountry() {
    setFormError(null)
    const body = buildBody()
    if (!body) return
    setSaving(true)
    let countryId = editingId
    try {
      if (editingId) {
        await updateCountry(editingId, body)
      } else {
        const created = await createCountry(body)
        countryId = created.id
      }
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not save country.'))
      setSaving(false)
      return
    }

    // The country exists now. A failure on its rules must not strand the admin
    // inside a wizard that would try to create it a second time.
    try {
      if (countryId) {
        const saved = await saveCountryCapabilities(
          countryId,
          { ...ruleFlags },
          Boolean(capabilities[countryId]),
        )
        setCapabilities((current) => ({ ...current, [countryId]: saved }))
      }
      setNotice(editingId ? 'Country updated.' : 'Country created.')
    } catch (err) {
      setNotice(null)
      setError(
        `${editingId ? 'Country updated' : 'Country created'}, but its rules could not be saved: ${getErrorMessage(err, 'try again from the country page.')}`,
      )
    }
    try {
      await load()
    } catch {
      // The list refreshes on the next visit.
    }
    setSaving(false)
    handleDialogChange(false)
  }

  async function handleDelete(id: string) {
    setError(null)
    setNotice(null)
    setDeleting(true)
    try {
      await deleteCountry(id)
      if (viewCountry?.id === id) setViewOpen(false)
      await load()
      setNotice('Country deleted.')
    } catch (err) {
      const message = getErrorMessage(err, 'Could not delete country.')
      setError(
        err instanceof ApiError && err.status === 500
          ? 'This country cannot be deleted while customers, sellers, or other records still use it.'
          : message,
      )
    } finally {
      setDeleting(false)
      setCountryToDelete(null)
    }
  }

  const isoReady = form.iso_code.trim().length === 2
  const identityBlocked = !isoReady
    ? 'Enter the 2-letter ISO code to continue.'
    : !form.name.trim()
      ? 'Give the country a name to continue.'
      : null
  const marketBlocked =
    !form.default_currency.trim()
      ? 'Choose the default currency to continue.'
      : !form.default_timezone.trim()
        ? 'Choose the default timezone to continue.'
        : null

  const wizardSteps: WizardStep[] = [
    {
      id: 'country',
      title: 'Country',
      description: 'Its ISO code, its name, and whether it is open.',
      icon: Globe2,
      blockedReason: identityBlocked,
      content: (
        <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="iso-code">ISO code</Label>
              <Input
                id="iso-code"
                value={form.iso_code}
                onChange={(event) => handleIsoChange(event.target.value)}
                className="h-11 bg-surface px-3 uppercase"
                maxLength={2}
                required
                placeholder="LK"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country-name">Name</Label>
              <Input
                id="country-name"
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                className="h-11 bg-surface px-3"
                required
                placeholder="Sri Lanka"
              />
            </div>
          <div className="sm:col-span-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <div
                role="group"
                aria-label="Status"
                className="relative inline-flex rounded-lg bg-accent p-1"
              >
                <div
                  aria-hidden
                  className="absolute inset-y-1 left-1 w-[5.25rem] rounded-md bg-brand-ink transition-transform duration-300 ease-out"
                  style={{
                    transform: `translateX(${Math.max(0, statusOptions.findIndex((option) => option.value === form.status)) * 5.25}rem)`,
                  }}
                />
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateField('status', option.value)}
                    className={cn(
                      'relative z-10 w-[5.25rem] rounded-md py-1.5 text-xs font-bold tracking-[0.08em] uppercase transition-colors duration-200 active:scale-95',
                      form.status === option.value
                        ? 'text-white'
                        : 'text-brand-ink/60 hover:text-brand-ink',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'market',
      title: 'Currency & time',
      description: 'What prices are shown in, and which clock same-day cutoffs use.',
      icon: Coins,
      blockedReason: marketBlocked,
      content: (
        <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="currency">Default currency</Label>
              <select
                id="currency"
                value={form.default_currency}
                onChange={(event) =>
                  updateField('default_currency', event.target.value)
                }
                className={selectClassName}
                required
              >
                <option value="" disabled>
                  Select currency
                </option>
                {KNOWN_CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
                {form.default_currency &&
                !KNOWN_CURRENCIES.includes(
                  form.default_currency as (typeof KNOWN_CURRENCIES)[number],
                ) ? (
                  <option value={form.default_currency}>
                    {form.default_currency}
                  </option>
                ) : null}
              </select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="timezone">Default timezone</Label>
                <button
                  type="button"
                  onClick={autofillTimezone}
                  disabled={form.iso_code.trim().length !== 2}
                  className="text-xs font-medium text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                >
                  Auto-fill from ISO code
                </button>
              </div>
              <TimezoneSelect
                id="timezone"
                value={form.default_timezone}
                onChange={(zone) => {
                  autoZone.current = ''
                  updateField('default_timezone', zone)
                }}
              />
            </div>
        </div>
      ),
    },
    {
      id: 'rules',
      title: 'Rules',
      description: 'Tick what this market allows. You can change these any time.',
      icon: Shield,
      content: (
        <div className="space-y-3">
          <CapabilityFlagList
            flags={ruleFlags}
            idPrefix="wizard-cap"
            onToggle={(flag, enabled) =>
              setRuleFlags((current) => ({ ...current, [flag]: enabled }))
            }
          />
        </div>
      ),
    },
    {
      id: 'preview',
      title: 'Preview',
      description: 'This is the market pass customers and sellers will see.',
      icon: Eye,
      content: (
        <CountryPassport
          form={form}
          rules={{
            on: COUNTRY_CAPABILITY_FLAGS.filter((flag) => ruleFlags[flag]).length,
            total: COUNTRY_CAPABILITY_FLAGS.length,
          }}
        />
      ),
    },
  ]

  return (
    <>
      <AdminPageHeader
        title="Countries"
        description="Create markets customers and sellers can register into, then toggle what each country allows."
        action={
          <Button type="button" className="h-11 px-5" onClick={openCreate}>
            <Plus className="size-4" />
            Add country
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          <FormAlert error={error} notice={notice} />

          {countries.length ? (
            <>
            {/* Four numbers first: how many markets, and who can sign up. */}
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { label: 'Countries', value: countries.length, tone: 'bg-brand-ink text-white' },
                {
                  label: 'Active',
                  value: countries.filter((c) => c.status?.toLowerCase() === 'active').length,
                  tone: 'bg-brand-violet text-white',
                },
                {
                  label: 'Customer sign-up on',
                  value: countries.filter((c) => capabilities[c.id]?.customer_registration_enabled).length,
                  tone: 'bg-brand-teal text-brand-ink',
                },
                {
                  label: 'Seller sign-up on',
                  value: countries.filter((c) => capabilities[c.id]?.seller_registration_enabled).length,
                  tone: 'bg-amber-300 text-amber-950',
                },
              ].map((item) => (
                <div key={item.label} className={cn('rounded-xl p-4', item.tone)}>
                  <p className="font-poster text-4xl">{item.value}</p>
                  <p className="mt-1 text-[11px] font-bold tracking-[0.12em] uppercase opacity-80">
                    {item.label}
                  </p>
                </div>
              ))}
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {countryPages.visible.map((country) => {
                const active = country.status?.toLowerCase() === 'active'
                const gates = capabilities[country.id]
                const rulesOn = gates
                  ? COUNTRY_CAPABILITY_FLAGS.filter((flag) => gates[flag]).length
                  : 0
                const sample = marketSample(country.default_currency, country.default_timezone)
                return (
                  <article
                    key={country.id}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-brand-ink/10 bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-ink hover:shadow-lg"
                  >
                    {/* The pass: ghosted flag, big code, a tilted status stamp. */}
                    <button
                      type="button"
                      onClick={() => openView(country)}
                      aria-label={`View ${country.name}`}
                      className={cn(
                        'relative overflow-hidden px-5 pt-4 pb-6 text-left text-white',
                        active ? 'bg-brand-violet' : 'bg-brand-ink',
                      )}
                    >
                      <span
                        aria-hidden
                        className="pointer-events-none absolute -top-3 -right-3 rotate-12 text-[7rem] leading-none opacity-20 transition-transform duration-500 select-none group-hover:rotate-6 group-hover:scale-110"
                      >
                        {flagEmoji(country.iso_code)}
                      </span>
                      <span className="relative block text-[10px] font-bold tracking-[0.2em] text-white/70 uppercase">
                        Market pass
                      </span>
                      <span className="relative mt-3 flex items-center gap-3">
                        <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-white text-4xl shadow-sm">
                          {flagEmoji(country.iso_code)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-poster text-2xl leading-tight">
                            {country.name}
                          </span>
                          <span className="block font-mono text-xs tracking-[0.3em] text-white/75">
                            {country.iso_code}
                            <span className="font-sans tracking-normal">
                              {' · '}
                              {active ? 'Open' : country.status || 'Closed'}
                            </span>
                          </span>
                        </span>
                      </span>
                    </button>

                    {/* Tear line. */}
                    <div
                      aria-hidden
                      className="mx-4 border-t-2 border-dashed border-brand-ink/15"
                    />

                    <div className="flex flex-1 flex-col gap-4 p-4 pt-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="flex items-center gap-1 text-[10px] font-bold tracking-[0.14em] text-brand-ink/55 uppercase dark:text-muted-foreground">
                            <Coins className="size-3" />
                            Currency
                          </p>
                          <p className="mt-0.5 font-poster text-xl text-brand-ink dark:text-foreground">
                            {country.default_currency}
                          </p>
                          {sample.price ? (
                            <p className="text-[11px] text-muted-foreground">{sample.price}</p>
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1 text-[10px] font-bold tracking-[0.14em] text-brand-ink/55 uppercase dark:text-muted-foreground">
                            <Clock className="size-3" />
                            Local time
                          </p>
                          <p className="mt-0.5 truncate font-poster text-xl text-brand-ink dark:text-foreground">
                            {sample.time ? sample.time.split(', ').pop() : '-'}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {sample.offset ? `${sample.offset} · ` : ''}
                            {country.default_timezone.split('/').pop()?.replace(/_/g, ' ')}
                          </p>
                        </div>
                      </div>

                      {gates ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[10px] font-bold tracking-[0.14em] text-brand-ink/55 uppercase dark:text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Shield className="size-3" />
                              Rules on
                            </span>
                            <span>
                              {rulesOn} / {COUNTRY_CAPABILITY_FLAGS.length}
                            </span>
                          </div>
                          <div className="flex gap-0.5" aria-hidden>
                            {COUNTRY_CAPABILITY_FLAGS.map((flag) => (
                              <span
                                key={flag}
                                className={cn(
                                  'h-2 flex-1 rounded-sm',
                                  gates[flag] ? 'bg-brand-teal' : 'bg-brand-ink/10',
                                )}
                              />
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { label: 'Customers', on: gates.customer_registration_enabled },
                              { label: 'Sellers', on: gates.seller_registration_enabled },
                            ].map((gate) => (
                              <span
                                key={gate.label}
                                className={cn(
                                  'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-bold',
                                  gate.on
                                    ? 'bg-brand-teal/20 text-brand-ink dark:text-foreground'
                                    : 'bg-muted text-muted-foreground',
                                )}
                              >
                                <span
                                  className={cn(
                                    'size-2 rounded-sm',
                                    gate.on ? 'bg-brand-teal' : 'bg-muted-foreground/40',
                                  )}
                                />
                                {gate.label} {gate.on ? 'on' : 'off'}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="rounded-md bg-amber-50 px-2.5 py-2 text-[11px] font-bold text-amber-900">
                          Rules not set yet. Open the pass to set them.
                        </p>
                      )}

                      <div className="mt-auto flex gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => openView(country)}
                          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border-2 border-brand-ink/15 text-[11px] font-bold tracking-[0.08em] text-brand-ink uppercase transition-colors hover:border-brand-ink hover:bg-brand-ink hover:text-white dark:text-foreground"
                        >
                          <Eye className="size-4" />
                          View
                        </button>
                        <button
                          type="button"
                          aria-label={`Edit ${country.name}`}
                          onClick={() => openEdit(country)}
                          className="flex size-9 items-center justify-center rounded-md border-2 border-brand-ink/15 text-brand-ink transition-colors hover:border-brand-ink hover:bg-brand-ink hover:text-white dark:text-foreground"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${country.name}`}
                          onClick={() => setCountryToDelete(country)}
                          className="flex size-9 items-center justify-center rounded-md border-2 border-destructive/35 text-destructive transition-colors hover:border-destructive hover:bg-destructive hover:text-white"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </section>
            <PageNav
              page={countryPages.page}
              pageCount={countryPages.pageCount}
              onPage={countryPages.setPage}
              label="Country pages"
            />
            </>
          ) : (
            <section
              className={cn(
                adminPanelClass,
                'flex flex-col items-center px-6 py-16 text-center',
              )}
            >
              <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Globe2 className="size-5" />
              </div>
              <p className="text-sm font-medium">No countries yet</p>
              <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Registration forms load this list, so add at least one market
                before customers or sellers sign up.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-5 h-9 rounded-full"
                onClick={openCreate}
              >
                <Plus className="size-4" />
                Add country
              </Button>
            </section>
          )}
        </div>
      )}

      <WizardDialog
        open={dialogOpen}
        onOpenChange={handleDialogChange}
        title={editingId ? 'Edit country' : 'Add country'}
        description={
          editingId
            ? 'Update this market. Changes apply to registration forms immediately.'
            : 'Set up a market customers and sellers can register into, step by step.'
        }
        steps={wizardSteps}
        onComplete={submitCountry}
        completeLabel={editingId ? 'Update country' : 'Create country'}
        completing={saving}
        error={formError ? <FormAlert error={formError} /> : null}
      />
      <Sheet open={viewOpen} onOpenChange={setViewOpen}>
        <SheetContent
          showCloseButton={false}
          className="w-[calc(100%-2.5rem)] gap-0 p-0 sm:max-w-md"
        >
          {viewCountry ? (
            <>
              <div className="relative overflow-hidden bg-brand-violet px-6 pt-10 pb-7 text-white">
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-4 -right-4 rotate-12 text-[8rem] leading-none opacity-20 select-none"
                >
                  {flagEmoji(viewCountry.iso_code)}
                </span>
                <SheetClose asChild>
                  <button
                    type="button"
                    aria-label="Close"
                    className="absolute top-4 right-4 z-10 grid size-9 place-items-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white hover:text-brand-ink focus-visible:ring-3 focus-visible:ring-white/60 focus-visible:outline-none"
                  >
                    <X className="size-4" />
                  </button>
                </SheetClose>
                <SheetHeader className="relative p-0 pr-10">
                  <div className="flex items-center gap-4">
                    <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-white text-4xl shadow-sm">
                      {flagEmoji(viewCountry.iso_code)}
                    </span>
                    <div className="min-w-0">
                      <SheetTitle className="truncate font-poster text-2xl text-white">
                        {viewCountry.name}
                      </SheetTitle>
                      <SheetDescription className="font-mono text-xs tracking-[0.3em] text-white/75">
                        {viewCountry.iso_code} · {viewCountry.status || 'unknown'}
                      </SheetDescription>
                    </div>
                  </div>
                </SheetHeader>
              </div>

              <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
                <dl className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Coins, label: 'Currency', value: viewCountry.default_currency },
                    { icon: Clock, label: 'Timezone', value: viewCountry.default_timezone },
                    { icon: Calendar, label: 'Created', value: formatDate(viewCountry.created_at) },
                    { icon: Calendar, label: 'Updated', value: formatDate(viewCountry.updated_at) },
                  ].map((item) => (
                    <div key={item.label} className={cn(adminPanelClass, 'p-3.5')}>
                      <dt className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                        <item.icon className="size-3.5" />
                        {item.label}
                      </dt>
                      <dd className="mt-1 truncate text-sm font-semibold">{item.value}</dd>
                    </div>
                  ))}
                </dl>

                <CountryCapabilitiesPanel
                  key={viewCountry.id}
                  countryId={viewCountry.id}
                  existing={capabilities[viewCountry.id] ?? null}
                  onChanged={(capability) => {
                    setCapabilities((current) => ({
                      ...current,
                      [viewCountry.id]: capability,
                    }))
                  }}
                />
              </div>

              <SheetFooter className="flex-col gap-2 border-t border-border/60 bg-muted/40 px-6 py-4">
                <Button asChild variant="outline" className="h-10 w-full">
                  <Link to={`/admin/countries/${viewCountry.id}`}>
                    <ExternalLink className="size-4" />
                    Open full page
                  </Link>
                </Button>
                <div className="flex gap-2">
                  <SheetClose asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 flex-1"
                      onClick={() => openEdit(viewCountry)}
                    >
                      <Pencil className="size-4" />
                      Edit
                    </Button>
                  </SheetClose>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setCountryToDelete(viewCountry)}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                </div>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
      <ConfirmDialog
        open={countryToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setCountryToDelete(null)
        }}
        title={`Delete ${countryToDelete?.name ?? 'this country'}?`}
        description="It disappears from the registration forms straight away. A country still used by customers, sellers or orders cannot be deleted."
        confirmLabel="Delete country"
        busy={deleting}
        onConfirm={() => {
          if (countryToDelete) void handleDelete(countryToDelete.id)
        }}
      />
    </>
  )
}
